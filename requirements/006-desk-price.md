# 007 Desk price

Source: T3 Spec · #35 DeskPrice and DeskArgs (`docs/tasks/T3-35-deskprice-and-deskargs/spec.md`).

## One behavior

Instruction 35 prices a fill from the oracle, the maker's terms, and inventory, and emits DeskFill only on a real fill.

## In scope

- `DeskPrice`, `DeskArgs`, and `DeskPrice.t.sol`. The size floor is its own commit after the rest of the pricing.

## Out of scope

- EnsGate, the router shell, and Aqua integration.

## Acceptance

- [ ] `forge test --match-path test/DeskPrice.t.sol -vv --fuzz-runs 256` passes.
- [ ] Every amount in Desk system §9, including V4, is a literal in the tests and matches.
- [ ] The V4 test asserts `spreadSource == 2`.
