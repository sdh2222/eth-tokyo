# 014 prompts

WR-10 disclosure: the prompts that produced the code in the requirement 014 pull request (#17, ENS names and roles handed to the treasury Safe).

## Agent prompt (summary)

The orchestrating session's task prompt, summarized. The full prompt also listed verified facts (contract addresses, `isEmancipated()` per registry, the grants each contract was initialized with, the transfer rules of the deployed `PermissionedRegistry`); the PR description restates the ones the code relies on, with sources.

```text
Implement requirement 014 (ENS names and roles handed to the treasury Safe) for the ENS lane, only in the worktree
~/desk-ens-handoff, branch ens/safe-handoff (stacked on ens/setup; PR #17 holds the requirement commit).
Read first: requirements/014-ens-safe-handoff.md; the ens package (README and its "배포본 기준 사실" table, which
beats contracts-v2 main; src/*.ts; scripts/01-05 and 99-verify), reusing its helpers and style (viem, tsx, send());
AGENTS.md and docs/review.md; docs/prompts/T0.md and the T0 PR draft for style; Desk system §6 and §4.3 and
Desk security §7 on the docs branch.
Build:
- ens/scripts/06-handoff.ts and npm script "handoff": --safe <address> (required), --execute, --sepolia.
  Read the state first (roles(0, safe) and roles(0, eoa) on R, D, C and agents; owner and current token id of
  dao-treasury-a). Plan only the missing calls, in order: grants to the Safe, the ETHRegistry transfer, then
  revocation of everything the EOA still holds at root. Print the plan; without --execute stop there. With
  --execute send in order through send() and re-read the state. A re-run after completion sends nothing.
  Choose safeTransferFrom or unsafeTransfer for dao-treasury-a and justify it; check on the fork that a real
  Safe's fallback handler accepts ERC-1155.
- ens/src/safe.ts: a small protocol-kit helper to deploy (or predict) a 2-of-3 Safe and execute a Safe
  transaction, reused by the next requirement.
- A fork harness: deploy a 2-of-3 Safe (anvil accounts 1-3, saltNonce "ens-handoff-fork"), then prove that the
  EOA's R.setData(mm-a, "desk.terms", ...) reverts, that a Safe transaction setting it succeeds (owners 1 and 2
  sign, owner 1 executes), and that the risk agent's desk.spread write still succeeds.
- 99-verify.ts: optional --safe <address> adding the handoff checks; existing checks unchanged.
- README (Korean): a "Safe 인계" section (commands, what moves, what does not and why, the real Sepolia run order).
Moving subname ownership is out of scope; still try one subname transfer on the fork and report exactly what happens.
Run every acceptance check of requirement 014 on the fork and capture the outputs, plus npm run typecheck.
Environment: copy the ENS lane's .env into the worktree after confirming it is gitignored; set
RPC_URL=http://127.0.0.1:8546 in the copy only; never print the file or a key. anvil fork on port 8546 only
(8545 belongs to another agent). Never send to real Sepolia and never pass --sepolia; the handoff guard must
refuse a non-local RPC without it. Fork runs leave ens/deployments unchanged. Add only
@safe-global/protocol-kit 8.0.7 (exact). Commits by hyeon-Sec, with no AI trailers. Save this prompt here.
Write the PR description to a file; do not push, open pull requests or comment.
```

## How it was run

- Run on 2026-09-25 and 26 by an AI coding agent in a local git worktree (`~/desk-ens-handoff`, branch `ens/safe-handoff`).
- Every sending command went to an anvil fork of Sepolia on `127.0.0.1:8546`. The setup EOA and the risk agent signed with the ENS lane's testnet keys from the gitignored `.env`, which were never printed. The fork Safe's owners were anvil's default accounts 1 to 3.
- The agent read the deployed contracts' verified source (Blockscout) for the transfer and role rules, and checked each rule it relied on with an `eth_call` on the fork. One supplied fact did not hold: `unsafeTransfer` skips the emancipation and sole-assignee checks, but it still runs the ERC-1155 receiver check. The PR description records this under Facts.
- The orchestrating session pushes the branch and edits the pull request.
- Human review and merge: pending (WR-07).

## Follow-up messages from the orchestrating session (2026-09-26)

Relayed mid-task (summary):

1. **Sepolia state changed.** mm-a and mm-b `addr` now point at the Aqua lane's bot wallets (`setAddress` only; terms and expiry unchanged), and `origin/ens/setup` gained `7bfa41a` and `6420cee`. Merge `origin/ens/setup` (never rebase) before `npm run verify` on a new fork, and keep `ens/deployments` unchanged in this PR's commits.
2. **Team decision on the real Safe's owners.** Owners 1 and 2 are Aqua-lane people and owner 3 is the ENS lane. Keys never cross lanes, and no file holds two owner keys. So `ens/src/safe.ts` is built around one local owner key: it signs a Safe transaction and returns the signature, which may be shared. A separate step executes once the signatures reach the threshold, and any account can submit it. The fork harness may use anvil keys for owners 1 and 2 as fork-only stand-ins, labelled as such. The README and the PR's "For the author" say that the ENS lane holds owner 3 only, and that ENS operations after the handoff need an Aqua owner to co-sign (for example re-arming mm-c before the demo, or repointing `addr`).
3. **The fork was killed.** Another agent stopped the anvil on port 8546 by mistake while stopping its own. Redo the fork setup from scratch on a new fork (Safe, dry run, handoff, proofs), and report which fork block the final acceptance runs used.
