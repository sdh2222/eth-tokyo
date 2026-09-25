---
title: T2b Plan · ENS gas spike (fork)
notion: https://app.notion.com/p/3e58f1ec11b4813a840eedadb2729796
---

# T2b Plan · ENS gas spike (fork)

## Ready when

T0 merged; the Aqua lane has filled `ens.ethRegistry` in the config (C1) and the page Owner has named the 2LD to measure.

## Branch

`aqua/t2b-ens-gas`, worktree `../desk-t2b`.

## Steps

1. Write the skip guard and config reading. Checkpoint: skipped without the env var.
2. Add the five measurements. Checkpoint: green on the fork.
3. Post the gas table in the PR.

## Commands
```bash
cd contracts && SEPOLIA_RPC_URL=$SEPOLIA_RPC_URL forge test --match-path test/fork/SepoliaEns.fork.t.sol -vv
```

## Proposed response to the number (Desk system §13 C3)

- Reads total ≤ 250k: nothing changes.
- Reads total \> 250k: nothing changes in the design either; the Aqua lane notes the number in the README and the pitch Q&A (Demo run §9). Sepolia gas is only a demo cost.
- A call reverts that the spec assumes works: S1 bug; stop and tell the page Owner with the revert data. The ENS read path in Desk system is then re-checked before T2 merges.

## Review focus

That each delta measures exactly one call; that addresses come from config, not literals.

## Time box

45 minutes.

## Agent prompt
```javascript
Read the Notion pages "T2b Spec · ENS gas spike (fork)" and "Desk system" §5.3, §5.4 step 6,
§6.4, §13. Branch aqua/t2b-ens-gas. You own only contracts/test/fork/SepoliaEns.fork.t.sol.
Implement Requirements 1-5. Use the 2LD name the page Owner gives you: <NAME>. Do not guess a name.
Run against a Sepolia fork, paste the per-call gas table and total into the PR with the QC checklist,
and save this prompt as docs/prompts/T2b.md. If any call reverts, stop and report the revert data.
```
