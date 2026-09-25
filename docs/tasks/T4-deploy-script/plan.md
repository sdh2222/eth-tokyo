---
title: T4 Plan · Deploy script
notion: https://app.notion.com/p/3e58f1ec11b481b58eb1eee577402a8c
---

# T4 Plan · Deploy script

## Ready when

T1 merged (and T2, T3 merged so the deployed router is the real one).

## Branch

`aqua/t4-deploy`, worktree `../desk-t4`.

## Steps

1. Script with config read and deployments. Checkpoint: dry run (`forge script` without `--broadcast`).
2. Assertions and config write-back. Checkpoint: broadcast on the fork, config diff shows only the five keys.
3. `DEPLOY_MOCKS_ONLY` path. Checkpoint: deploys three contracts.
4. PR with output.

## Commands
```bash
anvil --fork-url $SEPOLIA_RPC_URL --chain-id 11155111 &
cd contracts && DEPLOYER_PK=<anvil key 0> forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
cast call $(jq -r .router ../config/sepolia.json) "AQUA()(address)" --rpc-url http://127.0.0.1:8545
```

## Risks and fallbacks

- `vm.writeJson` with a key path fails on nested keys: write the whole object back via `vm.serialize*` for the `tokens` object only.

## Review focus

Constructor arguments exactly as D12; every address read from config or produced by the script, none hard-coded.

## Time box

45 minutes.

## Agent prompt
```javascript
Read the Notion pages "T4 Spec · Deploy script" and "Desk system" §5.1, §5.5, §8.0, §8.1.
Branch aqua/t4-deploy. You own only contracts/script/Deploy.s.sol. Implement Requirements 1-6.
Run the Acceptance on an anvil Sepolia fork with anvil's key 0, paste output, revert config changes,
save this prompt as docs/prompts/T4.md. Never use a real key.
```
