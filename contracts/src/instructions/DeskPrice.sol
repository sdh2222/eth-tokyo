// SPDX-License-Identifier: LicenseRef-Degensoft-SwapVM-1.1
pragma solidity 0.8.30;

/// @custom:license-url https://github.com/1inch/swap-vm/blob/main/LICENSES/SwapVM-1.1.txt
/// @custom:copyright © 2025 Degensoft Ltd
/// @notice Derived from swap-vm v1.0.2 src/instructions (© 2025 Degensoft Ltd). Modified by the Desk team on 2026-09-25: DeskPrice instruction #35.

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

import { Context, ContextLib } from "@1inch/swap-vm/libs/VM.sol";

import { AggregatorV3Interface } from "../interfaces/AggregatorV3Interface.sol";
import { IDataResolver, IExtendedResolver, IMulticallable } from "../interfaces/IDeskEns.sol";
import { IDeskEvents } from "../interfaces/IDeskEvents.sol";
import { DeskArgs } from "../libs/DeskArgs.sol";

abstract contract DeskPrice is IDeskEvents {
    using ContextLib for Context;

    uint256 internal constant WAD = 1e18;

    error DeskPriceInvalidArgs();
    error DeskPriceMissingName();
    error DeskPriceUnsupportedPair(address tokenIn, address tokenOut);
    error DeskPriceRecomputeDetected();
    error DeskPriceOracleInvalid(int256 answer);
    error DeskPriceOracleStale(uint256 updatedAt, uint256 maxStaleness);
    error DeskPriceInvalidRecords();
    error DeskPriceNoTerms();
    error DeskPriceEmptyBook();
    error DeskPriceSizeTooLarge(uint256 floorBps);
    error DeskPriceCapExceeded(uint256 notional, uint256 cap);
    error DeskPriceInsufficientInventory(uint256 amountOut, uint256 balanceOut);

    function _deskPrice(Context memory ctx, bytes calldata args) internal {
        DeskArgs.PriceArgs memory a = DeskArgs.parsePriceArgs(args);
        bytes memory dnsName = _takeName(ctx);
        (bool baseIsIn, bool baseIsOut) = _pair(ctx, a);
        if ((ctx.query.isExactIn ? ctx.swap.amountOut : ctx.swap.amountIn) != 0) {
            revert DeskPriceRecomputeDetected();
        }

        (uint256 pWad) = _oracle(a);
        (uint256 cap, uint256 sPolicy, uint8 spreadSource) = _records(a.resolver, dnsName, a.sMinBps, a.sMaxBps);
        (uint256 wWad, uint256 book, uint256 baseScale, uint256 quoteScale) = _inventory(ctx, a, pWad, baseIsIn);
        (uint256 s, uint8 source) = _sizeFloor(ctx, a, pWad, sPolicy, spreadSource, book, baseScale, quoteScale);
        spreadSource = source;

        (uint256 askWad, uint256 bidWad) = _quotes(a, pWad, wWad, s);
        (uint256 amountIn, uint256 amountOut) = _amounts(ctx, a, askWad, bidWad, baseIsIn, baseIsOut);
        uint256 notional = baseIsIn ? amountOut : amountIn;
        if (notional > cap) {
            revert DeskPriceCapExceeded(notional, cap);
        }
        if (amountOut > (baseIsIn ? ctx.swap.balanceOut : ctx.swap.balanceOut)) {
            revert DeskPriceInsufficientInventory(amountOut, ctx.swap.balanceOut);
        }

        if (ctx.query.isExactIn) {
            ctx.swap.amountOut = amountOut;
        } else {
            ctx.swap.amountIn = amountIn;
        }

        if (!ctx.vm.isStaticContext) {
            emit DeskFill(
                ctx.query.orderHash,
                keccak256(dnsName),
                ctx.query.taker,
                dnsName,
                ctx.query.tokenIn,
                ctx.query.tokenOut,
                ctx.query.isExactIn ? ctx.swap.amountIn : amountIn,
                ctx.query.isExactIn ? amountOut : ctx.swap.amountOut,
                pWad,
                uint16(s),
                spreadSource,
                wWad
            );
        }
    }

    function _takeName(Context memory ctx) private pure returns (bytes memory dnsName) {
        bytes calldata head = ctx.tryChopTakerArgs(1);
        if (head.length == 0) {
            revert DeskPriceMissingName();
        }
        uint256 len = uint8(head[0]);
        bytes calldata name = ctx.tryChopTakerArgs(len);
        if (name.length != len) {
            revert DeskPriceMissingName();
        }
        dnsName = name;
    }

    function _pair(
        Context memory ctx,
        DeskArgs.PriceArgs memory a
    )
        private
        pure
        returns (bool baseIsIn, bool baseIsOut)
    {
        baseIsIn = ctx.query.tokenIn == a.base && ctx.query.tokenOut == a.quote;
        baseIsOut = ctx.query.tokenIn == a.quote && ctx.query.tokenOut == a.base;
        if (!baseIsIn && !baseIsOut) {
            revert DeskPriceUnsupportedPair(ctx.query.tokenIn, ctx.query.tokenOut);
        }
    }

    function _oracle(DeskArgs.PriceArgs memory a) private view returns (uint256 pWad) {
        (, int256 answer,, uint256 updatedAt,) = AggregatorV3Interface(a.oracle).latestRoundData();
        if (answer <= 0) {
            revert DeskPriceOracleInvalid(answer);
        }
        if (updatedAt > block.timestamp) revert DeskPriceOracleStale(updatedAt, a.maxStaleness);
        if (block.timestamp - updatedAt > a.maxStaleness) revert DeskPriceOracleStale(updatedAt, a.maxStaleness);
        pWad = uint256(answer) * (10 ** (18 - a.oracleDecimals));
    }

    function _records(
        address resolver,
        bytes memory dnsName,
        uint16 sMin,
        uint16 sMax
    )
        private
        view
        returns (uint256 cap, uint256 sPolicy, uint8 spreadSource)
    {
        bytes[] memory calls = new bytes[](2);
        calls[0] = abi.encodeCall(IDataResolver.data, (bytes32(0), "desk.terms"));
        calls[1] = abi.encodeCall(IDataResolver.data, (bytes32(0), "desk.spread"));
        bytes memory ret =
            IExtendedResolver(resolver).resolve(dnsName, abi.encodeCall(IMulticallable.multicall, (calls)));
        bytes[] memory m = abi.decode(ret, (bytes[]));
        if (m.length != 2) {
            revert DeskPriceInvalidRecords();
        }

        (bytes memory terms, bool termsOk) = _unwrap(m[0]);
        if (!termsOk || terms.length != 96) {
            revert DeskPriceNoTerms();
        }
        uint256 version = _word(terms, 0);
        uint256 tierBps = _word(terms, 1);
        cap = _word(terms, 2);
        if (version != 1 || tierBps > 0xFFFF || cap > type(uint128).max || cap == 0) {
            revert DeskPriceNoTerms();
        }

        uint256 sRaw = tierBps;
        spreadSource = 0;
        (bytes memory spread, bool spreadOk) = _unwrap(m[1]);
        if (spreadOk && spread.length == 96) {
            uint256 sv = _word(spread, 0);
            uint256 spreadBps = _word(spread, 1);
            uint256 validUntil = _word(spread, 2);
            if (sv == 1 && spreadBps <= 0xFFFF && validUntil <= type(uint64).max && block.timestamp <= validUntil) {
                sRaw = spreadBps;
                spreadSource = 1;
            }
        }
        sPolicy = sRaw;
        if (sPolicy < sMin) {
            sPolicy = sMin;
        }
        if (sPolicy > sMax) {
            sPolicy = sMax;
        }
    }

    function _inventory(Context memory ctx, DeskArgs.PriceArgs memory a, uint256 pWad, bool baseIsIn)
        private
        pure
        returns (uint256 wWad, uint256 book, uint256 baseScale, uint256 quoteScale)
    {
        baseScale = 10 ** (18 - a.baseDecimals);
        quoteScale = 10 ** (18 - a.quoteDecimals);
        uint256 bBal = baseIsIn ? ctx.swap.balanceIn : ctx.swap.balanceOut;
        uint256 qBal = baseIsIn ? ctx.swap.balanceOut : ctx.swap.balanceIn;
        uint256 ethValue = Math.mulDiv(bBal * baseScale, pWad, WAD, Math.Rounding.Floor);
        uint256 usdValue = qBal * quoteScale;
        if (ethValue + usdValue == 0) revert DeskPriceEmptyBook();
        book = ethValue + usdValue;
        wWad = Math.mulDiv(ethValue, WAD, book, Math.Rounding.Floor);
    }

    function _sizeFloor(
        Context memory ctx,
        DeskArgs.PriceArgs memory a,
        uint256 pWad,
        uint256 sPolicy,
        uint8 source,
        uint256 book,
        uint256 baseScale,
        uint256 quoteScale
    ) private pure returns (uint256 s, uint8 spreadSource) {
        uint256 amount = ctx.query.isExactIn ? ctx.swap.amountIn : ctx.swap.amountOut;
        address known = ctx.query.isExactIn ? ctx.query.tokenIn : ctx.query.tokenOut;
        uint256 notionalEst = known == a.base
            ? Math.mulDiv(amount * baseScale, pWad, WAD, Math.Rounding.Floor)
            : amount * quoteScale;
        uint256 floorBps = Math.mulDiv(notionalEst, a.kappaBps, 2 * book, Math.Rounding.Ceil);
        s = floorBps > sPolicy ? floorBps : sPolicy;
        spreadSource = floorBps > sPolicy ? 2 : source;
        if (s >= 10_000) revert DeskPriceSizeTooLarge(floorBps);
    }

    function _quotes(DeskArgs.PriceArgs memory a, uint256 pWad, uint256 wWad, uint256 s)
        private
        pure
        returns (uint256 askWad, uint256 bidWad)
    {
        int256 dev = int256(wWad) - int256(uint256(a.wStarBps) * 1e14);
        int256 skew = int256(uint256(a.kappaBps)) * dev / 10_000;
        uint256 rWad = Math.mulDiv(pWad, uint256(int256(WAD) - skew), WAD, Math.Rounding.Floor);
        askWad = Math.mulDiv(rWad, 10_000 + s, 10_000, Math.Rounding.Floor);
        bidWad = Math.mulDiv(rWad, 10_000 - s, 10_000, Math.Rounding.Floor);
    }

    function _amounts(
        Context memory ctx,
        DeskArgs.PriceArgs memory a,
        uint256 askWad,
        uint256 bidWad,
        bool baseIsIn,
        bool
    )
        private
        pure
        returns (uint256 amountIn, uint256 amountOut)
    {
        uint256 baseScale = 10 ** (18 - a.baseDecimals);
        uint256 quoteScale = 10 ** (18 - a.quoteDecimals);
        if (!baseIsIn && ctx.query.isExactIn) {
            amountIn = ctx.swap.amountIn;
            uint256 wad = Math.mulDiv(amountIn * quoteScale, WAD, askWad, Math.Rounding.Floor);
            amountOut = Math.mulDiv(wad, 1, baseScale, Math.Rounding.Floor);
        } else if (!baseIsIn) {
            amountOut = ctx.swap.amountOut;
            uint256 wad = Math.mulDiv(amountOut * baseScale, askWad, WAD, Math.Rounding.Ceil);
            amountIn = Math.mulDiv(wad, 1, quoteScale, Math.Rounding.Ceil);
        } else if (ctx.query.isExactIn) {
            amountIn = ctx.swap.amountIn;
            uint256 wad = Math.mulDiv(amountIn * baseScale, bidWad, WAD, Math.Rounding.Floor);
            amountOut = Math.mulDiv(wad, 1, quoteScale, Math.Rounding.Floor);
        } else {
            amountOut = ctx.swap.amountOut;
            uint256 wad = Math.mulDiv(amountOut * quoteScale, WAD, bidWad, Math.Rounding.Ceil);
            amountIn = Math.mulDiv(wad, 1, baseScale, Math.Rounding.Ceil);
        }
    }

    function _unwrap(bytes memory wrapped) private pure returns (bytes memory value, bool ok) {
        if (wrapped.length < 64) {
            return (value, false);
        }
        uint256 offset;
        uint256 inner;
        assembly ("memory-safe") {
            offset := mload(add(wrapped, 32))
            inner := mload(add(wrapped, 64))
        }
        if (offset != 0x20 || inner > wrapped.length - 64) {
            return (value, false);
        }
        value = new bytes(inner);
        for (uint256 i; i < inner; i++) {
            value[i] = wrapped[64 + i];
        }
        ok = true;
    }

    function _word(bytes memory v, uint256 i) private pure returns (uint256 word) {
        assembly ("memory-safe") {
            word := mload(add(v, add(32, mul(i, 32))))
        }
    }
}
