---
title: T2 Plan · #34 EnsGate and ENS mocks
notion: https://app.notion.com/p/3e58f1ec11b481f0bdd7e3cf5f5bb9f6
---

# T2 Plan · #34 EnsGate and ENS mocks

## Ready when

T0 merged.

## Branch

`aqua/t2-ensgate`, worktree `../desk-t2`.

## Steps

1. Write the two mocks with NatSpec (Spec 4–5). Checkpoint: a tiny test registers `mm-a.clients.desk.eth` and reads `addr` back through `resolve`.
2. Write `EnsGateArgs` (Spec 2) and the gate vector test. Checkpoint: vector test green.
3. Implement `_ensGate` steps 1–8 (Spec 1). Test through a harness contract that inherits `EnsGate` and exposes `gate(ctxFields, args)`.
4. Write T-G-1..10, one test per bullet in Desk system §10 (the attacker path `mm-a.clients.evil.eth`, the re-pointed `desk.eth`, expiry exactly at `block.timestamp`, an unregistered label).
5. QC gate; PR.

## Commands
```bash
cd contracts && forge test --match-path test/EnsGate.t.sol -vv
forge fmt --check
```

## Risks and fallbacks

- DNS parsing off-by-one: the gate vector and the taker vector in Desk system §9 are the ground truth; test both before step 3.
- If the real ENS semantics look different from the mocks during T2b or T9, report it; do not change the gate to fit a guess.

## Review focus

Order of checks equals Desk system §5.3; `ctx.takerArgs()` cursor unchanged (T-G-10); the resolver check is exact equality; no fallback to a parent resolver.

## Time box

2 hours.

## Agent prompt
```javascript
Read the Notion pages "T2 Spec · #34 EnsGate and ENS mocks", "Desk system" §2.2 (D1, D3, D4),
§5.3, §6, §9, §10 (EnsGate.t.sol), and "Desk security" §4 and §9. Branch aqua/t2-ensgate.
You own only: contracts/src/instructions/EnsGate.sol, contracts/test/EnsGate.t.sol,
contracts/test/mocks/MockEnsRegistry.sol, contracts/test/mocks/MockEnsResolver.sol.
Implement Requirements 1-6 exactly, in the order of the Plan's steps. Keep the error declarations
from T0 unchanged. Assert every revert with its exact selector and arguments.
Run the Acceptance commands, paste output with the QC checklist (Desk testing and quality gates §3), save this prompt as
docs/prompts/T2.md. If the spec is ambiguous anywhere, stop and write BLOCKED with two options.
```
