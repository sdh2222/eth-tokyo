---
title: T8 Plan · Foundry integration tests
notion: https://app.notion.com/p/3e58f1ec11b48184a687e755ea6be180
---

# T8 Plan · Foundry integration tests

## Ready when

T1, T2, T3 merged.

## Branch

`aqua/t8-integration`, worktree `../desk-t8`.

## Steps

1. Shared `setUp` building the fixture (Spec 1–3). Checkpoint: a single `quote` for mm-a succeeds and equals the V1 buy vector for 1 WETH.
2. T-I-1, T-I-2 (fills and quote parity). Checkpoint: green.
3. T-I-3..T-I-7 (refusals, dock, contract wallet, threshold).
4. T-I-8 and T-TS-4 parity.
5. T-I-9 (allowance counter-example).
6. Flip T-OP-1 cases 34/35.
7. QC gate, review agent, PR.

## Commands
```bash
cd contracts && forge test -vv
pnpm -C ts test
```

## Risks and fallbacks

- `quote` must be called with `vm.prank(mm)` (taker = `msg.sender`); forgetting it gives `EnsGateTakerMismatch`, not a bug.
- If an integration case disagrees with Desk system, stop and report the trace (S1 until triaged).

## Review focus

Tests assert balances and events, not only "no revert"; the fixture matches Desk testing and quality gates §2.1.

## Time box

2.5 hours.

## Agent prompt
```javascript
Read the Notion pages "T8 Spec · Foundry integration tests", "Desk system" §4, §5, §9, §10,
"Desk security" §4 and "Desk testing and quality gates" §2.1. Branch aqua/t8-integration.
You own only the files listed under "Owns" in the T8 Spec (including only the 34/35 cases of T-OP-1 and
the T-TS-4 test body). Implement Requirements 1-6 in the Plan's order. Do not change EnsGate or DeskPrice;
if a test shows the code disagrees with the spec, stop and report the failing trace.
Paste output with the QC checklist and save this prompt as docs/prompts/T8.md.
```
