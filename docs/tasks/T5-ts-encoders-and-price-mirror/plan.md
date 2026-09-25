---
title: T5 Plan · TS encoders and price mirror
notion: https://app.notion.com/p/3e58f1ec11b4810e838bd0638d4a9327
---

# T5 Plan · TS encoders and price mirror

## Ready when

T0 merged.

## Branch

`aqua/t5-tslib`, worktree `../desk-t5`.

## Steps

1. `config.ts` with a fixture config using the §9 placeholder addresses. Checkpoint: typecheck.
2. `encode.ts` + T-TS-1 for suffix, gate, price, taker, terms. Checkpoint: green.
3. `opcodes.ts` + `program.ts` + the program vector test and the index test. Checkpoint: green.
4. `taker.ts` + T-TS-3.
5. `price.ts` + T-TS-2 (V1–V3 first, then V4). Checkpoint: every amount matches.
6. `events.ts` (ABI from Desk system §5.4) with a decode test on a hand-built log.
7. QC gate, PR.

## Commands
```bash
pnpm -C ts test && pnpm -C ts typecheck && pnpm -C ts lint
```

## Risks and fallbacks

- The SDK's `ProgramBuilder` rejects custom opcodes: build the program bytes by hand (`opcode, len, args`) in `program.ts` and keep using the SDK only for `Order` and `TakerTraits` (proposed fallback; note it in the PR).
- A §9 amount does not match: compare step values with the Python reference in Desk system §9.1; do not edit the vector.

## Review focus

Rounding direction in each formula; no `number` for token amounts; program bytes equal the vector.

## Time box

2.5 hours.

## Agent prompt
```javascript
Read the Notion pages "T5 Spec · TS encoders and price mirror" and "Desk system" §5.3, §5.4,
§7.1, §8.0, §9 (with the Python reference in §9.1) and §10 (T-TS-1..4). Branch aqua/t5-tslib.
You own only ts/src/lib/{config,encode,opcodes,program,taker,price,events,index}.ts and
ts/test/lib/*.test.ts. Implement Requirements 1-9 exactly with the pinned packages from T0; add no
dependency. Every number in Desk system §9 must be a literal in a test. No Node-only APIs in ts/src/lib.
Paste test output with the QC checklist (Desk testing and quality gates §3) and save this prompt as docs/prompts/T5.md.
```
