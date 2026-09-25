---
title: T2 Spec · #34 EnsGate and ENS mocks
notion: https://app.notion.com/p/3e58f1ec11b481f687d1c0011c35716a
---

# T2 Spec · #34 EnsGate and ENS mocks

## Goal

Instruction #34: only the `addr` of a live name under the pinned `clients.desk.eth` passes. Plus the ENS mocks every later test reuses.

## Source of truth

Desk system §2.2 D1, D3, D4; §5.3; §6; §9 (gate vector); §10 (`EnsGate.t.sol`). Desk security INV-1, INV-2, TH-1..4. Desk dictionary §3.1.

## Owns

- `contracts/src/instructions/EnsGate.sol` (replacing the stub body; keep the error declarations from T0 unchanged)
- `contracts/test/EnsGate.t.sol`
- `contracts/test/mocks/MockEnsRegistry.sol`, `contracts/test/mocks/MockEnsResolver.sol`

## Must not touch

`DeskPrice.sol`, `DeskArgs.sol`, `DeskOpcodes.sol`, `DeskRouter.sol`.

## Requirements

1. `_ensGate` implements Desk system §5.3 steps 1 to 8 in that order, with exactly the errors and arguments declared in T0. `internal view`. Reads the taker args with `ctx.takerArgs()` only; it must not move the cursor.
2. A `library EnsGateArgs` at the top of `EnsGate.sol`:
	- `struct GateArgs { address ethRegistry; address deskRegistry; address clientsRegistry; address resolver; bytes suffix; }`
	- `function build(GateArgs memory a) internal pure returns (bytes memory)`: packed layout of Desk system §5.3; reverts `EnsGateInvalidArgs()` on any rule of step 1.
	- `function parse(bytes calldata args) internal pure returns (GateArgs memory a, string memory clientsLabel, string memory deskLabel)`: validates step 1 and returns the two parent labels from the suffix.
	- `function splitName(bytes calldata dnsName) internal pure returns (string memory label, bytes calldata rest)`: step 3's split; reverts `EnsGateNameNotUnderDesk()` on a zero-length or overrunning label.
	- `build` must reproduce the §9 `gate` vector (98 bytes) for the placeholder addresses.
3. Label ids are `uint256(keccak256(bytes(label)))` (ENS `LibLabel.id`).
4. `MockEnsRegistry` (semantics of `PermissionedRegistry.sol:277-286, 327, 663`):
	- `function set(string calldata label, address subregistry, address resolver, uint64 expiry) external`
	- `getSubregistry(label)` and `getResolver(label)` return `address(0)` when `block.timestamp >= expiry`; `getExpiry(uint256 id)` returns the stored expiry (0 if never set).
5. `MockEnsResolver` (semantics of `AbstractRecordResolver.sol:110-159` and `PermissionedResolver.sol:381-387`):
	- Records keyed by `namehash(dnsName)`; a name without a record uses the record of node `0x00`.
	- Setters: `setAddr(bytes calldata dnsName, address a)`, `setData(bytes calldata dnsName, string calldata key, bytes calldata value)`, `setRevertingKey(string calldata key, bool on)` (a `data()` read of that key reverts, to test error bytes inside multicall).
	- `resolve(bytes name, bytes data)`: supports `addr(bytes32)`, `data(bytes32,string)`, and `multicall(bytes[])`, where each sub-result is captured with try/catch and the whole returns `abi.encode(bytes[])`; any other selector reverts `UnsupportedResolverProfile(bytes4)`.
	- Include a small internal `namehash(bytes)` over DNS-encoded names.
	- Document the API in NatSpec: T3, T5b and T8 depend on it.
6. Tests T-G-1..T-G-10 (Desk system §10), each revert asserted with the exact selector and arguments (`vm.expectRevert(abi.encodeWithSelector(...))`), plus a test that `EnsGateArgs.build` equals the §9 gate vector.

## Security

Desk security §9 Solidity checklist. The only external calls are to `ethRegistry`, `deskRegistry`, `clientsRegistry` and `resolver` from the args. Assembly only for reading calldata words, with offsets commented.

## Acceptance

- `forge test --match-path test/EnsGate.t.sol -vv` green, all T-G cases present by name (`test_TG1_...` .. `test_TG10_...`).
- The gate vector test passes.

## Out of scope

Anything in #35; real ENS (T2b, T9).

## Handoff

T3 and T8 import the two mocks; T5b's fixture deploys them on anvil.
