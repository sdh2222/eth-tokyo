// SPDX-License-Identifier: LicenseRef-Degensoft-SwapVM-1.1
pragma solidity 0.8.30;

/// @custom:license-url https://github.com/1inch/swap-vm/blob/main/LICENSES/SwapVM-1.1.txt
/// @custom:copyright © 2025 Degensoft Ltd
/// @notice Derived from swap-vm v1.0.2 src/libs (© 2025 Degensoft Ltd). Modified by the Desk team on 2026-09-25: encode DeskPrice args, taker args and the program.

import {DeskPrice} from "../instructions/DeskPrice.sol";

library DeskArgs {
    struct PriceArgs {
        address resolver;
        address oracle;
        address base;
        address quote;
        uint8 oracleDecimals;
        uint8 baseDecimals;
        uint8 quoteDecimals;
        uint16 maxBlocks;
        uint16 wStarBps;
    }

    function buildPriceArgs(PriceArgs memory a) internal pure returns (bytes memory) {
        _check(a);
        return abi.encodePacked(
            a.resolver,
            a.oracle,
            a.base,
            a.quote,
            a.oracleDecimals,
            a.baseDecimals,
            a.quoteDecimals,
            a.maxBlocks,
            a.wStarBps
        );
    }

    function parsePriceArgs(bytes calldata args) internal pure returns (PriceArgs memory a) {
        if (args.length != 87) {
            revert DeskPrice.DeskPriceInvalidArgs();
        }
        a.resolver = address(bytes20(args[0:20]));
        a.oracle = address(bytes20(args[20:40]));
        a.base = address(bytes20(args[40:60]));
        a.quote = address(bytes20(args[60:80]));
        a.oracleDecimals = uint8(args[80]);
        a.baseDecimals = uint8(args[81]);
        a.quoteDecimals = uint8(args[82]);
        a.maxBlocks = uint16(bytes2(args[83:85]));
        a.wStarBps = uint16(bytes2(args[85:87]));
        _check(a);
    }

    function buildTakerArgs(bytes memory dnsName) internal pure returns (bytes memory) {
        if (dnsName.length > 255) {
            revert DeskPrice.DeskPriceInvalidArgs();
        }
        return abi.encodePacked(uint8(dnsName.length), dnsName);
    }

    function dnsEncode(string memory name) internal pure returns (bytes memory) {
        bytes memory raw = bytes(name);
        bytes memory out = new bytes(raw.length + 2);
        uint256 w;
        uint256 start;
        for (uint256 i; i <= raw.length; i++) {
            if (i == raw.length || raw[i] == ".") {
                uint256 n = i - start;
                out[w++] = bytes1(uint8(n));
                for (uint256 j; j < n; j++) {
                    out[w++] = raw[start + j];
                }
                start = i + 1;
            }
        }
        out[w++] = 0;
        assembly ("memory-safe") {
            mstore(out, w)
        }
        return out;
    }

    function buildProgram(uint40 deadline, uint64 salt, bytes memory gateArgs, bytes memory priceArgs)
        internal
        pure
        returns (bytes memory)
    {
        if (gateArgs.length > 255 || priceArgs.length > 255) {
            revert DeskPrice.DeskPriceInvalidArgs();
        }
        return abi.encodePacked(
            bytes1(uint8(13)),
            bytes1(uint8(5)),
            deadline,
            bytes1(uint8(20)),
            bytes1(uint8(8)),
            salt,
            bytes1(uint8(34)),
            bytes1(uint8(gateArgs.length)),
            gateArgs,
            bytes1(uint8(35)),
            bytes1(uint8(priceArgs.length)),
            priceArgs
        );
    }

    function _check(PriceArgs memory a) private pure {
        if (
            a.resolver == address(0) || a.oracle == address(0) || a.base == address(0) || a.quote == address(0)
                || a.base == a.quote || a.oracleDecimals > 18 || a.baseDecimals > 18 || a.quoteDecimals > 18
                || a.maxBlocks == 0 || a.wStarBps > 10_000
        ) {
            revert DeskPrice.DeskPriceInvalidArgs();
        }
    }
}
