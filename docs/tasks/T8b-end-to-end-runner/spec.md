---
title: T8b Spec · End-to-end runner
notion: https://app.notion.com/p/3e58f1ec11b481daa33be2d2799f0f09
---

# T8b Spec · End-to-end runner

## Goal

One command that runs the whole lane end to end on an anvil Sepolia fork and proves Q-E2E-1..7, so every later change can be re-checked in minutes and T9 starts from known-good code.

## Source of truth

Desk testing and quality gates §2.1 (fixture), §2.2 (Q-E2E-1..7 steps and expected results); Desk system §4.3, §8.3, §8.4; Desk security INV-3, INV-7, INV-8, INV-12.

## Owns

- `ts/src/dev/e2e.ts` (package script `e2e`)

## Requirements

1. `pnpm -C ts e2e --rpc <fork url>` starts from a fresh fork state: it calls the fixture (T5b) itself, then runs Q-E2E-1..7 in order, each as a named step.
2. Every step drives the system only through the real entry points: `forge script` (T4), `safe:setup` (T6a), `ship` (T6b) and `bot` (T7) as subprocesses, and desk-client reads for assertions. No direct contract calls except the agent's `setData` in Q-E2E-7 (via viem with anvil account 4, the fixture's agent) and `evm_increaseTime` where a case needs time to pass.
3. Each step asserts the exact expected result from Desk testing and quality gates §2.2 (amounts compared to `priceMirror`, error codes compared by name) and prints `PASS Q-E2E-n` or `FAIL Q-E2E-n: <expected> vs <actual>`.
4. Exit code 0 only if all seven pass. Total run time under 5 minutes on a laptop.
5. Scope of Q-E2E-7 on the fork: the ENS mock resolver has no role system, so Q-E2E-7 checks only how the router handles the agent's values (clamp and malformed fallback). That the agent can write nothing else (INV-9) is proven on real ENS in Q-S-6.

## Acceptance

`pnpm -C ts e2e --rpc http://127.0.0.1:8545` prints seven PASS lines and exits 0; output pasted in the PR.

## Out of scope

Web QA (the web app lane, Desk testing and quality gates §2.3); Sepolia (T9).
