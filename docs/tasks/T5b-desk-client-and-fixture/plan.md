---
title: T5b Plan · Desk client and fixture
notion: https://app.notion.com/p/3e58f1ec11b481aeab7ced85dd3670e4
---

# T5b Plan · Desk client and fixture

## Ready when

T4 and T5 merged; T2's ENS mocks on `main`.

## Branch

`aqua/t5b-client`, worktree `../desk-t5b`.

## Steps

1. `gen:abi` and the generated ABIs. Checkpoint: typecheck.
2. `fixture.ts` + `deploy-local.ts` (Spec 9). Checkpoint: fixture prints the role table and a live strategy hash.
3. `strategies.ts` + T-TS-5 (ship, dock, dock+ship, two live, multi-chunk scan with `logChunk = 5`).
4. `program.ts` (decode/describe) + T-TS-6.
5. `plans.ts` (ship, dock, multisend, mm approvals, set terms, cut off) + T-TS-7.
6. `state.ts` + T-TS-8 (each MM status against the router's real `quote`).
7. `quote.ts` + T-TS-9; `fills.ts` + `verify.ts` + T-TS-10 (including a V4-size fill); `errors.ts` + T-TS-11.
8. Build-output scan test (no Node imports in `dist/lib`); QC gate; review agent; PR.

## Commands
```bash
anvil --fork-url $SEPOLIA_RPC_URL --chain-id 11155111 &
pnpm -C ts gen:abi && pnpm -C ts fixture --rpc http://127.0.0.1:8545
pnpm -C ts test && pnpm -C ts build
```

## Risks and fallbacks

- Public RPC limits `eth_getLogs` ranges: `logChunk` is config; the fork has no limit, Sepolia uses 50,000 (Desk system §8.0). If the Aqua lane's RPC allows less, the Aqua lane lowers it in config.
- Safe transaction on the fork in the fixture: use protocol-kit with anvil owners 1 and 2, same as T6b.

## Review focus

`readDeskState` status logic equals the contract's (T-TS-8 is the proof); error strings exactly as Desk dictionary; nothing writes to the chain.

## Time box

3.5 hours.

## Agent prompt
```javascript
Read the Notion pages "T5b Spec · Desk client and fixture", "Desk system" §4, §5.3, §5.4, §7.2
(including planSetTerms/planCutOff), §8.3, §10 (T-TS-5..11), "Desk testing and quality gates" §2.1, and
"Desk dictionary" §3. Branch aqua/t5b-client. You own only the files under "Owns" in the T5b Spec.
Implement Requirements 1-10 in the Plan's order. Function names, parameters and return types must match
Desk system §7.2 exactly; error titles and hints must match Desk dictionary §3 character for character.
No Node APIs in ts/src/lib/client. Anvil default keys only. Paste the fixture output and test output with
the QC checklist; save this prompt as docs/prompts/T5b.md.
```
