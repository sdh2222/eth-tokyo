// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";

import {CalldataPtrLib} from "@1inch/solidity-utils/contracts/libraries/CalldataPtr.sol";
import {Context, ContextLib} from "@1inch/swap-vm/libs/VM.sol";

import {DeskPrice} from "../src/instructions/DeskPrice.sol";
import {DeskArgs} from "../src/libs/DeskArgs.sol";
import {MockOracle} from "../src/mocks/MockOracle.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockWETH} from "../src/mocks/MockWETH.sol";
import {MockEnsResolver} from "./mocks/MockEnsResolver.sol";

contract PriceHarness is DeskPrice {
    using ContextLib for Context;

    function run(
        bytes calldata args,
        bytes calldata taker,
        bool exactIn,
        address tokenIn,
        address tokenOut,
        uint256 balIn,
        uint256 balOut,
        uint256 known,
        bool staticCtx
    ) external returns (uint256 amountIn, uint256 amountOut) {
        Context memory ctx = _ctx(taker, exactIn, tokenIn, tokenOut, balIn, balOut, known, staticCtx);
        _deskPrice(ctx, args);
        return (ctx.swap.amountIn, ctx.swap.amountOut);
    }

    function rest(
        bytes calldata args,
        bytes calldata takerData,
        bool exactIn,
        address tokenIn,
        address tokenOut,
        uint256 balIn,
        uint256 balOut,
        uint256 known
    ) external returns (bytes memory) {
        Context memory ctx = _ctx(takerData, exactIn, tokenIn, tokenOut, balIn, balOut, known, true);
        _deskPrice(ctx, args);
        return ctx.takerArgs();
    }

    function runBoth(bytes calldata args, bytes calldata takerData, address tokenIn, address tokenOut) external {
        Context memory ctx = _ctx(takerData, true, tokenIn, tokenOut, 900e18, 400_000e6, 1e6, true);
        ctx.swap.amountOut = 1;
        _deskPrice(ctx, args);
    }

    function _ctx(
        bytes calldata taker,
        bool exactIn,
        address tokenIn,
        address tokenOut,
        uint256 balIn,
        uint256 balOut,
        uint256 known,
        bool staticCtx
    ) private pure returns (Context memory ctx) {
        ctx.vm.isStaticContext = staticCtx;
        ctx.vm.takerArgsPtr = CalldataPtrLib.from(taker);
        ctx.query.isExactIn = exactIn;
        ctx.query.tokenIn = tokenIn;
        ctx.query.tokenOut = tokenOut;
        ctx.query.taker = address(0xBEEF);
        ctx.query.orderHash = bytes32(uint256(1));
        ctx.swap.balanceIn = balIn;
        ctx.swap.balanceOut = balOut;
        if (exactIn) {
            ctx.swap.amountIn = known;
        } else {
            ctx.swap.amountOut = known;
        }
    }

    function runBoth(bytes calldata args, bytes calldata taker) external {
        Context memory ctx = _ctx(taker, true, address(0), address(0), 1, 1, 1, true);
        ctx.swap.amountOut = 1;
        _deskPrice(ctx, args);
    }

    function build(DeskArgs.PriceArgs calldata a) external pure returns (bytes memory) {
        return DeskArgs.buildPriceArgs(a);
    }
}

