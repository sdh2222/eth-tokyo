# 008 Deploy script

## One behavior

One Foundry script deploys the mocks and DeskRouter and records their addresses and the deploy block in `config/sepolia.json`.

## In scope

- `contracts/script/Deploy.s.sol`.
- The ENS addresses already written on #5, copied so this script reads the same file.

## Out of scope

- Etherscan verification and the Sepolia broadcast. Those are T9.

## Acceptance

- [ ] On an anvil node, `forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast` succeeds.
- [ ] The config holds the new token, oracle, and router addresses and the router deploy block.
- [ ] `cast call <router> "AQUA()(address)"` returns `0x1111113ccf1426a8e30e2bff5e005d929bf6a90a`.
- [ ] The config change from the broadcast is reverted before the commit.
