// SPDX-License-Identifier: LicenseRef-Degensoft-SwapVM-1.1
pragma solidity 0.8.30;

/// @custom:license-url https://github.com/1inch/swap-vm/blob/main/LICENSES/SwapVM-1.1.txt

import {Context} from "@1inch/swap-vm/libs/VM.sol";

/// @title EnsGate (#34)
/// @notice T0 stub. Declares every error of Desk system §5.3; T2 implements `_ensGate` without renaming them.
abstract contract EnsGate {
    error EnsGateInvalidArgs();
    error EnsGateMissingName();
    error EnsGateNameNotUnderDesk();
    error EnsGateDeskMismatch(address got);
    error EnsGateClientsMismatch(address got);
    error EnsGateNameExpired(uint64 expiry);
    error EnsGateWrongResolver(address got);
    error EnsGateTakerMismatch(address nameAddr, address taker);

    function _ensGate(Context memory, bytes calldata) internal view {
        revert("T2");
    }
}
