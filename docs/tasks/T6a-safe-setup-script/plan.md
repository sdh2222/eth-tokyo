---
title: T6a Plan · Safe setup script
notion: https://app.notion.com/p/3e58f1ec11b48180a385c7a248b2772e
---

# T6a Plan · Safe setup script

## Ready when

T0 merged. For the acceptance run, T4 must be merged too (mocks deployed on the fork); until then, test against mocks deployed by a throwaway `forge create` on anvil.

## Branch

`aqua/t6a-safe`, worktree `../desk-t6a`.

## Steps

1. `_common/env.ts`, `clients.ts`, `log.ts`. Checkpoint: typecheck.
2. Safe deploy with protocol-kit (predicted address, idempotent). Checkpoint: two runs, one Safe.
3. Mint logic with balance checks. Checkpoint: second run mints nothing.
4. Config write that preserves other keys. Checkpoint: `git diff config/` shows only `safe`.
5. Revert the config change before committing; PR with the run output.

## Commands
```bash
anvil --fork-url $SEPOLIA_RPC_URL --chain-id 11155111 &
pnpm -C ts safe:setup --mint --rpc http://127.0.0.1:8545
pnpm -C ts safe:setup --mint --rpc http://127.0.0.1:8545
```

## Risks and fallbacks

- protocol-kit cannot find Safe contracts on the fork: it uses the canonical Safe v1.4.1 deployments, which exist on Sepolia (unverified) and therefore on the fork; on a plain anvil (31337) they do not, so always use the fork.

## Review focus

No key logged; idempotency; config written without reordering.

## Time box

1 hour.

## Agent prompt
```javascript
Read the Notion pages "T6a Spec · Safe setup script", "Desk system" §4.1, §8.0, §8.2 and
"Desk security" §7. Branch aqua/t6a-safe. You own only ts/src/scripts/safe-setup.ts and
ts/src/scripts/_common/{env,clients,log}.ts. Implement Requirements 1-7 with the pinned packages.
Never print or write a private key. Run the acceptance on an anvil Sepolia fork (anvil default keys
in .env), paste both runs' output, revert config changes before committing, save this prompt as
docs/prompts/T6a.md. Do not run anything against real Sepolia.
```
