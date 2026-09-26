# 004 C1: ENS addresses in config/sepolia.json

## One behavior

`config/sepolia.json` carries the live ENS addresses for `dao-treasury-a.eth` and the MM addresses, so the router, the scripts and the tests read them from the one source of addresses (Desk system §6.5, §8.0, §13 C1).

## In scope

- The values of `ens.ethRegistry`, `ens.deskRegistry`, `ens.clientsRegistry`, `ens.resolver` and `ens.universalResolver`, and the `address` of each entry in `mms`. `ens.suffix` is unchanged.

## Out of scope

- Every other key, the schema, and any code.

## Acceptance

- [ ] `python3 -m json.tool config/sepolia.json` parses.
- [ ] Every `ens` address has code on Sepolia: `cast code <address> --rpc-url $SEPOLIA_RPC_URL` is not `0x`.
- [ ] `cast call <ens.clientsRegistry> "getResolver(string)(address)" mm-a --rpc-url $SEPOLIA_RPC_URL` returns `ens.resolver`.
- [ ] `cd ens && npm run verify` on branch `ens/setup` passes against the same addresses.
