# T6a prompts

WR-10 disclosure: the prompts that produced the code in the T6a pull request.

## Agent prompt (T6a Plan · Agent prompt, verbatim)

```text
Read the Notion pages "T6a Spec · Safe setup script", "Desk system" §4.1, §8.0, §8.2 and
"Desk security" §7. Branch aqua/t6a-safe. You own only ts/src/scripts/safe-setup.ts and
ts/src/scripts/_common/{env,clients,log}.ts. Implement Requirements 1-7 with the pinned packages.
Never print or write a private key. Run the acceptance on an anvil Sepolia fork (anvil default keys
in .env), paste both runs' output, revert config changes before committing, save this prompt as
docs/prompts/T6a.md. Do not run anything against real Sepolia.
```

## How it was run

- Run on 2026-09-25 and 2026-09-26 by an AI coding agent in a local git worktree (`../desk-t6a`, branch `aqua/t6a-safe`, stacked on `aqua/t0-scaffold` and holding requirement 009). The agent read the pages from the team's docs branch of this repository, which holds the same text as the Notion pages.
- The orchestrating session wrapped the prompt above with these operating instructions (summary):
  - Read first: requirement 009, `AGENTS.md`, `docs/review.md`, the pull request template, `docs/prompts/T0.md`, the T6a Spec and Plan, Desk system §2.2 (D11), §4.1 (steps 2 and 5), §8.0 and §8.2, Desk security §7 (SEC-01 to SEC-05) and the §9 checklist, Desk testing and quality gates, and working rules WR-08 to WR-10.
  - Scope: only `ts/src/scripts/safe-setup.ts`, `ts/src/scripts/_common/{env,clients,log}.ts` and this file. Use only the dependencies T0 pins. If a file outside that list must change, stop and report it as BLOCKED instead of changing it.
  - Lint: T0 is switching `.ts` parsing to typescript-eslint. Write code that passes its recommended rules (no `any`, no unused variables, no require imports). When the T0 update is pushed, merge `origin/aqua/t0-scaffold` (merge, never rebase, because the branch is pushed), run `pnpm install --frozen-lockfile`, then run the checks.
  - Acceptance on an anvil Sepolia fork only; never send a transaction to real Sepolia. Confirm `.env` is git-ignored before writing it. Fill it with the public RPC and anvil's default accounts 0 to 3 for `DEPLOYER_PK` and `SAFE_OWNER_1_PK` to `SAFE_OWNER_3_PK`. Never print the keys or put them in a committed file or the PR description.
  - Check that the Safe v1.4.1 contracts protocol-kit uses for chain 11155111 have code on the fork.
  - T4 is not merged, so follow the Plan's fallback: deploy MockWETH and MockUSDC with a throwaway `forge create` on the fork, and for the run only put their addresses and two other anvil accounts (as MMs) into `config/sepolia.json`.
  - Run `pnpm -C ts safe:setup --mint --rpc http://127.0.0.1:8545` twice and save both outputs. Show that the script's own write changed only `safe`, that a missing key exits non-zero naming the variable, and that without `--rpc` the RPC comes from `SEPOLIA_RPC_URL` (pointed at the fork, never at real Sepolia). Then `git checkout config/sepolia.json`, `make check` and `pnpm secretlint "**/*"`.
  - Implementation notes to verify against the docs and the installed packages: mint the shortfall when a balance is below its target, and skip it when the target is met. If `config.safe` is set but has no code, deploy again with the same saltNonce. If the predicted address differs from `config.safe`, do not overwrite silently: choose between stopping and overwriting and explain it. Derive addresses with viem's `privateKeyToAccount` and never log a key. `_common/env.ts` loads the repo-root `.env`, resolved from the module location. Keep `_common` small and general, because T6b and T7 share it. Follow the spec's config write method, and show the reformat of the hand-formatted file as a semantic comparison plus the diff stat.
  - Commits follow `AGENTS.md`, with the author from the repository config and no AI trailers. Save this prompt file. Do not push and do not open the pull request: write the PR description to a file.
- Follow-up messages from the orchestrating session, during the run:
  1. The T0 lint update is pushed (typescript-eslint 8.70.1 parsing through TypeScript 6.0.3, `ts/eslint.config.cjs` from T5). Merge it and reinstall as above.
  2. Foundry's `vm.writeJson`, which T4's `Deploy.s.sol` uses, rewrites the whole file as exactly `JSON.stringify(parsed, null, 2)` with no trailing newline. Make the script's write produce exactly that, so the two writers never flip the file's formatting, and say so in the PR. (Withdrawn by message 3.)
  3. Team decision 09-25 (second batch), overriding the spec where they conflict:
     - Owners by address. Private keys never cross lanes, so the script never reads an owner's private key. It reads `SAFE_OWNER_1_ADDRESS` to `SAFE_OWNER_3_ADDRESS`: all required, valid and distinct, failing fast with the variable's name. `DEPLOYER_PK` is the only key. There is no fallback to owner keys. `.env.example` gains the three `*_ADDRESS` lines (a T0 file, allowed for this decision) and keeps the `SAFE_OWNER_n_PK` lines that `ship.ts` uses. On the fork, the owners are anvil accounts 1 to 3 by address, and no owner key goes in `.env`.
     - `config/sepolia.json` keeps its current line layout (other open pull requests edit the same file). Read values by parsing. To write, replace only the value of the top-level `"safe"` entry in the original text, through a match that must occur exactly once, and fail with a clear error otherwise. After the first run, `git diff config/sepolia.json` shows only the `safe` value changing.
     - Update requirement 009 in its own commit, before the code commit, with the changed wording of in-scope items 2, 3 and 6, a new in-scope line for `.env.example`, and the two changed acceptance checks.
- Human review and merge: pending (WR-07).
