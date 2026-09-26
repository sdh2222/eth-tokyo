// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Minimal ENSv2 interfaces the router calls (Desk system §6.4).
// The return type IRegistry is declared as address here; the ABI is the same.
// Sources (ensdomains/contracts-v2, branch deploy/sepolia-migration-20260915 @ 07690a9):
// - contracts/src/registry/interfaces/IRegistry.sol:11,16
// - PermissionedRegistry.sol:327 (getExpiry)
// - resolver/AbstractRecordResolver.sol:110 (resolve)
// - ens-contracts IDataResolver (selector 0xecbfada3)

interface IRegistry {
    function getSubregistry(string calldata label) external view returns (address);

    function getResolver(string calldata label) external view returns (address);
}

interface IStandardRegistry {
    function getExpiry(uint256 anyId) external view returns (uint64);
}

interface IExtendedResolver {
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory);
}

/// @dev Selector only.
interface IAddrResolver {
    function addr(bytes32 node) external view returns (address payable);
}

/// @dev Selector only.
interface IDataResolver {
    function data(bytes32 node, string calldata key) external view returns (bytes memory);
}

/// @dev Selector only.
interface IMulticallable {
    function multicall(bytes[] calldata data) external returns (bytes[] memory);
}
