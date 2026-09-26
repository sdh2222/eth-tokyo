# 014 ENS names and roles handed to the treasury Safe

Source: Desk system §6.3 ("The Safe holds all root roles and their admins") and §6.1 (the treasury owns every name), on the docs branch `claude/sleepy-ritchie-5lp65m`; team decision 09-25 (the ENS lane creates the Safe and hands the names and roles to it). Today the setup EOA (`TREASURY_PK`) holds everything that `ens/scripts/01`–`04` created.

## One behavior

After `npm run handoff -- --safe <safe> --execute`, the treasury Safe controls every ENS piece the desk depends on. It owns `dao-treasury-a.eth` in the ETHRegistry and holds all root roles and their admins on resolver R and on registries D, C and agents. The setup EOA holds no root role on any of them, and the router's reads are unchanged.

## In scope

- `ens/scripts/06-handoff.ts` (plus small helpers under `ens/src/`), sent from the setup EOA:
  1. `grantRootRoles(RESOLVER_ROOT_ALL, safe)` on R, and `grantRootRoles(REGISTRY_ROOT_ALL, safe)` on D, C and agents.
  2. Transfer `dao-treasury-a` in the ETHRegistry to the Safe. The registry moves the token's roles with it.
  3. `revokeRootRoles` of everything the EOA holds on R, D, C and agents, only after steps 1 and 2 succeeded.
  - Dry run by default: print the planned calls and send nothing. `--execute` sends.
  - `--execute` refuses to send to a non-local RPC unless `--sepolia` is also given.
  - Idempotent: after a completed handoff, a re-run sends nothing.
- A fork harness that deploys a 2-of-3 Safe with `@safe-global/protocol-kit` 8.0.7 (the pin T0 uses), runs the handoff, and proves control with a Safe transaction.
- Handoff checks in `npm run verify` when a Safe address is given, and a README section.

## Out of scope

- Running the handoff on real Sepolia. That needs the real Safe (T6a) and the team's call on who holds the owner keys.
- Changing what `ownerOf` reports for subnames registered with no token roles (`clients`, `mm-a`, `mm-b`, `mm-c`, `risk`). The root roles already give the Safe full control of them. The PR reports what the registry allows.
- Running later ENS operations (re-arming `mm-c`, repointing `addr`) through the Safe. That is the next requirement.

## Acceptance

All on `anvil --fork-url <Sepolia RPC> --chain-id 11155111 --port 8546`, with `RPC_URL` pointing at the fork.

- [ ] Before the handoff, `npm run verify` passes.
- [ ] `npm run handoff -- --safe <fork Safe>` without `--execute` prints the planned calls and sends nothing.
- [ ] After `--execute`, all of these hold:
  - `roles(0, safe)` is `RESOLVER_ROOT_ALL` on R and `REGISTRY_ROOT_ALL` on D, C and agents.
  - `roles(0, eoa)` is 0 on all four.
  - The ETHRegistry reports the Safe as the owner of `dao-treasury-a`.
- [ ] A second `--execute` run sends no transaction.
- [ ] After the handoff:
  - The EOA's `R.setData(mm-a, "desk.terms", …)` reverts.
  - A 2-of-3 Safe transaction (owners 1 and 2 sign, owner 1 executes) that sets mm-a's `desk.terms` succeeds.
  - The risk agent's `desk.spread` write still succeeds.
- [ ] `npm run verify` still passes after the handoff.
- [ ] With `RPC_URL` set to a non-local URL and no `--sepolia`, `--execute` refuses before sending anything.
- [ ] No private key is printed or committed, and fork runs leave `ens/deployments/` unchanged.
