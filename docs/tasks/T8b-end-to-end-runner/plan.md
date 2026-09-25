---
title: T8b Plan · End-to-end runner
notion: https://app.notion.com/p/3e58f1ec11b481afbcebcbf6aa08e21b
---

# T8b Plan · End-to-end runner

## Ready when

T4, T5b, T6a, T6b, T7 merged.

## Branch

`aqua/t8b-e2e`, worktree `../desk-t8b`.

## Steps

1. Runner skeleton: fork check (chain id 11155111), fixture call, step runner with PASS/FAIL output.
2. Q-E2E-1 (fills and deltas). Checkpoint: PASS.
3. Q-E2E-2..4 (stale, refusals, cap).
4. Q-E2E-5, 6 (re-ship with a new policy, stop).
5. Q-E2E-7 (agent spread clamp and malformed fallback).
6. Time the full run; PR.

## Commands
```bash
anvil --fork-url $SEPOLIA_RPC_URL --chain-id 11155111 &
pnpm -C ts e2e --rpc http://127.0.0.1:8545
```

## Risks and fallbacks

- A step fails because of the code under test: that is the point. File a Bug row (Type Bug, severity per Desk testing and quality gates §5, Case ID Q-E2E-n) and assign it to the owning task; do not patch other tasks' files here.

## Review focus

Assertions are exact (not "no error"); every entry point is the real one.

## Time box

2 hours.

## Agent prompt
```javascript
Read the Notion pages "T8b Spec · End-to-end runner", "Desk testing and quality gates" §2.1 and §2.2, "Desk system"
§4.3, §8.3, §8.4. Branch aqua/t8b-e2e. You own only ts/src/dev/e2e.ts.
Implement Requirements 1-5. Drive the system only through its real entry points as subprocesses and
assert exact expected results. If a step fails because of another task's code, stop and report it as a
bug with the case ID; do not edit other files. Paste the full run with the QC checklist and save this
prompt as docs/prompts/T8b.md.
```
