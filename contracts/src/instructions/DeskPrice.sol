// SPDX-License-Identifier: LicenseRef-Degensoft-SwapVM-1.1
pragma solidity 0.8.30;

/// @custom:license-url https://github.com/1inch/swap-vm/blob/main/LICENSES/SwapVM-1.1.txt
/// @custom:copyright © 2025 Degensoft Ltd
/// @notice Derived from swap-vm v1.0.2 src/instructions (© 2025 Degensoft Ltd). Modified by the Desk team on 2026-09-25: DeskPrice instruction #35.

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {Context, ContextLib} from "@1inch/swap-vm/libs/VM.sol";

import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";
import {IDataResolver, IExtendedResolver} from "../interfaces/IDeskEns.sol";
import {IDeskEvents} from "../interfaces/IDeskEvents.sol";
import {DeskArgs} from "../libs/DeskArgs.sol";

abstract contract DeskPrice is IDeskEvents {
    using ContextLib for Context;

    uint256 internal constant WAD = 1e18;

    error DeskPriceInvalidArgs();
    error DeskPriceMissingName();
    error DeskPriceUnsupportedPair(address tokenIn, address tokenOut);
    error DeskPriceRecomputeDetected();
    error DeskPriceOracleInvalid(int256 answer);
    error DeskPriceOracleStale(uint256 updatedAt, uint256 maxAge);
    error DeskPriceInvalidRecords();
    error DeskPriceNoTerms();
    error DeskPriceEmptyBook();
    error DeskPriceTargetReached(uint256 wWad, uint256 wStarWad);
    error DeskPriceCapExceeded(uint256 wethAmount, uint256 cap);
    error DeskPriceInsufficientInventory(uint256 amountOut, uint256 balanceOut);

    function _deskPrice(Context memory ctx, bytes calldata args) internal {
        DeskArgs.PriceArgs memory a = DeskArgs.parsePriceArgs(args);
        bytes memory dnsName = _takeName(ctx);
        (bool baseIsIn, bool baseIsOut) = _pair(ctx, a);
        if ((ctx.query.isExactIn ? ctx.swap.amountOut : ctx.swap.amountIn) != 0) {
            revert DeskPriceRecomputeDetected();
        }

        (uint256 pWad) = _oracle(a);
        (uint256 cap, uint16 sSell, uint16 sBuy) = _records(a.resolver, dnsName);
        (uint256 wWad,,,) = _inventory(ctx, a, pWad, baseIsIn);
        uint256 wStar = uint256(a.wStarBps) * 1e14;
        if (!baseIsIn && wWad <= wStar) revert DeskPriceTargetReached(wWad, wStar);

        (uint256 askWad, uint256 bidWad) = _quotes(pWad, sSell, sBuy);
        (uint256 amountIn, uint256 amountOut) = _amounts(ctx, a, askWad, bidWad, baseIsIn, baseIsOut);
        uint256 wethAmt = baseIsIn ? amountIn : amountOut;
        if (wethAmt > cap) {
            revert DeskPriceCapExceeded(wethAmt, cap);
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
                sSell,
                sBuy,
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

    function _pair(Context memory ctx, DeskArgs.PriceArgs memory a)
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
        uint256 maxAge = uint256(a.maxBlocks) * 12;
        if (updatedAt > block.timestamp) revert DeskPriceOracleStale(updatedAt, maxAge);
        if (block.timestamp - updatedAt > maxAge) revert DeskPriceOracleStale(updatedAt, maxAge);
        pWad = uint256(answer) * (10 ** (18 - a.oracleDecimals));
    }

    function _records(address resolver, bytes memory dnsName)
        private
        view
        returns (uint256 cap, uint16 sSell, uint16 sBuy)
    {
        bytes memory terms = _data(resolver, dnsName, "desk.terms");
        if (terms.length != 128) revert DeskPriceNoTerms();
        uint256 version = _word(terms, 0);
        uint256 sell = _word(terms, 1);
        uint256 buy = _word(terms, 2);
        cap = _word(terms, 3);
        if (
            version != 1 || sell > 0xFFFF || buy > 0xFFFF || sell >= buy || buy >= 10_000 || cap == 0
                || cap > type(uint128).max
        ) {
            revert DeskPriceNoTerms();
        }
        sSell = uint16(sell);
        sBuy = uint16(buy);
        (bool live, uint16 liveSell, uint16 liveBuy) = _liveSpread(_data(resolver, dnsName, "desk.spread"), sSell, sBuy);
        if (live) return (cap, liveSell, liveBuy);
        return (cap, sSell, sBuy);
    }

    function _liveSpread(bytes memory spread, uint16 termSell, uint16 termBuy)
        private
        view
        returns (bool live, uint16 sell, uint16 buy)
    {
        if (spread.length != 128) return (false, 0, 0);
        uint256 version = _word(spread, 0);
        uint256 s = _word(spread, 1);
        uint256 b = _word(spread, 2);
        uint256 until = _word(spread, 3);
        if (version != 1 || s == 0 || s >= b || b >= 10_000 || s > termSell || b > termBuy) return (false, 0, 0);
        if (until <= block.timestamp) return (false, 0, 0);
        return (true, uint16(s), uint16(b));
    }

    function _data(address resolver, bytes memory dnsName, string memory key) private view returns (bytes memory) {
        // PermissionedResolver.resolve returns the ABI encoding of data()'s bytes, not the raw record.
        return abi.decode(
            IExtendedResolver(resolver).resolve(dnsName, abi.encodeCall(IDataResolver.data, (bytes32(0), key))), (bytes)
        );
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

    /// @dev The oracle stays the price. Widths are that name's live spread, or its terms.
    function _quotes(uint256 pWad, uint16 sSell, uint16 sBuy) private pure returns (uint256 askWad, uint256 bidWad) {
        uint256 denom = 10_000;
        askWad = Math.mulDiv(pWad, denom + uint256(sSell), denom, Math.Rounding.Floor);
        bidWad = sBuy >= 10_000 ? 0 : Math.mulDiv(pWad, denom - uint256(sBuy), denom, Math.Rounding.Floor);
    }

    function _amounts(
        Context memory ctx,
        DeskArgs.PriceArgs memory a,
        uint256 askWad,
        uint256 bidWad,
        bool baseIsIn,
        bool
    ) private pure returns (uint256 amountIn, uint256 amountOut) {
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

    function _word(bytes memory v, uint256 i) private pure returns (uint256 word) {
        assembly ("memory-safe") {
            word := mload(add(v, add(32, mul(i, 32))))
        }
    }
}
