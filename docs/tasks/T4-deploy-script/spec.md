---
title: T4 Spec · Deploy script
notion: https://app.notion.com/p/3e58f1ec11b4818bb754dcfadcf79e57
---

# T4 Spec · Deploy script

## Goal

One Foundry script that deploys the mocks and DeskRouter and records their addresses and the deploy block in the config.

## Source of truth

Desk system §4.1 step 1, §5.1, §5.5, §8.0, §8.1; D12.

## Owns

- `contracts/script/Deploy.s.sol`

## Requirements

1. Reads `config/sepolia.json` (`vm.readFile`, `vm.parseJson`) for `aqua`; reads `DEPLOYER_PK` with `vm.envUint`.
2. Deploys in order: `MockWETH`, `MockUSDC`, `MockOracle(8, 4000e8)`, `DeskRouter(aqua, address(MockWETH), deployer, "DeskRouter", "1.0.2-desk.1")`.
3. Asserts `router.AQUA() == aqua` and `address(router).code.length < 24_576`.
4. Writes `tokens.weth`, `tokens.usdc`, `oracle`, `router` and `deployBlock` (the block of the router deployment) back with `vm.writeJson(value, path, key)`, leaving every other key unchanged.
5. Prints each address and the deploy block.
6. Env flag `DEPLOY_MOCKS_ONLY=1` deploys only the three mocks (used by T6a before T1 merges).

## Acceptance

On an anvil Sepolia fork: `forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast` succeeds; the config holds the new addresses; `cast call <router> "AQUA()(address)"` returns `0x1111113ccf1426a8e30e2bff5e005d929bf6a90a` (unverified). Output pasted in the PR; config changes reverted before commit.

## Out of scope

Verification on Etherscan and the real Sepolia run (the Aqua lane, T9: add `--verify`).
