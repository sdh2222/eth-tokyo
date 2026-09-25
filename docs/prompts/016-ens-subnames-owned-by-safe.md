# 016 prompts

WR-10 disclosure: the prompts that produced the code in the requirement 016 pull request (#19, every desk name owned by the treasury Safe).

## Agent prompt (summary)

The orchestrating session's task prompt, summarized. It came as a follow-up to the requirement 014 task, whose prompt is in `docs/prompts/014-ens-safe-handoff.md`.

```text
Implement requirement 016 (every desk name owned by the treasury Safe), building on the 014 work.
Worktree ~/desk-ens-subnames, branch ens/subname-owner from origin/ens/safe-handoff; the requirement is committed
as 57b01db and PR #19 is open. Read the requirement first. Do not edit requirement files; report problems with
them instead. Do not push or touch GitHub.
What to build (details are your call; justify them in the PR):
1. Reissue in the handoff. While the setup EOA still holds root roles, handle each live subname whose owner is not
   the Safe (clients and agents in D, the live MM names in C, risk in agents). Read its subregistry, resolver and
   expiry; unregister it, then immediately register it again with owner = the Safe, the same subregistry,
   resolver and expiry, and roleBitmap 0. Skip expired names (mm-c) and report them. Revocation waits until the
   re-read chain shows the Safe holds every root role and owns dao-treasury-a and every live subname: extend
   safeGaps. The plan can no longer be fully simulated up front, because a register depends on its unregister;
   handle that explicitly and say how (for example, simulate each register right after its unregister lands).
   The first failure must stop the run before any revocation, with a message saying which name is unregistered.
   On the fork, find out what unregister does to expiry and availability, and whether register right after it
   works in the next transaction.
2. 99-verify --safe also checks the owner of every live subname, plus the expiry, subregistry and resolver you
   can compare.
3. Keyless fork runs (team security SEC-05: coding agents do not receive keys). Copy no .env with keys. Create
   ens/.env with only RPC_URL=http://127.0.0.1:8546. Add an explicit opt-in (e.g. FORK_IMPERSONATE=1): on a local
   RPC only, wallet('TREASURY_PK') and the agent's wallet send as the address recorded in ens/deployments,
   through anvil_impersonateAccount and a JSON-RPC account. With the opt-in on a non-local RPC, refuse before
   anything happens. Safe owners on the fork stay anvil default accounts (public keys, still never printed).
   Re-run 014's three proofs keylessly.
4. README (Korean): update the "Safe 인계" section, including the short unregistered window per name: run it
   before fills go live.
Fork rules as before: port 8546 only, stop only your own PID, never send to real Sepolia, leave ens/deployments
unchanged in commits, record the fork block of the final acceptance run.
Outputs: commits by hyeon-Sec with no AI trailers; this prompt file (WR-10); the PR draft in the 014 draft's
structure with every fork output pasted in; a final report with the commits, the acceptance results and anything
BLOCKED or deviating.
```

## How it was run

- Run on 2026-09-26 by an AI coding agent in a local git worktree (`~/desk-ens-subnames`, branch `ens/subname-owner`).
- No testnet private key was used or present. `ens/.env` held only `RPC_URL=http://127.0.0.1:8546`, and no `*_PK` variable was set. The setup EOA and the risk agent sent through anvil impersonation (`FORK_IMPERSONATE=1`). The fork Safe's owners were anvil's default accounts 1 to 3.
- Every sending command went to an anvil fork of Sepolia on `127.0.0.1:8546`.
- The failure path was tested by injecting one RPC error in-process (a Node `--import` preload that fails the transaction registering `clients` again). The preload is not part of the pull request.
- The orchestrating session pushes the branch and edits the pull request.
- Human review and merge: pending (WR-07).

## Follow-up message from the orchestrating session (2026-09-26)

Relayed mid-task (summary): the risk agent on Sepolia is now the Aqua lane's wallet `0xcCf3e2aD56Af881C13CCEb19Ab6cEbFbDD739899`, holding `desk.spread` and `desk.stats` only; the old test agent lost both roles (switch just after Sepolia block 11780180). `origin/ens/setup` gained `4defc0c` (04-agent by `AGENT_ADDRESS`, `--switch` to change agents) and `c35218e` (deployments record the new agent). Merge `origin/ens/setup` (never rebase) and resolve conflicts. Run the final acceptance on a fork started after the switch, impersonate the recorded agent for the `desk.spread` proof (the old agent's write now reverts, as expected), and check that risk's `addr` is `0xcCf3…` before and after the run.
