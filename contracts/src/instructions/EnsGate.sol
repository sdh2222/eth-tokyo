// SPDX-License-Identifier: LicenseRef-Degensoft-SwapVM-1.1
pragma solidity 0.8.30;

/// @custom:license-url https://github.com/1inch/swap-vm/blob/main/LICENSES/SwapVM-1.1.txt
/// @custom:copyright © 2025 Degensoft Ltd
/// @notice Derived from swap-vm v1.0.2 src/instructions (© 2025 Degensoft Ltd). Modified by the Desk team on 2026-09-25: EnsGate instruction #34.

import { Context, ContextLib } from "@1inch/swap-vm/libs/VM.sol";

import { IAddrResolver, IExtendedResolver, IRegistry, IStandardRegistry } from "../interfaces/IDeskEns.sol";

library EnsGateArgs {
    struct GateArgs {
        address ethRegistry;
        address deskRegistry;
        address clientsRegistry;
        address resolver;
        bytes suffix;
    }

    function build(GateArgs memory a) internal pure returns (bytes memory) {
        (bool ok,,) = _labels(a.suffix);
        if (
            a.ethRegistry == address(0) || a.deskRegistry == address(0) || a.clientsRegistry == address(0)
                || a.resolver == address(0) || !ok
        ) {
            revert EnsGate.EnsGateInvalidArgs();
        }
        return abi.encodePacked(a.ethRegistry, a.deskRegistry, a.clientsRegistry, a.resolver, a.suffix);
    }

    function parse(bytes calldata args)
        internal
        pure
        returns (GateArgs memory a, string memory clientsLabel, string memory deskLabel)
    {
        if (args.length < 83) {
            revert EnsGate.EnsGateInvalidArgs();
        }
        a.ethRegistry = address(bytes20(args[0:20]));
        a.deskRegistry = address(bytes20(args[20:40]));
        a.clientsRegistry = address(bytes20(args[40:60]));
        a.resolver = address(bytes20(args[60:80]));
        a.suffix = args[80:];
        bool ok;
        (ok, clientsLabel, deskLabel) = _labels(a.suffix);
        if (
            a.ethRegistry == address(0) || a.deskRegistry == address(0) || a.clientsRegistry == address(0)
                || a.resolver == address(0) || !ok
        ) {
            revert EnsGate.EnsGateInvalidArgs();
        }
    }

    function splitName(bytes calldata dnsName) internal pure returns (string memory label, bytes calldata rest) {
        if (dnsName.length == 0 || dnsName[0] == 0) {
            revert EnsGate.EnsGateNameNotUnderDesk();
        }
        uint256 n = uint8(dnsName[0]);
        if (1 + n > dnsName.length) {
            revert EnsGate.EnsGateNameNotUnderDesk();
        }
        label = string(dnsName[1:1 + n]);
        rest = dnsName[1 + n:];
    }

    function _labels(bytes memory suffix)
        private
        pure
        returns (bool ok, string memory clientsLabel, string memory deskLabel)
    {
        if (suffix.length < 3) {
            return (false, "", "");
        }
        uint256 i;
        bytes memory l0;
        bytes memory l1;
        bytes memory l2;
        (ok, i, l0) = _one(suffix, i);
        if (!ok) {
            return (false, "", "");
        }
        (ok, i, l1) = _one(suffix, i);
        if (!ok) {
            return (false, "", "");
        }
        (ok, i, l2) = _one(suffix, i);
        if (!ok || i != suffix.length - 1 || suffix[i] != 0) {
            return (false, "", "");
        }
        if (keccak256(l2) != keccak256(bytes("eth"))) {
            return (false, "", "");
        }
        return (true, string(l0), string(l1));
    }

    function _one(bytes memory suffix, uint256 i) private pure returns (bool, uint256, bytes memory) {
        if (i >= suffix.length) {
            return (false, i, "");
        }
        uint256 n = uint8(suffix[i]);
        if (n == 0 || i + 1 + n > suffix.length) {
            return (false, i, "");
        }
        bytes memory lab = new bytes(n);
        for (uint256 j; j < n; j++) {
            lab[j] = suffix[i + 1 + j];
        }
        return (true, i + 1 + n, lab);
    }
}

abstract contract EnsGate {
    using ContextLib for Context;

    error EnsGateInvalidArgs();
    error EnsGateMissingName();
    error EnsGateNameNotUnderDesk();
    error EnsGateDeskMismatch(address got);
    error EnsGateClientsMismatch(address got);
    error EnsGateNameExpired(uint64 expiry);
    error EnsGateWrongResolver(address got);
    error EnsGateTakerMismatch(address nameAddr, address taker);

    function _ensGate(Context memory ctx, bytes calldata args) internal view {
        (EnsGateArgs.GateArgs memory a, string memory clientsLabel, string memory deskLabel) = EnsGateArgs.parse(args);
        bytes calldata t = ctx.takerArgs();
        if (t.length == 0 || t.length < 1 + uint8(t[0])) {
            revert EnsGateMissingName();
        }
        uint256 len = uint8(t[0]);
        bytes calldata dnsName = t[1:1 + len];
        (string memory label, bytes calldata rest) = EnsGateArgs.splitName(dnsName);
        if (keccak256(rest) != keccak256(a.suffix)) {
            revert EnsGateNameNotUnderDesk();
        }

        address d = IRegistry(a.ethRegistry).getSubregistry(deskLabel);
        if (d != a.deskRegistry) {
            revert EnsGateDeskMismatch(d);
        }
        address c = IRegistry(a.deskRegistry).getSubregistry(clientsLabel);
        if (c != a.clientsRegistry) {
            revert EnsGateClientsMismatch(c);
        }

        uint64 expiry = IStandardRegistry(a.clientsRegistry).getExpiry(uint256(keccak256(bytes(label))));
        if (block.timestamp >= expiry) {
            revert EnsGateNameExpired(expiry);
        }
        address r = IRegistry(a.clientsRegistry).getResolver(label);
        if (r != a.resolver) {
            revert EnsGateWrongResolver(r);
        }

        address nameAddr = abi.decode(
            IExtendedResolver(a.resolver).resolve(dnsName, abi.encodeCall(IAddrResolver.addr, (bytes32(0)))), (address)
        );
        if (nameAddr != ctx.query.taker) {
            revert EnsGateTakerMismatch(nameAddr, ctx.query.taker);
        }
    }
}