contract DeskPriceTest is Test {
    PriceHarness internal harness;
    MockOracle internal oracle;
    MockWETH internal weth;
    MockUSDC internal usdc;
    MockEnsResolver internal resolver;
    bytes internal priceArgs;
    bytes internal taker;
    bytes internal dnsName;

    function setUp() public {
        harness = new PriceHarness();
        oracle = new MockOracle(8, 4000e8);
        weth = new MockWETH();
        usdc = new MockUSDC();
        resolver = new MockEnsResolver();
        dnsName = DeskArgs.dnsEncode("mm-a.clients.desk.eth");
        taker = DeskArgs.buildTakerArgs(dnsName);
        resolver.setData(dnsName, "desk.terms", _terms(3, 10, 50e18));
        priceArgs = _price();
    }

    function test_vectors_priceTakerProgram() public pure {
        bytes memory price = DeskArgs.buildPriceArgs(
            DeskArgs.PriceArgs({
                resolver: address(uint160(0xa1)),
                oracle: address(uint160(0x0a)),
                base: address(uint160(0xee)),
                quote: address(uint160(0xdc)),
                oracleDecimals: 8,
                baseDecimals: 18,
                quoteDecimals: 6,
                maxBlocks: 3,
                wStarBps: 7000
            })
        );
        assertEq(
            price,
            hex"00000000000000000000000000000000000000a1000000000000000000000000000000000000000a00000000000000000000000000000000000000ee00000000000000000000000000000000000000dc08120600031b58"
        );
        assertEq(
            DeskArgs.buildTakerArgs(DeskArgs.dnsEncode("mm-a.clients.desk.eth")),
            hex"17046d6d2d6107636c69656e7473046465736b0365746800"
        );
        bytes memory gate =
            hex"00000000000000000000000000000000000000e100000000000000000000000000000000000000d100000000000000000000000000000000000000c100000000000000000000000000000000000000a107636c69656e7473046465736b0365746800";
        assertEq(
            DeskArgs.buildProgram(1_790_000_000, 1, gate, price),
            hex"0d05006ab13b8014080000000000000001226200000000000000000000000000000000000000e100000000000000000000000000000000000000d100000000000000000000000000000000000000c100000000000000000000000000000000000000a107636c69656e7473046465736b0365746800235700000000000000000000000000000000000000a1000000000000000000000000000000000000000a00000000000000000000000000000000000000ee00000000000000000000000000000000000000dc08120600031b58"
        );
    }

    function test_TP1_vectors() public {
        _cell(900e18, 400_000e6, true, false, 1e18, 4_000_960_000);
        _cell(900e18, 400_000e6, true, true, 4_000_960_000, 1e18);
        _cell(900e18, 400_000e6, false, true, 1e18, 3_995_200_000);
        _cell(900e18, 400_000e6, false, false, 3_995_200_000, 1e18);
        _cell(900e18, 400_000e6, true, true, 1000e6, 249_940_014_396_544_829);
        _cell(900e18, 400_000e6, false, true, 0.5e18, 1_997_600_000);
    }

    function test_TP1_sellStopsAtTarget() public {
        vm.expectRevert(
            abi.encodeWithSelector(DeskPrice.DeskPriceTargetReached.selector, uint256(0.7e18), uint256(0.7e18))
        );
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 1_200_000e6, 700e18, 1000e6, true);
        vm.expectRevert(
            abi.encodeWithSelector(DeskPrice.DeskPriceTargetReached.selector, uint256(0.25e18), uint256(0.7e18))
        );
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 1_200_000e6, 100e18, 1000e6, true);
        _cell(100e18, 1_200_000e6, false, true, 1e18, 3_997_800_000);
    }

    function test_TP10_capIsWethAndSpreadIsIgnored() public {
        vm.recordLogs();
        (uint256 amountIn, uint256 amountOut) =
            harness.run(priceArgs, taker, true, address(usdc), address(weth), 400_000e6, 900e18, 1000e6, false);
        assertEq(amountIn, 1000e6);
        assertEq(amountOut, 249_940_014_396_544_829);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        (,,,,,, uint16 sell, uint16 buy,) = abi.decode(
            logs[logs.length - 1].data, (bytes, address, address, uint256, uint256, uint256, uint16, uint16, uint256)
        );
        assertEq(sell, 3);
        assertEq(buy, 10);

        resolver.setData(dnsName, "desk.spread", abi.encode(uint8(1), uint16(40), uint64(block.timestamp + 1000)));
        _cell(900e18, 400_000e6, true, false, 1e18, 4_000_960_000);

        resolver.setData(dnsName, "desk.terms", _terms(3, 10, 1e18));
        harness.run(priceArgs, taker, false, address(usdc), address(weth), 400_000e6, 900e18, 1e18, true);
        vm.expectRevert(
            abi.encodeWithSelector(DeskPrice.DeskPriceCapExceeded.selector, uint256(1e18 + 1), uint256(1e18))
        );
        harness.run(priceArgs, taker, false, address(usdc), address(weth), 400_000e6, 900e18, 1e18 + 1, true);
    }

    function test_TP10_roundTripDoesNotPayTheMaker(uint128 baseBal, uint96 usdcIn) public {
        baseBal = uint128(bound(baseBal, 50e18, 500e18));
        usdcIn = uint96(bound(usdcIn, 1_000e6, 20_000e6));
        uint256 quoteBal = 1_000_000e6;
        uint256 p = 4000e18;
        uint256 start = baseBal * p / 1e18 + quoteBal * 1e12;
        try harness.run(priceArgs, taker, true, address(usdc), address(weth), quoteBal, baseBal, usdcIn, true) returns (
            uint256, uint256 wethOut
        ) {
            if (wethOut == 0 || wethOut > baseBal) return;
            try harness.run(
                priceArgs,
                taker,
                true,
                address(weth),
                address(usdc),
                baseBal - wethOut,
                quoteBal + usdcIn,
                wethOut,
                true
            ) returns (
                uint256, uint256 usdcBack
            ) {
                uint256 endValue = (baseBal - wethOut) * p / 1e18 + (quoteBal + usdcIn - usdcBack) * 1e12;
                assertLe(endValue, start);
            } catch {}
        } catch {}
    }

    function test_TP2_roundingFavoursTreasury(uint128 baseBal, uint128 quoteBal, uint96 usdcIn, uint96 wethIn) public {
        baseBal = uint128(bound(baseBal, 10e18, 1000e18));
        quoteBal = uint128(bound(quoteBal, 10_000e6, 2_000_000e6));
        usdcIn = uint96(bound(usdcIn, 1e6, 10_000e6));
        wethIn = uint96(bound(wethIn, 0.01e18, 2e18));

        try harness.run(priceArgs, taker, true, address(usdc), address(weth), quoteBal, baseBal, usdcIn, true) returns (
            uint256, uint256 wethOut
        ) {
            if (wethOut > 0 && wethOut <= baseBal) {
                try harness.run(
                    priceArgs, taker, true, address(weth), address(usdc), baseBal, quoteBal, wethOut, true
                ) returns (
                    uint256, uint256 usdcBack
                ) {
                    assertLe(usdcBack, usdcIn);
                } catch {}
            }
        } catch {}
        try harness.run(priceArgs, taker, true, address(weth), address(usdc), baseBal, quoteBal, wethIn, true) returns (
            uint256, uint256 usdcOut
        ) {
            if (usdcOut > 0 && usdcOut <= quoteBal) {
                try harness.run(
                    priceArgs, taker, true, address(usdc), address(weth), quoteBal, baseBal, usdcOut, true
                ) returns (
                    uint256, uint256 wethBack
                ) {
                    assertLe(wethBack, wethIn);
                } catch {}
            }
        } catch {}
    }

    function test_TP3_termsWidths() public {
        _widths(3, 10);
        resolver.setData(dnsName, "desk.terms", _terms(3, 3, 50e18));
        _noTerms();
        resolver.setData(dnsName, "desk.terms", _terms(10, 3, 50e18));
        _noTerms();
        resolver.setData(dnsName, "desk.terms", _terms(3, 10_000, 50e18));
        _noTerms();
        resolver.setData(dnsName, "desk.terms", _terms(3, 10, 50e18));
        _widths(3, 10);
    }

    function test_TP4_noTerms() public {
        resolver.setData(dnsName, "desk.terms", "");
        _noTerms();
        resolver.setData(dnsName, "desk.terms", hex"1234");
        _noTerms();
        resolver.setData(dnsName, "desk.terms", abi.encode(uint8(2), uint16(3), uint16(10), uint128(50e18)));
        _noTerms();
        resolver.setData(dnsName, "desk.terms", _terms(3, 10, 0));
        _noTerms();
    }

    function test_TP5_cap() public {
        resolver.setData(dnsName, "desk.terms", _terms(3, 10, 1e18));
        harness.run(priceArgs, taker, false, address(usdc), address(weth), 400_000e6, 900e18, 1e18, true);
        vm.expectRevert(
            abi.encodeWithSelector(DeskPrice.DeskPriceCapExceeded.selector, uint256(1e18 + 1), uint256(1e18))
        );
        harness.run(priceArgs, taker, false, address(usdc), address(weth), 400_000e6, 900e18, 1e18 + 1, true);

        harness.run(priceArgs, taker, true, address(weth), address(usdc), 900e18, 400_000e6, 1e18, true);
        vm.expectRevert(
            abi.encodeWithSelector(DeskPrice.DeskPriceCapExceeded.selector, uint256(1e18 + 1), uint256(1e18))
        );
        harness.run(priceArgs, taker, true, address(weth), address(usdc), 900e18, 400_000e6, 1e18 + 1, true);
    }

    function test_TP6_oracle() public {
        vm.warp(10_000);
        oracle.setAnswer(4000e8);
        oracle.setAnswer(0);
        vm.expectRevert(abi.encodeWithSelector(DeskPrice.DeskPriceOracleInvalid.selector, int256(0)));
        _small();
        oracle.setAnswer(-1);
        vm.expectRevert(abi.encodeWithSelector(DeskPrice.DeskPriceOracleInvalid.selector, int256(-1)));
        _small();
        oracle.setAnswer(4000e8);
        oracle.setUpdatedAt(block.timestamp - 37);
        vm.expectRevert(abi.encodeWithSelector(DeskPrice.DeskPriceOracleStale.selector, block.timestamp - 37, 36));
        _small();
        oracle.setUpdatedAt(block.timestamp - 36);
        _small();
        oracle.setUpdatedAt(block.timestamp + 1);
        vm.expectRevert(abi.encodeWithSelector(DeskPrice.DeskPriceOracleStale.selector, block.timestamp + 1, 36));
        _small();
    }

    function test_TP7_reverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(DeskPrice.DeskPriceUnsupportedPair.selector, address(weth), address(weth))
        );
        harness.run(priceArgs, taker, true, address(weth), address(weth), 900e18, 400_000e6, 1e6, true);

        vm.expectRevert(DeskPrice.DeskPriceRecomputeDetected.selector);
        harness.runBoth(priceArgs, taker, address(weth), address(usdc));

        vm.expectRevert(DeskPrice.DeskPriceEmptyBook.selector);
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 0, 0, 1e6, true);

        vm.expectRevert(
            abi.encodeWithSelector(DeskPrice.DeskPriceInsufficientInventory.selector, uint256(1), uint256(0))
        );
        harness.run(priceArgs, taker, false, address(weth), address(usdc), 900e18, 0, 1, true);

        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.run(hex"01", taker, true, address(usdc), address(weth), 1, 1, 1, true);

        DeskArgs.PriceArgs memory bad =
            DeskArgs.PriceArgs(address(resolver), address(oracle), address(weth), address(usdc), 8, 18, 6, 3, 7000);
        bad.resolver = address(0);
        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.build(bad);
        bad.resolver = address(resolver);
        bad.base = address(usdc);
        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.build(bad);
        bad.base = address(weth);
        bad.oracleDecimals = 19;
        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.build(bad);
        bad.oracleDecimals = 8;
        bad.maxBlocks = 0;
        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.build(bad);
        bad.maxBlocks = 3;
        bad.wStarBps = 10_001;
        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.build(bad);
    }

    function test_TP8_fillEvent() public {
        vm.recordLogs();
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 400_000e6, 900e18, 1000e6, true);
        assertEq(vm.getRecordedLogs().length, 0);

        vm.recordLogs();
        (, uint256 outAmt) =
            harness.run(priceArgs, taker, true, address(usdc), address(weth), 400_000e6, 900e18, 1000e6, false);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 1);
        (
            bytes memory name,
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOut,
            uint256 mid,
            uint16 sell,
            uint16 buy,
            uint256 w
        ) = abi.decode(logs[0].data, (bytes, address, address, uint256, uint256, uint256, uint16, uint16, uint256));
        assertEq(name, dnsName);
        assertEq(tokenIn, address(usdc));
        assertEq(tokenOut, address(weth));
        assertEq(amountIn, 1000e6);
        assertEq(amountOut, outAmt);
        assertEq(mid, 4000e18);
        assertEq(sell, 3);
        assertEq(buy, 10);
        assertGt(w, 0);
        assertEq(logs[0].topics[1], bytes32(uint256(1)));
        assertEq(logs[0].topics[2], keccak256(dnsName));
        assertEq(logs[0].topics[3], bytes32(uint256(uint160(address(0xBEEF)))));
    }

    function test_TP9_consumesNameLeavesTrailingByte() public {
        bytes memory extra = abi.encodePacked(taker, bytes1(0xab));
        bytes memory left =
            harness.rest(priceArgs, extra, true, address(usdc), address(weth), 400_000e6, 900e18, 1000e6);
        assertEq(left, hex"ab");
    }

    function _cell(uint256 wethBal, uint256 usdcBal, bool quoteIn, bool exactIn, uint256 known, uint256 expected)
        private
    {
        address tokenIn = quoteIn ? address(usdc) : address(weth);
        address tokenOut = quoteIn ? address(weth) : address(usdc);
        uint256 balIn = quoteIn ? usdcBal : wethBal;
        uint256 balOut = quoteIn ? wethBal : usdcBal;
        (uint256 amountIn, uint256 amountOut) =
            harness.run(priceArgs, taker, exactIn, tokenIn, tokenOut, balIn, balOut, known, true);
        if (exactIn) {
            assertEq(amountOut, expected);
        } else {
            assertEq(amountIn, expected);
        }
    }

    function _price() private view returns (bytes memory) {
        return DeskArgs.buildPriceArgs(
            DeskArgs.PriceArgs(address(resolver), address(oracle), address(weth), address(usdc), 8, 18, 6, 3, 7000)
        );
    }

    function _terms(uint16 sell, uint16 buy, uint128 cap) private pure returns (bytes memory) {
        return abi.encode(uint8(1), sell, buy, cap);
    }

    function _widths(uint16 sell, uint16 buy) private {
        vm.recordLogs();
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 400_000e6, 900e18, 1000e6, false);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        (,,,,,, uint16 gotSell, uint16 gotBuy,) =
            abi.decode(logs[0].data, (bytes, address, address, uint256, uint256, uint256, uint16, uint16, uint256));
        assertEq(gotSell, sell);
        assertEq(gotBuy, buy);
    }

    function _noTerms() private {
        vm.expectRevert(DeskPrice.DeskPriceNoTerms.selector);
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 400_000e6, 900e18, 1000e6, true);
    }

    function _small() private {
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 400_000e6, 900e18, 1000e6, true);
    }
}
