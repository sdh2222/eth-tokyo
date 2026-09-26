# 017 T9 Sepolia deploy: mocks, oracle and DeskRouter

Source: Desk system §4.1 step 1 and §8.1 (`contracts/script/Deploy.s.sol`), part of T9 Sepolia bring-up (Aqua lane), on the docs branch `claude/sleepy-ritchie-5lp65m`. The deploy key `DEPLOYER_PK` is the ENS lane's setup EOA `0xf9007Ff12d8dC255eFD217911e9EB5A37D26D7e7`. So on 2026-09-26, at the Aqua lane's request, the ENS lane ran the broadcast on its own machine. No key crossed lanes.

## One behavior

`config/sepolia.json` points at the live Sepolia MockWETH, MockUSDC, MockOracle and DeskRouter that `Deploy.s.sol` deployed. `deployBlock` is at or before the router's deployment block, and every other value is unchanged.

## In scope

- `config/sepolia.json` as `Deploy.s.sol` wrote it with `vm.writeJson`: `tokens.weth`, `tokens.usdc`, `oracle`, `router` and `deployBlock`.
- Foundry rewrites the whole file with 2-space indentation and the same key order. This commit is the one-time layout change the team planned for after T6a.

## Out of scope

- Minting to the Safe and the MMs (`safe:setup --mint`), and shipping the desk (Safe owners 1 and 2).
- Source verification on Etherscan. That needs an Etherscan API key, not the deployer key.
- Committing `contracts/broadcast/`.

## Acceptance

- [ ] Each of the four addresses has code on Sepolia.
- [ ] `DeskRouter.AQUA()` is the config's `aqua`, and the router's runtime code is under 24,576 bytes.
- [ ] MockOracle reports 8 decimals and an answer of 4000e8. MockWETH has 18 decimals and MockUSDC has 6.
- [ ] `deployBlock` (11784705) is not after the router's deployment block (11784710).
- [ ] Parsing the old and the new config shows that only `tokens`, `oracle`, `router` and `deployBlock` changed, with the same key order.
