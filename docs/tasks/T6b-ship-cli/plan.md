---
title: T6b Plan · Ship CLI
notion: https://app.notion.com/p/3e58f1ec11b48150bb07ec797ded8f95
---

# T6b Plan · Ship CLI

## Ready when

T5b and T6a merged.

## Branch

`aqua/t6b-ship`, worktree `../desk-t6b`.

## Steps

1. Arg parsing and config selection. Checkpoint: `--help` lists exactly the flags.
2. Discovery and refusal rule (step 1). Checkpoint: acceptance (b) first half.
3. Plan, print-only, sign and execute (steps 2–3). Checkpoint: acceptance (a), (d).
4. Checks and cache rewrite (steps 4–5). Checkpoint: acceptance (c), (b) second half.
5. PR with all four outputs.

## Commands
```bash
pnpm -C ts fixture --rpc http://127.0.0.1:8545
pnpm -C ts ship --config ../config/local.json --rpc http://127.0.0.1:8545 --dock --salt 2
```

## Risks and fallbacks

- protocol-kit signing fails for the MultiSend: fall back to `--print-only` and execute through the Safe web UI (proposed fallback in Aqua lane working rules and Treasury web app §7.1). Report it; do not hand-build signatures.

## Review focus

No calldata built locally; exit codes; refusal message text.

## Time box

1.5 hours.

## Agent prompt
```javascript
Read the Notion pages "T6b Spec · Ship CLI", "Desk system" §4.3, §7.2, §8.3 and "Desk security"
§4 (INV-12) and §10. Branch aqua/t6b-ship. You own only ts/src/scripts/ship.ts.
Implement Requirements 1-6 using only desk-client functions for discovery and planning.
Run acceptance (a)-(d) on the fixture fork (pnpm -C ts fixture), paste all outputs with the QC checklist,
save this prompt as docs/prompts/T6b.md. Never run against real Sepolia.
```
