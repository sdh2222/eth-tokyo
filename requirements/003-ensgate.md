# 003 EnsGate name check

Source: T2 Spec · #34 EnsGate and ENS mocks (`docs/tasks/T2-34-ensgate-and-ens-mocks/spec.md`).

## One behavior

A fill passes instruction 34 only when the taker is the address of a live name under the pinned client book.

## In scope

- `contracts/src/instructions/EnsGate.sol`, `contracts/test/EnsGate.t.sol`, and `contracts/test/mocks/MockEnsRegistry.sol` and `MockEnsResolver.sol`.

## Out of scope

- DeskPrice, the opcode table contract, and real Sepolia ENS.

## Acceptance

- [ ] `forge test --match-path test/EnsGate.t.sol -vv` passes, including `test_TG1` through `test_TG10`.
- [ ] `EnsGateArgs.build` equals the 98-byte gate vector in Desk system §9.
