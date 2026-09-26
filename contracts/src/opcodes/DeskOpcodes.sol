// SPDX-License-Identifier: LicenseRef-Degensoft-SwapVM-1.1
pragma solidity 0.8.30;

/// @custom:license-url https://github.com/1inch/swap-vm/blob/main/LICENSES/SwapVM-1.1.txt
/// @custom:copyright © 2025 Degensoft Ltd
/// @notice Derived from swap-vm v1.0.2 src/opcodes/AquaOpcodes.sol (© 2025 Degensoft Ltd). Modified by the Desk team on 2026-09-25: opcode table drops fees and AMMs and adds EnsGate and DeskPrice.

import {Context} from "@1inch/swap-vm/libs/VM.sol";
import {Controls} from "@1inch/swap-vm/instructions/Controls.sol";

import {DeskPrice} from "../instructions/DeskPrice.sol";
import {EnsGate} from "../instructions/EnsGate.sol";

contract DeskOpcodes is Controls, EnsGate, DeskPrice {
    function _notInstruction(Context memory, bytes calldata) internal view {}

    function _opcodes()
        internal
        pure
        virtual
        returns (function(Context memory, bytes calldata) internal[] memory result)
    {
        function(Context memory, bytes calldata) internal[37] memory instructions = [
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            Controls._jump,
            Controls._jumpIfTokenIn,
            Controls._jumpIfTokenOut,
            Controls._deadline,
            Controls._onlyTakerTokenBalanceNonZero,
            Controls._onlyTakerTokenBalanceGte,
            Controls._onlyTakerTokenSupplyShareGte,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            Controls._salt,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            _notInstruction,
            Controls._onlyTxOriginTokenBalanceNonZero,
            EnsGate._ensGate,
            DeskPrice._deskPrice
        ];

        uint256 instructionsArrayLength = instructions.length - 1;
        assembly ("memory-safe") {
            result := instructions
            mstore(result, instructionsArrayLength)
        }
    }
}
