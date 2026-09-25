# 007 T6a Safe setup script

Source: T6a Spec · Safe setup script (`docs/tasks/T6a-safe-setup-script/spec.md` on the docs branch, not yet on `main`; Notion https://app.notion.com/p/3e58f1ec11b48162a641dc702e1f9e9d). The spec is the requirement. This file restates it for the pull request loop and does not change it. Owner: the ENS lane (team decision 09-25: the lane that creates the Safe and writes `config.safe` is the one that hands the ENS names and roles to it).

## One behavior

On an anvil Sepolia fork, running `pnpm safe:setup --mint` twice leaves exactly one 2-of-3 treasury Safe at a predicted address, written to `config.safe`, with the Safe and each set MM funded with mock tokens once.

## In scope

- `ts/src/scripts/safe-setup.ts` and `ts/src/scripts/_common/{env.ts,clients.ts,log.ts}` (shared later by T6b and T7), built to T6a Spec Requirements 1 to 7:
  1. CLI `pnpm safe:setup [--mint] [--rpc <url>]` with commander. The default RPC is `SEPOLIA_RPC_URL`.
  2. Keys come from `.env` only: `DEPLOYER_PK`, `SAFE_OWNER_1_PK`, `SAFE_OWNER_2_PK`, `SAFE_OWNER_3_PK`. They are never printed or written anywhere.
  3. If `config.safe` is empty, or set but without code on the chain, deploy a Safe with `@safe-global/protocol-kit` 8.0.7 (owners = the three owner addresses, threshold 2, `saltNonce` `"desk-demo-1"`) and write `config.safe`. If it has code, print "Safe exists" and skip.
  4. With `--mint`, the deployer mints `desk.shipWeth` WETH and `desk.shipUsdc` USDC to the Safe, and 100 WETH and 400,000 USDC to each `config.mms[].address` that is set, skipping any mint whose balance already meets the target.
  5. A summary: Safe address, owners, threshold, and the WETH and USDC balances of the Safe and each MM.
  6. Writes to `config/sepolia.json` keep every other key and its order (read, change one key, write with 2-space indentation).
  7. `_common/env.ts` fails fast with a message naming the missing variable.

## Out of scope

- Shipping the strategy (T6b) and the mock and router deploy script (T4).
- Anything on real Sepolia (T9), including creating the real treasury Safe and handing the ENS names and roles to it.
- Dependencies beyond the ones T0 pins.
- A committed change to `config/sepolia.json`: the acceptance run's changes are reverted before committing.

## Acceptance

- [ ] On `anvil --fork-url $SEPOLIA_RPC_URL --chain-id 11155111` with MockWETH and MockUSDC deployed (by T4, or by a throwaway `forge create` until T4 merges), `pnpm -C ts safe:setup --mint --rpc http://127.0.0.1:8545` run twice deploys exactly one Safe, at the same address both times, and the second run mints nothing and prints the same balances. Both outputs are pasted in the PR.
- [ ] The script's own write to `config/sepolia.json` changes only the `safe` value and keeps every other key and its order (diff of the file before and after the first run, pasted in the PR).
- [ ] With one of the four keys missing from `.env`, the script exits non-zero with a message naming that variable.
- [ ] No private key appears in the output or in any committed file, and `pnpm secretlint "**/*"` passes.
- [ ] `make check` exits 0.
