// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Test double for an ENSv2 permissioned registry. Expired labels read as unset.
contract MockEnsRegistry {
    struct Node {
        address subregistry;
        address resolver;
        uint64 expiry;
        bool set;
    }

    mapping(uint256 id => Node) private _nodes;

    function set(string calldata label, address subregistry, address resolver, uint64 expiry) external {
        _nodes[_id(label)] = Node(subregistry, resolver, expiry, true);
    }

    function getSubregistry(string calldata label) external view returns (address) {
        Node memory n = _nodes[_id(label)];
        if (!n.set || block.timestamp >= n.expiry) {
            return address(0);
        }
        return n.subregistry;
    }

    function getResolver(string calldata label) external view returns (address) {
        Node memory n = _nodes[_id(label)];
        if (!n.set || block.timestamp >= n.expiry) {
            return address(0);
        }
        return n.resolver;
    }

    function getExpiry(uint256 id) external view returns (uint64) {
        return _nodes[id].expiry;
    }

    function _id(string calldata label) private pure returns (uint256) {
        return uint256(keccak256(bytes(label)));
    }
}
