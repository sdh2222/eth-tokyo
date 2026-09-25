---
title: T8 Spec · Foundry integration tests
notion: https://app.notion.com/p/3e58f1ec11b4813ca453fe4c8212c42b
---

# T8 Spec · Foundry integration tests

## Goal

Prove the whole on-chain path with a real Aqua: ship, quote, fill both ways, refusals, dock and re-ship, a contract-wallet MM, and the allowance reasoning (D10).

## Source of truth

Desk system §4, §5, §9, §10 (`DeskRouter.integration.t.sol`, T-TS-4). Desk security INV-1, INV-3, INV-10, INV-11, INV-13.

## Owns

- `contracts/test/DeskRouter.integration.t.sol`
- `contracts/test/mocks/ContractMM.sol`
- In `contracts/test/OpcodeTable.t.sol`: only the T-OP-1 cases for opcodes 34 and 35 (flip from the stub reverts to `EnsGateInvalidArgs()` / `DeskPriceInvalidArgs()`)
- In `ts/test/lib/`: the T-TS-4 test body (replace T5's skipped placeholder)

## Requirements

1. Setup deploys `Aqua` from `@1inch/aqua/src/Aqua.sol`, `DeskRouter`, the three mocks, and T2's `MockEnsRegistry` (three instances: eth, desk, clients) and `MockEnsResolver`, wired like Desk system §6 with the fixture of Desk testing and quality gates §2.1 (mm-a tier 10 cap 100k; mm-b tier 25 cap 50k; mm-c expired; mm-x no terms).
2. The maker is a plain address standing in for the Safe (`vm.prank`), approving Aqua for max and shipping `abi.encode(order)` built with `DeskArgs.buildProgram` + `EnsGateArgs.build` + SwapVM's `MakerTraitsLib.build` (`useAquaInsteadOfSignature = true`).
3. Taker data built with SwapVM's `TakerTraitsLib.build` (`isExactIn`, `useTransferFromAndAquaPush = true`, `instructionsArgs = DeskArgs.buildTakerArgs(dnsName)`, threshold as needed).
4. Tests T-I-1..T-I-9 exactly as Desk system §10. T-I-1 also asserts the router's WETH and USDC balances are 0 after each fill (INV-13).
5. `ContractMM`: a minimal contract that approves the router and calls `swap` with its own taker data; its address is mm-d's `addr`.
6. T-I-8 records `router.hash(order)` for the placeholder order and prints it; the same literal goes into T-TS-4, which recomputes it with `@desk/lib`.

## Acceptance

- `forge test` (whole suite) green.
- `pnpm -C ts test` green including T-TS-4.

## Out of scope

Changes to EnsGate or DeskPrice. A failing case that shows a spec bug is reported, not patched.
