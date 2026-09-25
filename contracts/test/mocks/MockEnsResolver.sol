// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IAddrResolver, IDataResolver, IMulticallable } from "../../src/interfaces/IDeskEns.sol";

/// @notice Test double for the treasury PermissionedResolver.
/// @dev Records are keyed by `namehash(dnsName)`. A name with no record falls back to node `0x00`.
/// T3, T5b and T8 call `setAddr`, `setData`, `setRevertingKey` and `resolve`.
/// `resolve` accepts `addr(bytes32)`, `data(bytes32,string)` and `multicall(bytes[])`.
/// A multicall returns `abi.encode(bytes[])`. Each sub-result is `abi.encode(returnData)` or the revert bytes.
contract MockEnsResolver {
    error UnsupportedResolverProfile(bytes4 selector);

    struct Data {
        bool present;
        bytes value;
    }

    mapping(bytes32 node => address) private _addr;
    mapping(bytes32 node => bool) private _addrSet;
    mapping(bytes32 node => mapping(string key => Data)) private _data;
    mapping(string key => bool) public revertingKey;

    function setAddr(bytes calldata dnsName, address a) external {
        bytes32 node = namehash(dnsName);
        _addr[node] = a;
        _addrSet[node] = true;
    }

    function setData(bytes calldata dnsName, string calldata key, bytes calldata value) external {
        _data[namehash(dnsName)][key] = Data(true, value);
    }

    /// @notice When `on` is true, a `data()` read of `key` reverts. Used to put error bytes inside multicall.
    function setRevertingKey(string calldata key, bool on) external {
        revertingKey[key] = on;
    }

    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory) {
        bytes4 sel = bytes4(data);
        if (sel == IMulticallable.multicall.selector) {
            bytes[] memory calls = abi.decode(data[4:], (bytes[]));
            bytes[] memory results = new bytes[](calls.length);
            for (uint256 i; i < calls.length; i++) {
                try this.dispatch(name, calls[i]) returns (bytes memory ret) {
                    results[i] = abi.encode(ret);
                } catch (bytes memory err) {
                    results[i] = err;
                }
            }
            return abi.encode(results);
        }
        return this.dispatch(name, data);
    }

    function dispatch(bytes calldata name, bytes calldata data) external view returns (bytes memory) {
        bytes4 sel = bytes4(data);
        bytes32 node = namehash(name);
        if (sel == IAddrResolver.addr.selector) {
            if (!_addrSet[node]) {
                node = bytes32(0);
            }
            return abi.encode(_addr[node]);
        }
        if (sel == IDataResolver.data.selector) {
            (, string memory key) = abi.decode(data[4:], (bytes32, string));
            if (revertingKey[key]) {
                revert UnsupportedResolverProfile(sel);
            }
            Data memory rec = _data[node][key];
            if (!rec.present) {
                rec = _data[bytes32(0)][key];
            }
            return rec.value;
        }
        revert UnsupportedResolverProfile(sel);
    }

    /// @notice ENS namehash over a DNS-encoded name, including the terminal zero byte.
    function namehash(bytes calldata dnsName) public pure returns (bytes32 node) {
        uint256 count;
        uint256 i;
        while (i < dnsName.length && dnsName[i] != 0) {
            uint256 n = uint8(dnsName[i]);
            i += 1 + n;
            count++;
        }
        bytes32[] memory labels = new bytes32[](count);
        i = 0;
        for (uint256 k; k < count; k++) {
            uint256 n = uint8(dnsName[i]);
            labels[k] = keccak256(dnsName[i + 1:i + 1 + n]);
            i += 1 + n;
        }
        for (uint256 k = count; k > 0; k--) {
            node = keccak256(abi.encodePacked(node, labels[k - 1]));
        }
    }
}
