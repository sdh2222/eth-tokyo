# 001 T0 repo scaffold

Source: T0 Spec · Repo scaffold (`docs/tasks/T0-repo-scaffold/spec.md` on the docs branch, not yet on `main`; Notion https://app.notion.com/p/3e58f1ec11b48162a5d5ce81d57783d0). The spec is the requirement. This file restates it for the pull request loop and does not change it.

## One behavior

A developer on a clean clone can initialise the `contracts/lib/swap-vm` submodule, run `yarn install --frozen-lockfile` inside it and `pnpm install` at the root, and then run `make check` green on an empty but fully wired monorepo that wave-1 tasks build on without touching shared setup.

## In scope

- Exactly the files listed under "Owns" in the T0 Spec, built to its Requirements 1 to 10 (numbered as in the T0 Plan):
  1. `contracts/foundry.toml`: the `[profile.default]` compiler settings copied from `lib/swap-vm/foundry.toml`, plus `evm_version = "cancun"` and `fs_permissions` read-write on `../config`.
  2. `contracts/remappings.txt` with the five remappings from the spec, character for character; submodule `contracts/lib/swap-vm` at tag `v1.0.2`.
  3. `MockWETH`, `MockUSDC`, `MockOracle` and `AggregatorV3Interface` as Desk system §5.5, MIT.
  4. `IDeskEns.sol` as Desk system §6.4 and `IDeskEvents.sol` with the `DeskFill` event from Desk system §5.4.
  5. Stubs `EnsGate`, `DeskPrice`, `DeskOpcodes`, `DeskRouter`, `DeskArgs` with the error names and argument types from the spec, `revert("T2")` / `revert("T3")` bodies, and the SwapVM license header (Desk system §12).
  6. The `@desk/lib` TypeScript package in `ts/` with the pinned tool and dependency versions and the scripts `build`, `typecheck`, `lint`, `test`, `safe:setup`, `ship`, `bot`, `e2e`.
  7. `config/sepolia.json` (Desk system §8.0 schema, empty addresses except `aqua`) and `.env.example` (Desk system §8.0 keys, no values).
  8. Root `package.json` with pinned `secretlint` and its recommended preset, `.secretlintrc.json`, `pnpm-workspace.yaml` (`ts`, `web`), `.gitignore` build-output additions.
  9. `Makefile` target `check` with the seven steps in the spec's order, and `.github/workflows/qc.yml` running `make check` on pull requests.
  10. `LICENSES/SwapVM-1.1.txt` (verbatim), `NOTICE.md` (empty table), `README.md` (spec wording), `docs/prompts/.gitkeep`, `docs/prompts/T0.md`.

## Out of scope

- Any instruction logic. `_ensGate` and `_deskPrice` only revert `"T2"` and `"T3"`.
- Deriving `DeskRouter` and `DeskOpcodes` from upstream, and the `NOTICE.md` rows for them (T1).
- The web app scaffold under `web/` (web app lane, W1).
- Tests, the deploy script, the TS library code, scripts and bot (later tasks).
- Any dependency or version not listed in the spec.
- Keys, a `.env` with values, and any Sepolia transaction (Desk security §7).

## Acceptance

- [ ] On a clean clone, after `git submodule update --init`, `yarn install --frozen-lockfile` in `contracts/lib/swap-vm` and `pnpm install` at the root (T0 Plan commands), `make check` exits 0.
- [ ] `git status --porcelain` prints nothing after `make check` (build outputs are ignored).
- [ ] `python3 -m json.tool config/sepolia.json` parses (stand-in for `jq`), and its keys match Desk system §8.0.
- [ ] The CI workflow `.github/workflows/qc.yml` passes on the T0 pull request.
- [ ] `grep` over `contracts/src/instructions/EnsGate.sol` and `contracts/src/instructions/DeskPrice.sol` shows every error name and signature listed in the spec's stub requirement.
