# 009 Foundry integration tests

## One behavior

The router, Aqua, and the ENS mocks complete a ship and a fill in both directions, and refuse the cases in Desk system §10.

## In scope

- `contracts/test/DeskRouter.integration.t.sol` and `contracts/test/mocks/ContractMM.sol`.

## Out of scope

- EnsGate and DeskPrice. The T-TS-4 hash check lands once this suite records `router.hash(order)`.

## Acceptance

- [ ] `forge test` passes.
