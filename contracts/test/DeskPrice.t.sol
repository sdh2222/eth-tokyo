// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Test } from "forge-std/Test.sol";
import { Vm } from "forge-std/Vm.sol";

import { CalldataPtrLib } from "@1inch/solidity-utils/contracts/libraries/CalldataPtr.sol";
import { Context, ContextLib } from "@1inch/swap-vm/libs/VM.sol";

import { DeskPrice } from "../src/instructions/DeskPrice.sol";
import { DeskArgs } from "../src/libs/DeskArgs.sol";
import { MockOracle } from "../src/mocks/MockOracle.sol";
import { MockUSDC } from "../src/mocks/MockUSDC.sol";
import { MockWETH } from "../src/mocks/MockWETH.sol";
import { MockEnsResolver } from "./mocks/MockEnsResolver.sol";

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
    )
        external
        returns (uint256 amountIn, uint256 amountOut)
    {
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
    )
        external
        returns (bytes memory)
    {
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
    )
        private
        pure
        returns (Context memory ctx)
    {
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
        resolver.setData(dnsName, "desk.terms", abi.encode(uint8(1), uint16(10), uint128(100_000e6)));
        priceArgs = _price(5, 200);
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
                maxStaleness: 3600,
                wStarBps: 7000,
                kappaBps: 200,
                sMinBps: 5,
                sMaxBps: 200
            })
        );
        assertEq(
            price,
            hex"00000000000000000000000000000000000000a1000000000000000000000000000000000000000a00000000000000000000000000000000000000ee00000000000000000000000000000000000000dc08120600000e101b5800c8000500c8"
        );
        assertEq(
            DeskArgs.buildTakerArgs(DeskArgs.dnsEncode("mm-a.clients.desk.eth")),
            hex"17046d6d2d6107636c69656e7473046465736b0365746800"
        );
        bytes memory gate =
            hex"00000000000000000000000000000000000000e100000000000000000000000000000000000000d100000000000000000000000000000000000000c100000000000000000000000000000000000000a107636c69656e7473046465736b0365746800";
        assertEq(
            DeskArgs.buildProgram(1_790_000_000, 1, gate, price),
            hex"0d05006ab13b8014080000000000000001226200000000000000000000000000000000000000e100000000000000000000000000000000000000d100000000000000000000000000000000000000c100000000000000000000000000000000000000a107636c69656e7473046465736b0365746800235f00000000000000000000000000000000000000a1000000000000000000000000000000000000000a00000000000000000000000000000000000000ee00000000000000000000000000000000000000dc08120600000e101b5800c8000500c8"
        );
    }

    function test_TP1_vectors() public {
        _cell(900e18, 400_000e6, true, true, 3_987_984_000, 1e18);
        _cell(900e18, 400_000e6, true, false, 1e18, 3_987_984_000);
        _cell(900e18, 400_000e6, false, true, 1e18, 3_980_016_000);
        _cell(900e18, 400_000e6, false, false, 3_980_016_000, 1e18);
        _cell(900e18, 400_000e6, true, true, 1000e6, 250_753_262_801_455_572);
        _cell(900e18, 400_000e6, false, true, 0.5e18, 1_990_008_000);

        _cell(700e18, 1_200_000e6, true, true, 3_987_984_000, 996_000_000_000_000_000);
        _cell(700e18, 1_200_000e6, true, false, 1e18, 4_004_000_000);
        _cell(700e18, 1_200_000e6, false, true, 1e18, 3_996_000_000);
        _cell(700e18, 1_200_000e6, false, false, 3_980_016_000, 996_000_000_000_000_000);
        _cell(700e18, 1_200_000e6, true, true, 1000e6, 249_750_249_750_249_750);
        _cell(700e18, 1_200_000e6, false, true, 0.5e18, 1_998_000_000);

        _cell(100e18, 1_200_000e6, true, true, 3_987_984_000, 987_115_956_392_467_789);
        _cell(100e18, 1_200_000e6, true, false, 1e18, 4_040_036_000);
        _cell(100e18, 1_200_000e6, false, true, 1e18, 4_031_964_000);
        _cell(100e18, 1_200_000e6, false, false, 3_980_016_000, 987_115_956_392_467_790);
        _cell(100e18, 1_200_000e6, true, true, 1000e6, 247_522_546_828_790_634);
        _cell(100e18, 1_200_000e6, false, true, 0.5e18, 2_015_982_000);
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
                (, uint256 usdcBack) =
                    harness.run(priceArgs, taker, true, address(weth), address(usdc), baseBal, quoteBal, wethOut, true);
                assertLe(usdcBack, usdcIn);
            }
        } catch { }
        try harness.run(priceArgs, taker, true, address(weth), address(usdc), baseBal, quoteBal, wethIn, true) returns (
            uint256, uint256 usdcOut
        ) {
            if (usdcOut > 0 && usdcOut <= quoteBal) {
                (, uint256 wethBack) =
                    harness.run(priceArgs, taker, true, address(usdc), address(weth), quoteBal, baseBal, usdcOut, true);
                assertLe(wethBack, wethIn);
            }
        } catch { }
    }

    function test_TP3_spreadSelection() public {
        _spread(abi.encode(uint8(1), uint16(40), uint64(block.timestamp + 1000)), 40, 1);
        resolver.setData(dnsName, "desk.spread", abi.encode(uint8(1), uint16(40), uint64(block.timestamp - 1)));
        _spreadRaw(10, 0);
        resolver.setData(dnsName, "desk.spread", "");
        _spreadRaw(10, 0);
        resolver.setData(dnsName, "desk.spread", abi.encode(uint8(2), uint16(40), uint64(block.timestamp + 1000)));
        _spreadRaw(10, 0);
        resolver.setData(dnsName, "desk.spread", hex"1234");
        _spreadRaw(10, 0);
        resolver.setData(dnsName, "desk.spread", abi.encodePacked(uint8(1), uint16(40), uint64(block.timestamp + 1000)));
        _spreadRaw(10, 0);

        resolver.setData(dnsName, "desk.terms", abi.encode(uint8(1), uint16(1), uint128(100_000e6)));
        resolver.setData(dnsName, "desk.spread", "");
        _spreadRaw(5, 0);
        resolver.setData(dnsName, "desk.spread", abi.encode(uint8(1), uint16(1), uint64(block.timestamp + 1000)));
        _spreadRaw(5, 1);
        resolver.setData(dnsName, "desk.spread", abi.encode(uint8(1), uint16(500), uint64(block.timestamp + 1000)));
        _spreadRaw(200, 1);
        resolver.setData(dnsName, "desk.terms", abi.encode(uint8(1), uint16(500), uint128(100_000e6)));
        resolver.setData(dnsName, "desk.spread", "");
        _spreadRaw(200, 0);
    }

    function test_TP4_noTerms() public {
        resolver.setData(dnsName, "desk.terms", "");
        _noTerms();
        resolver.setData(dnsName, "desk.terms", hex"1234");
        _noTerms();
        resolver.setData(dnsName, "desk.terms", abi.encode(uint8(2), uint16(10), uint128(100_000e6)));
        _noTerms();
        resolver.setData(dnsName, "desk.terms", abi.encode(uint8(1), uint16(10), uint128(0)));
        _noTerms();
    }

    function test_TP5_cap() public {
        resolver.setData(dnsName, "desk.terms", abi.encode(uint8(1), uint16(10), uint128(1000e6)));
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 400_000e6, 900e18, 1000e6, true);
        vm.expectRevert(abi.encodeWithSelector(DeskPrice.DeskPriceCapExceeded.selector, 1000e6 + 1, 1000e6));
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 400_000e6, 900e18, 1000e6 + 1, true);

        resolver.setData(dnsName, "desk.terms", abi.encode(uint8(1), uint16(10), uint128(3_980_016_000)));
        harness.run(priceArgs, taker, true, address(weth), address(usdc), 900e18, 400_000e6, 1e18, true);
        resolver.setData(dnsName, "desk.terms", abi.encode(uint8(1), uint16(10), uint128(3_980_016_000 - 1)));
        vm.expectRevert(
            abi.encodeWithSelector(DeskPrice.DeskPriceCapExceeded.selector, 3_980_016_000, uint256(3_980_016_000 - 1))
        );
        harness.run(priceArgs, taker, true, address(weth), address(usdc), 900e18, 400_000e6, 1e18, true);
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
        oracle.setUpdatedAt(block.timestamp - 3601);
        vm.expectRevert(abi.encodeWithSelector(DeskPrice.DeskPriceOracleStale.selector, block.timestamp - 3601, 3600));
        _small();
        oracle.setUpdatedAt(block.timestamp - 3600);
        _small();
        oracle.setUpdatedAt(block.timestamp + 1);
        vm.expectRevert(abi.encodeWithSelector(DeskPrice.DeskPriceOracleStale.selector, block.timestamp + 1, 3600));
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
        harness.run(priceArgs, taker, false, address(usdc), address(weth), 400_000e6, 0, 1, true);

        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.run(hex"01", taker, true, address(usdc), address(weth), 1, 1, 1, true);

        DeskArgs.PriceArgs memory bad = DeskArgs.PriceArgs(
            address(resolver), address(oracle), address(weth), address(usdc), 8, 18, 6, 3600, 7000, 200, 5, 200
        );
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
        bad.maxStaleness = 0;
        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.build(bad);
        bad.maxStaleness = 3600;
        bad.wStarBps = 10_001;
        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.build(bad);
        bad.wStarBps = 7000;
        bad.kappaBps = 10_000;
        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.build(bad);
        bad.kappaBps = 200;
        bad.sMinBps = 201;
        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.build(bad);
        bad.sMinBps = 5;
        bad.sMaxBps = 10_000;
        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.build(bad);
    }

    function test_TP8_fillEvent() public {
        vm.recordLogs();
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 1_200_000e6, 700e18, 1000e6, true);
        assertEq(vm.getRecordedLogs().length, 0);

        vm.recordLogs();
        (, uint256 outAmt) =
            harness.run(priceArgs, taker, true, address(usdc), address(weth), 1_200_000e6, 700e18, 1000e6, false);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 1);
        (
            bytes memory name,
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOut,
            uint256 mid,
            uint16 spread,
            uint8 source,
            uint256 w
        ) = abi.decode(logs[0].data, (bytes, address, address, uint256, uint256, uint256, uint16, uint8, uint256));
        assertEq(name, dnsName);
        assertEq(tokenIn, address(usdc));
        assertEq(tokenOut, address(weth));
        assertEq(amountIn, 1000e6);
        assertEq(amountOut, outAmt);
        assertEq(mid, 4000e18);
        assertEq(spread, 10);
        assertEq(source, 0);
        assertGt(w, 0);
        assertEq(logs[0].topics[1], bytes32(uint256(1)));
        assertEq(logs[0].topics[2], keccak256(dnsName));
        assertEq(logs[0].topics[3], bytes32(uint256(uint160(address(0xBEEF)))));
    }

    function test_TP9_consumesNameLeavesTrailingByte() public {
        bytes memory extra = abi.encodePacked(taker, bytes1(0xab));
        bytes memory left =
            harness.rest(priceArgs, extra, true, address(usdc), address(weth), 1_200_000e6, 700e18, 1000e6);
        assertEq(left, hex"ab");
    }

    function _cell(
        uint256 wethBal,
        uint256 usdcBal,
        bool quoteIn,
        bool exactIn,
        uint256 known,
        uint256 expected
    )
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

    function _price(uint16 sMin, uint16 sMax) private view returns (bytes memory) {
        return DeskArgs.buildPriceArgs(
            DeskArgs.PriceArgs(
                address(resolver), address(oracle), address(weth), address(usdc), 8, 18, 6, 3600, 7000, 200, sMin, sMax
            )
        );
    }

    function _spread(bytes memory value, uint16 expected, uint8 source) private {
        resolver.setData(dnsName, "desk.spread", value);
        _spreadRaw(expected, source);
    }

    function _spreadRaw(uint16 expected, uint8 source) private {
        vm.recordLogs();
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 1_200_000e6, 700e18, 1000e6, false);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        (,,,,,, uint16 spread, uint8 got,) =
            abi.decode(logs[0].data, (bytes, address, address, uint256, uint256, uint256, uint16, uint8, uint256));
        assertEq(spread, expected);
        assertEq(got, source);
    }

    function _noTerms() private {
        vm.expectRevert(DeskPrice.DeskPriceNoTerms.selector);
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 1_200_000e6, 700e18, 1000e6, true);
    }

    function _small() private {
        harness.run(priceArgs, taker, true, address(usdc), address(weth), 1_200_000e6, 700e18, 1000e6, true);
    }
}
