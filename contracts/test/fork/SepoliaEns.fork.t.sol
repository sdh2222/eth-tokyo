// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console2} from "forge-std/Test.sol";
import {
    IAddrResolver,
    IDataResolver,
    IExtendedResolver,
    IMulticallable,
    IRegistry,
    IStandardRegistry
} from "../../src/interfaces/IDeskEns.sol";

/// @title Sepolia ENSv2 fork tests (Desk system §10)
/// @notice Skipped unless SEPOLIA_RPC_URL is set. Forks Sepolia at the latest block.
contract SepoliaEnsForkTest is Test {
    // The measured name (T2b Spec req 3, requirements/005): mm-a.clients.dao-treasury-a.eth.
    string internal constant DESK_LABEL = "dao-treasury-a";
    string internal constant CLIENTS_LABEL = "clients";
    string internal constant MM_LABEL = "mm-a";

    // From config/sepolia.json `ens` (T2b Spec req 2).
    address internal ethRegistry;
    address internal deskRegistry;
    address internal clientsRegistry;
    address internal resolver;

    function setUp() public {
        string memory rpc = vm.envOr("SEPOLIA_RPC_URL", string(""));
        vm.skip(bytes(rpc).length == 0, "SEPOLIA_RPC_URL not set");
        // forge-lint: disable-next-line(unused-return)
        vm.createSelectFork(rpc);

        string memory json = vm.readFile("../config/sepolia.json");
        ethRegistry = abi.decode(vm.parseJson(json, ".ens.ethRegistry"), (address));
        deskRegistry = abi.decode(vm.parseJson(json, ".ens.deskRegistry"), (address));
        clientsRegistry = abi.decode(vm.parseJson(json, ".ens.clientsRegistry"), (address));
        resolver = abi.decode(vm.parseJson(json, ".ens.resolver"), (address));
    }

    /// @notice T-F-1 (T2b): gas of each ENS read of a fill, Desk system §5.3 steps 4-8 and §5.4 step 6.
    /// A measurement: it asserts only that every call succeeds (T2b Spec req 4-5).
    function test_TF1_GasOfEnsReads() public view {
        // Foundry's isolate mode runs each top-level call of a test as its own transaction, so every read
        // would be cold. One external call keeps the reads in one transaction, in fill order, so cold and
        // warm access is as in a fill, with or without isolate mode.
        this.measureEnsReads();
    }

    /// @dev The body of T-F-1; see test_TF1_GasOfEnsReads.
    function measureEnsReads() external view {
        // DNS wire format of the MM name (Desk system §9 `taker` vector without its length byte).
        bytes memory dnsName = bytes.concat(
            hex"04", bytes(MM_LABEL), hex"07", bytes(CLIENTS_LABEL), hex"0e", bytes(DESK_LABEL), hex"03", "eth", hex"00"
        );
        bytes[] memory records = new bytes[](2);
        records[0] = abi.encodeCall(IDataResolver.data, (bytes32(0), "desk.terms"));
        records[1] = abi.encodeCall(IDataResolver.data, (bytes32(0), "desk.spread"));

        console2.log("fork block", block.number);
        uint256 total = 0;
        total += _gasOf(
            "ETHRegistry.getSubregistry(dao-treasury-a)",
            ethRegistry,
            abi.encodeCall(IRegistry.getSubregistry, (DESK_LABEL))
        );
        total += _gasOf(
            "deskRegistry.getSubregistry(clients)",
            deskRegistry,
            abi.encodeCall(IRegistry.getSubregistry, (CLIENTS_LABEL))
        );
        total += _gasOf(
            "clientsRegistry.getExpiry(keccak256(mm-a))",
            clientsRegistry,
            abi.encodeCall(IStandardRegistry.getExpiry, (uint256(keccak256(bytes(MM_LABEL)))))
        );
        total += _gasOf(
            "clientsRegistry.getResolver(mm-a)", clientsRegistry, abi.encodeCall(IRegistry.getResolver, (MM_LABEL))
        );
        total += _gasOf(
            "resolver.resolve(mm-a name, addr)",
            resolver,
            abi.encodeCall(IExtendedResolver.resolve, (dnsName, abi.encodeCall(IAddrResolver.addr, (bytes32(0)))))
        );
        total += _gasOf(
            "resolver.resolve(mm-a name, multicall(desk.terms, desk.spread))",
            resolver,
            abi.encodeCall(IExtendedResolver.resolve, (dnsName, abi.encodeCall(IMulticallable.multicall, (records))))
        );
        console2.log("total", total);
    }

    /// @dev Gas of exactly one call: the caller builds the calldata, so the delta brackets only the staticcall.
    function _gasOf(string memory call, address target, bytes memory callData) internal view returns (uint256 used) {
        uint256 start = gasleft();
        (bool ok, bytes memory ret) = target.staticcall(callData);
        used = start - gasleft();
        assertTrue(ok, string.concat(call, " reverted: ", vm.toString(ret)));
        // A call to an address without code also returns ok, with no data.
        assertGt(ret.length, 0, string.concat(call, " returned no data"));
        console2.log(call, used);
    }
}
