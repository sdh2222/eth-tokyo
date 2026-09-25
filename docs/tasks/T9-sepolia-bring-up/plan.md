---
title: T9 Plan · Sepolia bring-up
notion: https://app.notion.com/p/3e58f1ec11b48146a60ecfe2925f2c16
---

# T9 Plan · Sepolia bring-up

## Ready when

All Aqua tasks merged, Q-E2E-1..7 green on the fork (T8b), the web app's P1, P2, P4 and O1 working on the fork, and the ENS lane ready with names and records.

## Steps (each is a checkbox; confirm before the next)

- [ ]
	1. **Config.** Fill ENS addresses (C1, C2, C5 results) and the ENS lane's addresses. Commit.
- [ ]
	1. **Deploy.** `cd contracts && forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify`. Check `cast call <router> "AQUA()(address)"`. Log the addresses and deploy block. (Q-S-1)
- [ ]
	1. **Safe.** `pnpm -C ts safe:setup --mint`. Check owners, threshold, balances.
- [ ]
	1. **ENS checks** (read-only, mirror of #34 steps 4–8 and #35 step 6). Ask the ENS lane to confirm, then verify with `cast`:
```bash
cast call $ETH_REG "getSubregistry(string)(address)" desk          # == deskRegistry
cast call $DESK_REG "getSubregistry(string)(address)" clients     # == clientsRegistry
cast call $CLIENTS_REG "getExpiry(uint256)(uint64)" $(cast keccak mm-a)   # > now
cast call $CLIENTS_REG "getResolver(string)(address)" mm-a       # == resolver
```
then `pnpm -C ts bot quote --mm mm-a --side buy --weth 1` once a desk is live. (Q-S-2)

- [ ]
	1. **Agent role limits.** From the agent key: `setData(mm-a, "desk.terms", …)` and `setAddress(mm-a, 60, …)` must both revert `EACUnauthorizedAccountRoles`; `setData(mm-a, "desk.spread", encodeSpread(40, now+3600))` must succeed. (Q-S-6)
- [ ]
	1. **Open the desk from the web app** with Owner 1 and Owner 2 (O1). Check the `Shipped` log and `safeBalances`. (Q-S-4)
- [ ]
	1. **Fills from the Trade page**: mm-a buys 10 WETH, sells 5 WETH. Verify both on P6. (Q-S-5)
- [ ]
	1. **Refusals**: Demo tools → Make price stale → quote refused → Refresh; outsider quote refused; mm-c refused. (Q-S-7)
- [ ]
	1. **Stop and reopen**: Controls → Stop the desk; then Controls → Change → new salt. (Q-S-8)
- [ ]
	1. **T-F-2** green: `SEPOLIA_RPC_URL=… forge test --match-path test/fork/SepoliaEns.fork.t.sol`. (Q-S-3)
- [ ]
	1. **Rehearsal** Q-D-1 on Sepolia, timed.
- [ ]
	1. **Reset for the demo**: `pnpm -C ts ship --dock --no-ship`; oracle refresh; check Demo run §3.

## Risks and fallbacks

- ENS lane late: steps 2, 3, 6 (with a temporary desk using the fork-tested config) can proceed; step 4 onward waits. Tell the team at H12 if names are not ready; the demo then runs on the anvil fork with mocks (proposed fallback, Aqua lane working rules), and says so honestly.
- Etherscan verification fails: retry with `forge verify-contract` and the exact compiler settings; not a blocker for the demo.
- Sepolia congestion: raise the priority fee in MetaMask; do not reduce steps.

## Time box

3 hours, starting no later than H14.

## Assistant prompt (read-only helper)
```javascript
You assist the Aqua lane's human operator with the Sepolia bring-up. Read the Notion pages "T9 Spec · Sepolia bring-up",
"T9 Plan", "Desk testing and quality gates" §2.4 and "Demo run" §3. Walk through the Plan's checklist one item
at a time; for each item, prepare the exact read-only commands, check the outputs the operator pastes against the
expected values, and append the result to docs/demo-log.md. Never ask for, receive or use a private key.
You own only docs/demo-log.md and T-F-2 in contracts/test/fork/SepoliaEns.fork.t.sol.
```
