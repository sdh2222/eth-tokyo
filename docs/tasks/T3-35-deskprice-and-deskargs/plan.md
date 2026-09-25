---
title: T3 Plan · #35 DeskPrice and DeskArgs
notion: https://app.notion.com/p/3e58f1ec11b4819ba53ece74ab8f0a8d
---

# T3 Plan · #35 DeskPrice and DeskArgs

## Ready when

T0 merged. Start T3 first in wave 1: it is on the critical path.

## Branch

`aqua/t3-deskprice`, worktree `../desk-t3`.

## Who writes what

- **Agent:** `DeskArgs`, steps 1–7 and 8–12, T-P-1..T-P-9.
- **A human in the Aqua lane, by hand (proposed):** step 7b (size floor) and T-P-10, in a separate commit on the same branch. This is the most novel logic and the part judges are likely to ask about; it also keeps a meaningful human contribution in the history (Aqua lane working rules WR-10 to WR-12).

## Steps

1. Agent: `DeskArgs` + vector tests for `price`, `taker`, `program`. Checkpoint: vectors green.
2. Agent: steps 1–6 with their revert tests (T-P-3, T-P-4, T-P-6, T-P-7). Checkpoint: green.
3. Agent: steps 7, 8, 9, 10, 11, 12 with `s = sPolicy` temporarily (marked `// 7b: human`). T-P-1 (V1–V3), T-P-2, T-P-5, T-P-8, T-P-9. Checkpoint: every V1–V3 number matches.
4. Human (proposed): step 7b and T-P-10 (V4 plus the round-trip fuzz). Checkpoint: V4 matches; fuzz green; V1–V3 still green (their floor stays below 10 bps).
5. QC gate, review agent, PR.

## Commands
```bash
cd contracts && forge test --match-path test/DeskPrice.t.sol -vv --fuzz-runs 512
```

## Risks and fallbacks

- A §9 number is not reproduced: stop. The Python reference in Desk system §9.1 is the arbiter; compare step by step (w, skew, r, ask/bid, amount). Never change a vector to match the code.
- Signed division: Solidity truncates toward zero; the reference uses the same rule (`tdiv`). Test a negative-skew case (V3).
- Stack too deep under via-IR: split into internal functions per step; do not change behaviour.

## Review focus

Rounding direction in all four amount formulas; no `abi.decode` on record values; the emit guard; step order equals the spec.

## Time box

3 hours (agent 2 h, human 1 h; proposed split).

## Agent prompt
```javascript
Read the Notion pages "T3 Spec · #35 DeskPrice and DeskArgs", "Desk system" §2.2 (D1, D5-D7, D13,
D14, D16), §5.4, §9 (including the Python reference in §9.1), §10 (DeskPrice.t.sol), and
"Desk security" §4 and §9. Branch aqua/t3-deskprice.
You own only: contracts/src/instructions/DeskPrice.sol, contracts/src/libs/DeskArgs.sol,
contracts/test/DeskPrice.t.sol (and PriceTestResolver.sol only if T2's MockEnsResolver is not on main).
Do Plan steps 1-3 only. Leave step 7b as `uint256 s = sPolicy; // 7b: human` and do not write T-P-10:
a human in the Aqua lane writes those by hand. Every number in Desk system §9 must appear in a test as a literal.
If any number cannot be reproduced, stop and show the step where your value diverges from the Python
reference. Paste test output with the QC checklist and save this prompt as docs/prompts/T3.md.
```
