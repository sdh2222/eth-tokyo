---
title: T6a Spec · Safe setup script
notion: https://app.notion.com/p/3e58f1ec11b48162a641dc702e1f9e9d
---

# T6a Spec · Safe setup script

## Goal

One command that creates the treasury Safe (2-of-3, proposed) and funds it and the MMs with mock tokens, safely re-runnable.

## Source of truth

Desk system §2.2 D11, §4.1 steps 2 and 5, §8.0, §8.2. Desk security §7 (keys).

## Owns

- `ts/src/scripts/safe-setup.ts`
- `ts/src/scripts/_common/{env.ts,clients.ts,log.ts}` (shared by T6b and T7: `.env` loading, viem wallet/public clients per key name, human-readable logging)

## Requirements

1. CLI: `pnpm safe:setup [--mint] [--rpc <url>]` (commander). Default RPC from `SEPOLIA_RPC_URL`.
2. Keys from `.env` only: `DEPLOYER_PK`, `SAFE_OWNER_1_PK..3`. Never printed, never written anywhere.
3. If `config.safe` is empty, or set but has no code on the chain: deploy a Safe with `@safe-global/protocol-kit` 8.0.7 (`owners` = the three owner addresses, `threshold` = 2, a fixed `saltNonce` = `"desk-demo-1"` so re-runs predict the same address), then write `config.safe`. If it has code, skip and print "Safe exists".
4. With `--mint`, the deployer calls `mint` on MockWETH and MockUSDC: `shipWeth` and `shipUsdc` to the Safe, plus 100 WETH and 400,000 USDC to each `config.mms[].address` that is set. Skip a mint if the balance already meets the target.
5. Print a summary: Safe address, owners, threshold, WETH and USDC balances for the Safe and each MM.
6. Writes to `config/sepolia.json` keep every other key and its order (read, change one key, write pretty with 2 spaces).
7. `_common/env.ts` fails fast with a clear message naming a missing variable.

## Security

SEC-01 to SEC-05. Anvil default keys in tests only.

## Acceptance

On `anvil --fork-url $SEPOLIA_RPC_URL --chain-id 11155111` after T4 deployed the mocks there: running `safe:setup --mint` twice deploys exactly one Safe (same address), second run mints nothing and prints the same balances. Output pasted in the PR.

## Out of scope

Shipping (T6b); anything on real Sepolia (the Aqua lane, T9).
