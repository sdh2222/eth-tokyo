# T2b prompts

WR-10 disclosure: the prompts that produced the code in the T2b pull request.

## Agent prompt (T2b Plan · Agent prompt, verbatim)

```text
Read the Notion pages "T2b Spec · ENS gas spike (fork)" and "Desk system" §5.3, §5.4 step 6,
§6.4, §13. Branch aqua/t2b-ens-gas. You own only contracts/test/fork/SepoliaEns.fork.t.sol.
Implement Requirements 1-5. Use the 2LD name the page Owner gives you: <NAME>. Do not guess a name.
Run against a Sepolia fork, paste the per-call gas table and total into the PR with the QC checklist,
and save this prompt as docs/prompts/T2b.md. If any call reverts, stop and report the revert data.
```

`<NAME>` was given by the page Owner in `requirements/005-t2b-ens-gas-spike.md`: the 2LD `dao-treasury-a.eth`, the child label `clients`, and the MM name `mm-a.clients.dao-treasury-a.eth` for the two `resolve` calls.

## How it was run

- Run on 2026-09-25 by an AI coding agent in a local git worktree (`../desk-t2b`, branch `aqua/t2b-ens-gas`, stacked on `ens/c1-config` and `aqua/t0-scaffold`, which were not merged yet). The agent read the pages from the team's docs branch of this repository, which holds the same text as the Notion pages.
- The orchestrating session wrapped the prompt above with these operating instructions (summary):
  - The requirement file `requirements/005-t2b-ens-gas-spike.md` is the first commit on the branch. Implement exactly the T2b Spec, test T-F-1 only.
  - Read the addresses from `config/sepolia.json` (filled by C1) and use the interfaces in `contracts/src/interfaces/IDeskEns.sol` unchanged.
  - Acceptance: the Spec's fork command against a public read-only Sepolia RPC, then `make check` without `SEPOLIA_RPC_URL`.
  - On a gap or a disagreement between pages, write a `BLOCKED:` line (WR-03) instead of choosing a side.
  - Commits cite the spec (WR-08). The PR description follows WR-09 and the repository's pull request template, with the call · gas table and the total.
  - Do not push and do not open the pull request: write the PR description to a file. The team pushes and opens it.
  - No keys and no transactions: read-only fork calls only. Touch only the test file and this prompt file.
- Human review and merge: pending (WR-07).
