---
title: T9 Spec · Sepolia bring-up
notion: https://app.notion.com/p/3e58f1ec11b4811dae1ced1f30c46786
---

# T9 Spec · Sepolia bring-up

## Goal

The live desk on Sepolia with real ENSv2 names: deployed, verified, shipped from the Safe through the web app, filled both ways by named MMs, with every refusal the demo needs reproduced and recorded.

## Source of truth

Desk system §4, §6, §8, §13 (C1 to C5); Desk security §7, §10; Desk testing and quality gates §2.4 (Q-S-1..8), §7 (release checklist); Demo run §3 (pre-demo state).

## Owner

A human in the Aqua lane runs every transaction with their own keys (proposed: who holds the Sepolia keys is for the team to confirm). An agent may assist with read-only checks and with `docs/demo-log.md`, never with keys.

## Owns

- `docs/demo-log.md` (every Sepolia tx hash with what it proved)
- T-F-2 in `contracts/test/fork/SepoliaEns.fork.t.sol`
- `config/sepolia.json` values for the live run

## Requirements

1. Config has the live ENS addresses confirmed at H0 (C1) and the ENS lane's `deskRegistry`, `clientsRegistry`, `resolver` and MM addresses.
2. ENS state matches Desk system §6 and Demo run §3: mm-a (tier 10, cap 100,000), mm-b (tier 25, cap 50,000), mm-c expired, the agent holds only `desk.spread` and `desk.stats`, the default record has no `addr` and no usable terms.
3. Deploy with `--verify`; the router is verified on Etherscan with the SwapVM license header visible.
4. The first ship goes through the web app's O1 with two owner accounts (Q-S-4). The CLI is the fallback only.
5. Q-S-1..Q-S-8 pass and each is logged in `docs/demo-log.md` with its tx hash or command output.
6. T-F-2 green against the real names.
7. After bring-up, leave the chain in the Demo run §3 pre-demo state (no live desk on the demo Safe, oracle fresh, MMs approved).

## Acceptance

Desk testing and quality gates §2.4 all green; `docs/demo-log.md` complete; one full rehearsal (Q-D-1) run on Sepolia.

## Out of scope

New features. Any fix found here goes back to its task as a Bug row.
