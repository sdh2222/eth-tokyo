---
title: T1 Plan · DeskRouter and opcode table
notion: https://app.notion.com/p/3e58f1ec11b481de9290e7c8f2a925ff
---

# T1 Plan · DeskRouter and opcode table

## Ready when

T0 merged.

## Branch

`aqua/t1-router`, worktree `../desk-t1`.

## Steps

1. Copy `AquaOpcodes.sol` to `src/opcodes/DeskOpcodes.sol`; rewrite the imports to `@1inch/swap-vm/...`; change inheritance and the table (Spec 1–2). Checkpoint: `forge build`.
2. Copy `AquaSwapVMRouter.sol` to `src/DeskRouter.sol` (Spec 3). Checkpoint: `forge build --sizes`, read the size.
3. Add the notices and [NOTICE.md](http://NOTICE.md) rows (Spec 4).
4. Write the harness and T-OP-1..3 (Spec 5). Checkpoint: tests green.
5. Open the PR with the QC checklist.

## Commands
```bash
cd contracts && forge build --sizes | grep DeskRouter
forge test --match-path test/OpcodeTable.t.sol -vv
forge inspect DeskRouter storageLayout
```

## Risks and proposed fallbacks

- **Size over 24,576.** Stop and report the size. A human reviewer (proposed) chooses between (a) emptying 10–12 and 14–16 (keeps 13, 20, 33–35) and (b) moving the #35 maths into an external library. Neither is applied without that reviewer's OK; either one needs a CR because it changes Desk system §5.2.
- **Function-type assignment error** (view function into a non-view array): upstream already assigns `internal view` and `internal pure` functions into the non-view array type; follow the same pattern.

## Review focus

Every index in the table against Desk system §5.2 one by one; the array length 37; the test really executes each opcode rather than only reading the array.

## Time box

1 hour.

## Agent prompt
```javascript
Read the Notion pages "T1 Spec · DeskRouter and opcode table" and "Desk system" §5.1, §5.2,
§10 (OpcodeTable.t.sol), §12. Branch aqua/t1-router.
You own only: contracts/src/DeskRouter.sol, contracts/src/opcodes/DeskOpcodes.sol,
contracts/test/OpcodeTable.t.sol, and the NOTICE.md rows for the two derived files.
Implement Requirements 1-6 exactly. Copy from lib/swap-vm (tag v1.0.2); change only what the spec says.
Run the Acceptance commands and paste their output in the PR with the QC checklist (Desk testing and quality gates §3).
If the runtime size is 24,576 bytes or more, stop and report the number; do not shrink anything yourself.
Save this prompt as docs/prompts/T1.md.
```
