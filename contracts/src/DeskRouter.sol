// SPDX-License-Identifier: LicenseRef-Degensoft-SwapVM-1.1
pragma solidity 0.8.30;

/// @custom:license-url https://github.com/1inch/swap-vm/blob/main/LICENSES/SwapVM-1.1.txt
/// @custom:copyright © 2025 Degensoft Ltd
/// @notice Derived from swap-vm v1.0.2 src/routers/AquaSwapVMRouter.sol (© 2025 Degensoft Ltd). Modified by the Desk team on 2026-09-25: opcode table.

import {Context} from "@1inch/swap-vm/libs/VM.sol";
import {Simulator} from "@1inch/solidity-utils/contracts/mixins/Simulator.sol";
import {SwapVM} from "@1inch/swap-vm/SwapVM.sol";

import {DeskOpcodes} from "./opcodes/DeskOpcodes.sol";

/// @title DeskRouter
/// @notice Router with Aqua balance management and the Desk opcode table
contract DeskRouter is Simulator, SwapVM, DeskOpcodes {
    constructor(address aqua, address weth, address owner, string memory name, string memory version)
        SwapVM(aqua, weth, owner, name, version)
    {}

    function _instructions()
        internal
        pure
        override
        returns (function(Context memory, bytes calldata) internal[] memory result)
    {
        return _opcodes();
    }
}
