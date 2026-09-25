---
title: T1 Spec · DeskRouter and opcode table
notion: https://app.notion.com/p/3e58f1ec11b481ab8c9aec21ce9fe086
---

# T1 Spec · DeskRouter and opcode table

## Goal

The deployable router: SwapVM v1.0.2's Aqua router with our opcode table, under the size limit, with every opcode index pinned by a test.

## Source of truth

Desk system §5.1, §5.2, §2.2 D8 and D12, §10 (`OpcodeTable.t.sol`), §12. Desk security INV-14, TH-12.

## Owns

- `contracts/src/DeskRouter.sol`
- `contracts/src/opcodes/DeskOpcodes.sol`
- `contracts/test/OpcodeTable.t.sol` (and a harness contract inside that file)
- The `NOTICE.md` rows for the two derived files

## Must not touch

`EnsGate.sol`, `DeskPrice.sol`, `DeskArgs.sol`, mocks, config.

## Requirements

1. `DeskOpcodes` is a copy of `lib/swap-vm/src/opcodes/AquaOpcodes.sol` changed to the table in Desk system §5.2: inherits `Controls, EnsGate, DeskPrice` only; no constructor argument; the static array literal has **37** entries; slot 0 is overwritten with the length (same assembly as upstream); result length 36.
2. Entry mapping, program byte → function: 10 `_jump`, 11 `_jumpIfTokenIn`, 12 `_jumpIfTokenOut`, 13 `_deadline`, 14 `_onlyTakerTokenBalanceNonZero`, 15 `_onlyTakerTokenBalanceGte`, 16 `_onlyTakerTokenSupplyShareGte`, 20 `_salt`, 33 `_onlyTxOriginTokenBalanceNonZero`, 34 `_ensGate`, 35 `_deskPrice`; every other index 0–32 is `_notInstruction`.
3. `DeskRouter` is a copy of `lib/swap-vm/src/routers/AquaSwapVMRouter.sol` per Desk system §5.1: `contract DeskRouter is Simulator, SwapVM, DeskOpcodes`, same constructor signature, `_instructions()` returns `_opcodes()`.
4. Both files keep the upstream license and copyright lines and add: `/// @notice Derived from swap-vm v1.0.2 <path> (© 2025 Degensoft Ltd). Modified by the Desk team on <YYYY-MM-DD>: <what>.`
5. Tests T-OP-1, T-OP-2, T-OP-3 exactly as Desk system §10. The harness exposes `run(uint8 opcode, bytes calldata args, <context fields>)` that builds a `Context` and calls `_opcodes()[opcode](ctx, args)`. Until T2 and T3 merge, 34 and 35 assert the stub reverts `"T2"` / `"T3"` with the comment `// T8 flips these to EnsGateInvalidArgs / DeskPriceInvalidArgs`.
6. No storage variables added (INV-14).

## Acceptance

- `forge build --sizes` shows `DeskRouter` runtime size below 24,576 bytes; paste the line.
- `forge test --match-path test/OpcodeTable.t.sol -vv` green.
- `forge inspect DeskRouter storageLayout` lists only upstream slots.

## Out of scope

The instructions' logic; size-reduction fallbacks (a human reviewer chooses (proposed), see Plan).

## Handoff

T4 deploys this contract; T8 flips T-OP-1's 34/35 cases.
