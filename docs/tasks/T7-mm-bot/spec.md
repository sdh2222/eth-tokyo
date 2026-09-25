---
title: T7 Spec · MM bot
notion: https://app.notion.com/p/3e58f1ec11b481aba76aeef30ecb0054
---

# T7 Spec · MM bot

## Goal

A command-line market maker for rehearsal, the e2e runner and the stage fallback (Demo run §5): approve, refresh the oracle, quote, fill, loop.

## Source of truth

Desk system §4.2, §7.2 (`findLiveStrategy`, `quoteFor`, `buildSwapTx`, `planMmApprovals`, `decodeDeskError`), §8.4 (commands and the leg rule); Desk dictionary §3.

## Owns

- `ts/src/bot/{index,commands,format}.ts`

## Requirements

1. `pnpm bot <command> --mm <mm-a|mm-b|...> [--rpc url] [--config path]`; the key is `MM_<X>_PK` from the name (`mm-a` → `MM_A_PK`). `oracle` uses `DEPLOYER_PK`.
2. Commands and flags exactly as Desk system §8.4: `approve`, `oracle [--price <usd>] [--stale]`, `quote --side buy|sell (--weth x | --usdc x)`, `fill … [--slippage-bps 10]`, `loop --interval 30 [--weth 0.25] [--poke]`. `--stale` sets `updatedAt` to now − 2 h (demo tool parity with Treasury web app §5.10).
3. The leg rule table in Desk system §8.4 decides exactIn/exactOut; exactly one of `--weth` / `--usdc` is required.
4. Output formatting with the rules of Treasury web app §6 (4 decimals WETH, 2 decimals USDC, bps with %). A refusal prints `✖ <title> — <hint>` from `decodeDeskError`, exit code 1; a system error exits 2.
5. After a fill, print the decoded `DeskFill` (spread, source, mid, share before) and the explorer link from `cfg.explorer`.
6. No calldata built in the bot; everything through the desk client.

## Acceptance (on the fixture fork)

- `approve --mm mm-b` then `fill --mm mm-b --side buy --weth 1` succeeds and the printed amounts equal `priceMirror`.
- `fill --mm mm-a --side sell --weth 0.5` and `fill --mm mm-a --side buy --usdc 1000` succeed.
- With mm-b's key but `--name mm-a.clients.dao-treasury-a.eth` (a debug flag that overrides the name sent) the quote prints `✖ This wallet isn't on the desk's list — …`.
- `oracle --stale` then `quote` prints the stale title; `oracle` then `quote` succeeds.
- `loop --interval 5 --weth 0.1` runs three iterations without error (stop with Ctrl-C).

## Out of scope

Any pricing logic of its own.
