---
title: T7 Plan · MM bot
notion: https://app.notion.com/p/3e58f1ec11b48178bd57cc6d9402900e
---

# T7 Plan · MM bot

## Ready when

T5b merged (T6a's `_common` helpers on `main`).

## Branch

`aqua/t7-bot`, worktree `../desk-t7`.

## Steps

1. Command skeleton with commander, key selection, config and RPC options. Checkpoint: `--help`.
2. `approve`, `oracle` (with `--price`, `--stale`). Checkpoint: oracle age changes as expected.
3. `quote` with the leg rule and formatting. Checkpoint: equals `priceMirror` on V1.
4. `fill` with slippage, deadline, DeskFill printout.
5. `loop` with `--poke`.
6. Acceptance run; PR.

## Commands
```bash
pnpm -C ts fixture --rpc http://127.0.0.1:8545
pnpm -C ts bot fill --mm mm-a --side buy --weth 1 --config ../config/local.json --rpc http://127.0.0.1:8545
```

## Risks and fallbacks

- Nonce races in `loop` on a fast anvil: wait for each receipt before the next iteration.

## Review focus

The leg rule; exit codes; refusal strings from Desk dictionary.

## Time box

2 hours.

## Agent prompt
```javascript
Read the Notion pages "T7 Spec · MM bot", "Desk system" §4.2, §7.2, §8.4, "Treasury web app" §6 and
"Desk dictionary" §3. Branch aqua/t7-bot. You own only ts/src/bot/{index,commands,format}.ts.
Implement Requirements 1-6; build no calldata yourself; use only desk-client functions.
Run the acceptance list on the fixture fork, paste outputs with the QC checklist, save this prompt as
docs/prompts/T7.md. Anvil keys only.
```
