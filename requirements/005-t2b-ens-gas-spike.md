# 005 T2b · ENS gas spike (fork)

## One behavior

A fork test measures, on real Sepolia ENSv2, the gas of each ENS read the fill path makes, for the demo desk `dao-treasury-a.eth`, and logs each number and the total (T2b Spec; Desk system §5.3 steps 4–8, §5.4 step 6, §13 C3).

## In scope

- `contracts/test/fork/SepoliaEns.fork.t.sol`, test T-F-1 only, exactly as the T2b Spec requires.
- The measured name, named here as the Spec's requirement 3 asks: 2LD `dao-treasury-a.eth` (subregistry and PermissionedResolver set by the ENS lane, PR #1), child label `clients`, and the MM name `mm-a.clients.dao-treasury-a.eth` for the two `resolve` calls. Addresses come from `config/sepolia.json` (C1, PR #5).

## Out of scope

- T-F-2 (T9), any design change based on the numbers, and every file outside the one above.

## Acceptance

- [ ] `SEPOLIA_RPC_URL=<rpc> forge test --match-path test/fork/SepoliaEns.fork.t.sol -vv` (in `contracts/`) is green and logs every call's gas and the total.
- [ ] Without `SEPOLIA_RPC_URL` the test is skipped and `make check` stays green.
- [ ] The PR description has a table: call · gas, and the total.
