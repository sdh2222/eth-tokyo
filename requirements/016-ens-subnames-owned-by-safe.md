# 016 Every desk name owned by the treasury Safe

Source: Desk system §6.1 (the treasury owns every name) and the ENS lane's decision 1 (the treasury owns all names, MMs own none), on the docs branch `claude/sleepy-ritchie-5lp65m`. Follows requirement 014. That handoff moves all control to the Safe, but `ownerOf` of the subnames stays with the setup EOA. The fork run in PR #17 showed why: the subnames were registered with roleBitmap 0, so no registry path can transfer them (`TransferUnsafeUntilRegistryIsEmancipated`, `TransferDisallowed`, `EACCannotGrantRoles`). While the EOA still holds root roles, it can unregister each name and register it again with the Safe as owner.

## One behavior

After `npm run handoff -- --safe <safe> --execute`, the registries report the treasury Safe as the owner of every live desk name: `dao-treasury-a.eth` in the ETHRegistry, `clients` and `agents` in D, each live MM name in C, and `risk` in agents. Each name keeps its expiry, subregistry, resolver and records.

## In scope

- The handoff (`ens/src/handoff.ts`, `ens/scripts/06-handoff.ts`) reissues each live subname whose owner is not the Safe. It sends `unregister`, then `register` with owner = the Safe, the same subregistry, resolver and expiry, and roleBitmap 0 as today. This happens while the setup EOA still holds root roles; revocation waits until every live subname is owned by the Safe.
- Expired names (mm-c today) are skipped and reported. The Safe registers them itself when it re-arms them.
- `npm run verify -- --safe <safe>` also checks the owner of every live subname.
- Fork runs need no testnet key. On a local RPC only, with an explicit opt-in, the scripts send as the recorded address through `anvil_impersonateAccount` (team security SEC-05: coding agents do not receive keys).
- README.

## Out of scope

- Running it on real Sepolia. That happens with the real Safe, as part of the real handoff.
- Re-arming mm-c, and giving the Safe token-level roles or making the subnames transferable.

## Acceptance

All on `anvil --fork-url <Sepolia RPC> --chain-id 11155111 --port 8546`, with no testnet private key anywhere in the environment.

- [ ] The dry run lists, for each live subname, an `unregister` and a `register` with owner = the Safe, and lists them before the revocations. It sends nothing.
- [ ] After `--execute`, the Safe is the owner of `dao-treasury-a`, `clients`, `agents`, `mm-a`, `mm-b` and `risk`. Each name's expiry, subregistry and resolver equal their values before the run. The `addr` and `desk.terms` of mm-a and mm-b and the `addr` of `risk` are unchanged.
- [ ] Everything requirement 014 checks still holds: the Safe's roles, the EOA's roles at 0, and the three post-handoff proofs. `npm run verify -- --safe <Safe>` passes.
- [ ] A second `--execute` sends nothing.
- [ ] Impersonation refuses to run on a non-local RPC.
- [ ] No private key is printed or committed, and fork runs leave `ens/deployments/` unchanged.
