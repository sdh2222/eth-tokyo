---
title: T6b Spec · Ship CLI
notion: https://app.notion.com/p/3e58f1ec11b48182a4b2d52cf76d9c88
---

# T6b Spec · Ship CLI

## Goal

The command-line twin of the web app's Open-a-desk and Controls flows: open, replace and stop the desk from the Safe, with the chain as the only record.

## Source of truth

Desk system §2.2 D9, D10; §4.1 step 4; §4.3; §7.2 (`findLiveStrategy`, `planShip`, `planDock`, `planMultiSend`); §8.3 (every step). Desk security INV-12, §10.

## Owns

- `ts/src/scripts/ship.ts`

## Requirements

1. Flags exactly: `--salt <n>`, `--dock`, `--no-ship`, `--print-only`, `--replay`, `--rpc <url>`, `--config <path>` (default `config/sepolia.json`; the e2e runner passes `config/local.json`).
2. Behaviour exactly as Desk system §8.3 steps 1 to 5, using only desk-client functions for discovery and planning. No calldata is built in this file.
3. Signing: protocol-kit 8.0.7 `createTransaction({ transactions, onlyCalls: true })`, signed by `SAFE_OWNER_1_PK` and `SAFE_OWNER_2_PK`, executed by owner 1; wait for 1 confirmation.
4. `--print-only` output: the Safe address, MultiSend target, calldata, and each `PlannedTx.label` numbered; identical data to the web app's "Copy transaction for Safe\{Wallet\}" (Q-W-SIGN-4).
5. Exit codes: 0 success; 1 refused by a rule (for example a live strategy without `--dock`); 2 chain or signing error (printed via `decodeDeskError`).
6. Rewrites `config/strategy.<network>.json` from `findStrategies` after every run (cache only).

## Acceptance (on the fixture fork)

- (a) `pnpm ship --dock --salt 2` after the fixture: one Safe transaction docks the fixture's strategy and ships a new one; `safeBalances` equals the ship amounts; `findLiveStrategy` returns the new hash.
- (b) `pnpm ship` without flags exits 1 with "a strategy is live (…); pass --dock to replace it"; `pnpm ship --replay` exits 2 with `StrategiesMustBeImmutable`.
- (c) `pnpm ship --dock --no-ship` stops the desk; a second identical run prints "nothing to dock" and exits 0.
- (d) `pnpm ship --print-only` prints the plan without sending anything (nonce unchanged).

## Out of scope

Changing `planShip` itself (T5b).
