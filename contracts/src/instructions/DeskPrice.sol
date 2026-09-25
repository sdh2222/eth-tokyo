// SPDX-License-Identifier: LicenseRef-Degensoft-SwapVM-1.1
pragma solidity 0.8.30;

/// @custom:license-url https://github.com/1inch/swap-vm/blob/main/LICENSES/SwapVM-1.1.txt

import {Context} from "@1inch/swap-vm/libs/VM.sol";

import {IDeskEvents} from "../interfaces/IDeskEvents.sol";

/// @title DeskPrice (#35)
/// @notice T0 stub. Declares every error of Desk system §5.4; T3 implements `_deskPrice` without renaming them.
abstract contract DeskPrice is IDeskEvents {
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

    function _deskPrice(Context memory, bytes calldata) internal {
        revert("T3");
    }
}
