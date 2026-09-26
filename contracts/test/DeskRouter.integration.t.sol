// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Aqua} from "@1inch/aqua/src/Aqua.sol";
import {IAqua} from "@1inch/aqua/src/interfaces/IAqua.sol";
import {ISwapVM} from "@1inch/swap-vm/interfaces/ISwapVM.sol";
import {MakerTraitsLib} from "@1inch/swap-vm/libs/MakerTraits.sol";
import {TakerTraitsLib} from "@1inch/swap-vm/libs/TakerTraits.sol";

import {DeskRouter} from "../src/DeskRouter.sol";
import {DeskArgs} from "../src/libs/DeskArgs.sol";
import {EnsGate, EnsGateArgs} from "../src/instructions/EnsGate.sol";
import {MockOracle} from "../src/mocks/MockOracle.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockWETH} from "../src/mocks/MockWETH.sol";
import {MockEnsRegistry} from "./mocks/MockEnsRegistry.sol";
import {MockEnsResolver} from "./mocks/MockEnsResolver.sol";
import {ContractMM} from "./mocks/ContractMM.sol";

contract DeskRouterIntegrationTest is Test {
    uint64 internal constant EXP = type(uint64).max;
    bytes internal constant SUFFIX = hex"07636c69656e7473046465736b0365746800";

    Aqua aqua;
    DeskRouter router;
    MockWETH weth;
    MockUSDC usdc;
    MockOracle oracle;
    MockEnsRegistry ethReg;
    MockEnsRegistry deskReg;
    MockEnsRegistry clientsReg;
    MockEnsResolver resolver;
    ContractMM mmD;

    address maker;
    address mmA;
    address mmB;
    address stranger;

    function setUp() public {
        maker = makeAddr("maker");
        mmA = makeAddr("mmA");
        mmB = makeAddr("mmB");
        stranger = makeAddr("stranger");
        aqua = new Aqua();
        weth = new MockWETH();
        usdc = new MockUSDC();
        oracle = new MockOracle(8, 4000e8);
        ethReg = new MockEnsRegistry();
        deskReg = new MockEnsRegistry();
        clientsReg = new MockEnsRegistry();
        resolver = new MockEnsResolver();
        router = new DeskRouter(address(aqua), address(weth), maker, "DeskRouter", "1.0.2-desk.1");
        mmD = new ContractMM();

        ethReg.set("desk", address(deskReg), address(0), EXP);
        deskReg.set("clients", address(clientsReg), address(0), EXP);
        clientsReg.set("mm-a", address(0), address(resolver), EXP);
        clientsReg.set("mm-b", address(0), address(resolver), EXP);
        clientsReg.set("mm-c", address(0), address(resolver), uint64(block.timestamp));
        clientsReg.set("mm-x", address(0), address(resolver), EXP);
        clientsReg.set("mm-d", address(0), address(resolver), EXP);

        bytes memory a = _name("mm-a");
        bytes memory b = _name("mm-b");
        bytes memory d = _name("mm-d");
        resolver.setAddr(a, mmA);
        resolver.setAddr(b, mmB);
        resolver.setAddr(d, address(mmD));
        resolver.setData(a, "desk.terms", abi.encode(uint8(1), uint16(10), uint128(100_000e6)));
        resolver.setData(b, "desk.terms", abi.encode(uint8(1), uint16(25), uint128(50_000e6)));
        resolver.setData(d, "desk.terms", abi.encode(uint8(1), uint16(10), uint128(100_000e6)));
    }

    function test_TI1_shipAndFillBothWays() public {
        ISwapVM.Order memory order = _ship(1, 700e18, 1_200_000e6, type(uint256).max);
        uint256 usdcIn = 1_000e6;
        _fundTaker(mmA, usdcIn, 0);

        uint256 makerWethBefore = weth.balanceOf(maker);
        uint256 makerUsdcBefore = usdc.balanceOf(maker);
        vm.recordLogs();
        vm.prank(mmA);
        (uint256 amountIn, uint256 amountOut,) =
            router.swap(order, address(usdc), address(weth), usdcIn, _taker(mmA, true, ""));
        assertEq(amountIn, usdcIn);
        assertGt(amountOut, 0);
        assertEq(usdc.balanceOf(mmA), 0);
        assertEq(weth.balanceOf(mmA), amountOut);
        assertEq(weth.balanceOf(maker), makerWethBefore - amountOut);
        assertEq(usdc.balanceOf(maker), makerUsdcBefore + usdcIn);
        assertEq(weth.balanceOf(address(router)), 0);
        assertEq(usdc.balanceOf(address(router)), 0);
        assertTrue(_sawBoth(IDeskFill.DeskFill.selector, SwapVMEvents.Swapped.selector));

        uint256 usdcOut = 1_000e6;
        weth.mint(mmA, 1e18);
        vm.prank(mmA);
        (uint256 sellIn, uint256 sellOut,) =
            router.swap(order, address(weth), address(usdc), usdcOut, _taker(mmA, false, ""));
        assertEq(sellOut, usdcOut);
        assertGt(sellIn, 0);
        assertEq(weth.balanceOf(address(router)), 0);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    function test_TI2_quoteMatchesSwapAndEmitsNothing() public {
        ISwapVM.Order memory order = _ship(1, 700e18, 1_200_000e6, type(uint256).max);
        bytes memory data = _taker(mmA, true, "");
        vm.recordLogs();
        vm.prank(mmA);
        (uint256 qIn, uint256 qOut,) = router.quote(order, address(usdc), address(weth), 1_000e6, data);
        assertEq(vm.getRecordedLogs().length, 0);
        _fundTaker(mmA, 1_000e6, 0);
        vm.prank(mmA);
        (uint256 sIn, uint256 sOut,) = router.swap(order, address(usdc), address(weth), 1_000e6, data);
        assertEq(qIn, sIn);
        assertEq(qOut, sOut);
    }

    function test_TI3_quoteFromStrangerReverts() public {
        ISwapVM.Order memory order = _ship(1, 700e18, 1_200_000e6, type(uint256).max);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateTakerMismatch.selector, mmA, stranger));
        router.quote(order, address(usdc), address(weth), 1_000e6, _taker(mmA, true, ""));
    }

    function test_TI4_dockThenReshipNeedsANewSalt() public {
        ISwapVM.Order memory order = _ship(1, 700e18, 1_200_000e6, type(uint256).max);
        bytes32 strategyHash = router.hash(order);
        address[] memory tokens = new address[](2);
        tokens[0] = address(weth);
        tokens[1] = address(usdc);
        vm.prank(maker);
        aqua.dock(address(router), strategyHash, tokens);
        vm.expectRevert();
        router.quote(order, address(usdc), address(weth), 1_000e6, _taker(mmA, true, ""));

        vm.prank(maker);
        vm.expectRevert(abi.encodeWithSelector(IAqua.StrategiesMustBeImmutable.selector, address(router), strategyHash));
        aqua.ship(address(router), abi.encode(order), tokens, _amounts(700e18, 1_200_000e6));

        ISwapVM.Order memory next = _ship(2, 700e18, 1_200_000e6, type(uint256).max);
        assertTrue(router.hash(next) != strategyHash);
    }

    function test_TI5_contractWalletFills() public {
        ISwapVM.Order memory order = _ship(1, 700e18, 1_200_000e6, type(uint256).max);
        usdc.mint(address(mmD), 1_000e6);
        mmD.fill(router, usdc, order, address(usdc), address(weth), 1_000e6, _taker(address(mmD), true, ""));
        assertGt(weth.balanceOf(address(mmD)), 0);
    }

    function test_TI6_otherNameReverts() public {
        ISwapVM.Order memory order = _ship(1, 700e18, 1_200_000e6, type(uint256).max);
        vm.prank(mmB);
        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateTakerMismatch.selector, mmA, mmB));
        router.quote(order, address(usdc), address(weth), 1_000e6, _taker(mmA, true, ""));
    }

    function test_TI7_minOutIsEnforced() public {
        ISwapVM.Order memory order = _ship(1, 700e18, 1_200_000e6, type(uint256).max);
        bytes memory data = _taker(mmA, true, abi.encode(type(uint256).max));
        vm.expectRevert();
        router.quote(order, address(usdc), address(weth), 1_000e6, data);
    }

    function test_TI8_programMatchesTheGoldenVector() public {
        bytes memory gate = EnsGateArgs.build(
            EnsGateArgs.GateArgs({
                ethRegistry: address(uint160(0xe1)),
                deskRegistry: address(uint160(0xd1)),
                clientsRegistry: address(uint160(0xc1)),
                resolver: address(uint160(0xa1)),
                suffix: SUFFIX
            })
        );
        bytes memory price = DeskArgs.buildPriceArgs(
            DeskArgs.PriceArgs({
                resolver: address(uint160(0xa1)),
                oracle: address(uint160(0x0a)),
                base: address(uint160(0xee)),
                quote: address(uint160(0xdc)),
                oracleDecimals: 8,
                baseDecimals: 18,
                quoteDecimals: 6,
                maxStaleness: 3600,
                wStarBps: 7000,
                kappaBps: 200,
                sMinBps: 5,
                sMaxBps: 200
            })
        );
        bytes memory program = DeskArgs.buildProgram(1_790_000_000, 1, gate, price);
        assertEq(program.length, 214);
        ISwapVM.Order memory order = _order(program);
        emit log_named_bytes32("strategyHash", router.hash(order));
    }

    function test_TI9_exactAllowanceThenMax() public {
        ISwapVM.Order memory order = _ship(1, 10e18, 1_000e6, 0);
        _fundTaker(mmA, 1_000e6, 1e18);
        vm.prank(mmA);
        router.swap(order, address(usdc), address(weth), 1_000e6, _taker(mmA, true, ""));
        vm.prank(mmA);
        vm.expectRevert();
        router.swap(order, address(weth), address(usdc), 1e18, _taker(mmA, true, ""));

        vm.prank(maker);
        usdc.approve(address(aqua), type(uint256).max);
        vm.prank(mmA);
        router.swap(order, address(weth), address(usdc), 1e15, _taker(mmA, true, ""));
    }

    function _ship(uint64 salt, uint256 wethAmt, uint256 usdcAmt, uint256 allowance)
        internal
        returns (ISwapVM.Order memory order)
    {
        order = _order(DeskArgs.buildProgram(1_790_000_000, salt, _gate(), _price()));
        weth.mint(maker, wethAmt);
        usdc.mint(maker, usdcAmt);
        uint256 approveAmt = allowance == 0 ? wethAmt : allowance;
        uint256 approveUsdc = allowance == 0 ? usdcAmt : allowance;
        vm.startPrank(maker);
        weth.approve(address(aqua), approveAmt);
        usdc.approve(address(aqua), approveUsdc);
        aqua.ship(address(router), abi.encode(order), _tokens(), _amounts(wethAmt, usdcAmt));
        vm.stopPrank();
    }

    function _order(bytes memory program) internal view returns (ISwapVM.Order memory) {
        return MakerTraitsLib.build(
            MakerTraitsLib.Args({
                maker: maker,
                shouldUnwrapWeth: false,
                useAquaInsteadOfSignature: true,
                allowZeroAmountIn: false,
                receiver: address(0),
                hasPreTransferInHook: false,
                hasPostTransferInHook: false,
                hasPreTransferOutHook: false,
                hasPostTransferOutHook: false,
                preTransferInTarget: address(0),
                preTransferInData: "",
                postTransferInTarget: address(0),
                postTransferInData: "",
                preTransferOutTarget: address(0),
                preTransferOutData: "",
                postTransferOutTarget: address(0),
                postTransferOutData: "",
                program: program
            })
        );
    }

    function _taker(address who, bool exactIn, bytes memory threshold) internal view returns (bytes memory) {
        return TakerTraitsLib.build(
            TakerTraitsLib.Args({
                taker: who,
                isExactIn: exactIn,
                shouldUnwrapWeth: false,
                hasPreTransferInCallback: false,
                hasPreTransferOutCallback: false,
                isStrictThresholdAmount: false,
                isFirstTransferFromTaker: false,
                useTransferFromAndAquaPush: true,
                threshold: threshold,
                to: address(0),
                deadline: 0,
                preTransferInHookData: "",
                postTransferInHookData: "",
                preTransferOutHookData: "",
                postTransferOutHookData: "",
                preTransferInCallbackData: "",
                preTransferOutCallbackData: "",
                instructionsArgs: DeskArgs.buildTakerArgs(
                    _name(who == mmB ? "mm-b" : who == address(mmD) ? "mm-d" : "mm-a")
                ),
                signature: ""
            })
        );
    }

    function _gate() internal view returns (bytes memory) {
        return EnsGateArgs.build(
            EnsGateArgs.GateArgs({
                ethRegistry: address(ethReg),
                deskRegistry: address(deskReg),
                clientsRegistry: address(clientsReg),
                resolver: address(resolver),
                suffix: SUFFIX
            })
        );
    }

    function _price() internal view returns (bytes memory) {
        return DeskArgs.buildPriceArgs(
            DeskArgs.PriceArgs({
                resolver: address(resolver),
                oracle: address(oracle),
                base: address(weth),
                quote: address(usdc),
                oracleDecimals: 8,
                baseDecimals: 18,
                quoteDecimals: 6,
                maxStaleness: 3600,
                wStarBps: 7000,
                kappaBps: 200,
                sMinBps: 5,
                sMaxBps: 200
            })
        );
    }

    function _name(string memory label) internal pure returns (bytes memory) {
        return DeskArgs.dnsEncode(string.concat(label, ".clients.desk.eth"));
    }

    function _tokens() internal view returns (address[] memory tokens) {
        tokens = new address[](2);
        tokens[0] = address(weth);
        tokens[1] = address(usdc);
    }

    function _amounts(uint256 wethAmt, uint256 usdcAmt) internal pure returns (uint256[] memory amounts) {
        amounts = new uint256[](2);
        amounts[0] = wethAmt;
        amounts[1] = usdcAmt;
    }

    function _fundTaker(address who, uint256 usdcAmt, uint256 wethAmt) internal {
        usdc.mint(who, usdcAmt);
        weth.mint(who, wethAmt);
        vm.startPrank(who);
        usdc.approve(address(router), type(uint256).max);
        weth.approve(address(router), type(uint256).max);
        vm.stopPrank();
    }

    function _sawBoth(bytes32 a, bytes32 b) internal view returns (bool) {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool sawA;
        bool sawB;
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].topics[0] == a) sawA = true;
            if (logs[i].topics[0] == b) sawB = true;
        }
        return sawA && sawB;
    }
}

interface SwapVMEvents {
    event Swapped(
        bytes32 orderHash,
        address maker,
        address taker,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
}

interface IDeskFill {
    event DeskFill(
        bytes32 indexed orderHash,
        bytes32 indexed nameHash,
        address indexed taker,
        bytes dnsName,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 midWad,
        uint16 spreadBps,
        uint8 spreadSource,
        uint256 wBeforeWad
    );
}
