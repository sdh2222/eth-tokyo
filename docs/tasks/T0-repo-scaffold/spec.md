---
title: T0 Spec · Repo scaffold
notion: https://app.notion.com/p/3e58f1ec11b48162a5d5ce81d57783d0
---

# T0 Spec · Repo scaffold

## Goal

An empty but fully wired monorepo on `main`, so every other task can start in parallel without touching shared setup. After T0 nobody edits build config, remappings, package manifests or the config schema without a CR.

## Source of truth

Desk system §3 (layout), §5.5 (mocks), §6.4 (ENS interfaces), §8.0 (config), §12 (license); Desk testing and quality gates §3 (QC gate); Desk security §7 (keys).

## Owns (creates)

- `contracts/foundry.toml`, `contracts/remappings.txt`, submodule `contracts/lib/swap-vm` at tag `v1.0.2`
- `contracts/src/mocks/MockWETH.sol`, `MockUSDC.sol`, `MockOracle.sol`, `contracts/src/interfaces/AggregatorV3Interface.sol`
- `contracts/src/interfaces/IDeskEns.sol`, `contracts/src/interfaces/IDeskEvents.sol`
- Stubs: `contracts/src/DeskRouter.sol`, `contracts/src/opcodes/DeskOpcodes.sol`, `contracts/src/instructions/EnsGate.sol`, `contracts/src/instructions/DeskPrice.sol`, `contracts/src/libs/DeskArgs.sol`
- `ts/package.json` (name `@desk/lib`), `ts/tsconfig.json`, `ts/vitest.config.ts`, `ts/eslint.config.mjs`, empty `ts/src/{lib,lib/client,scripts,bot,dev}/index.ts`, `ts/test/{lib,client}/.gitkeep`
- Root: `package.json` (workspace scripts, secretlint), `pnpm-workspace.yaml` (`ts`, `web`), `.secretlintrc.json`, `Makefile` with `check`, `.env.example`, `config/sepolia.json`, `LICENSES/SwapVM-1.1.txt`, `NOTICE.md`, `README.md`, `docs/prompts/.gitkeep`, `docs/prompts/T0.md`, `.gitignore` (build outputs: `contracts/out`, `contracts/cache`, `ts/dist`, `node_modules`), `.github/workflows/qc.yml`

## Requirements

1. **Foundry.** Copy `[profile.default]` compiler settings from `lib/swap-vm/foundry.toml` (solc 0.8.30, `via_ir = true`, `optimizer_runs = 700`, the same `optimizer_details`). Add `evm_version = "cancun"` and `fs_permissions = [{ access = "read-write", path = "../config" }]`.
2. **Remappings** exactly:
```javascript
forge-std/=lib/swap-vm/node_modules/forge-std/src/
@openzeppelin/contracts/=lib/swap-vm/node_modules/@openzeppelin/contracts/
@1inch/solidity-utils/=lib/swap-vm/node_modules/@1inch/solidity-utils/
@1inch/aqua/=lib/swap-vm/node_modules/@1inch/aqua/
@1inch/swap-vm/=lib/swap-vm/src/
```
After adding the submodule, run `yarn install --frozen-lockfile` inside `lib/swap-vm`.

1. **Mocks** exactly as Desk system §5.5, MIT. The oracle constructor sets `roundId = 1` and `updatedAt = block.timestamp`.
2. **Interfaces** exactly as Desk system §6.4 (`IDeskEns.sol`) and the `DeskFill` event from Desk system §5.4 (`IDeskEvents.sol`).
3. **Stubs** with the target names, inheritance and error declarations, so wave 1 compiles:
	- `EnsGate`: `abstract contract EnsGate` declaring every error in Desk system §5.3 (`EnsGateInvalidArgs()`, `EnsGateMissingName()`, `EnsGateNameNotUnderDesk()`, `EnsGateDeskMismatch(address got)`, `EnsGateClientsMismatch(address got)`, `EnsGateNameExpired(uint64 expiry)`, `EnsGateWrongResolver(address got)`, `EnsGateTakerMismatch(address nameAddr, address taker)`) and `function _ensGate(Context memory, bytes calldata) internal view { revert("T2"); }`.
	- `DeskPrice`: `abstract contract DeskPrice is IDeskEvents` declaring every error in Desk system §5.4 (`DeskPriceInvalidArgs()`, `DeskPriceMissingName()`, `DeskPriceUnsupportedPair(address tokenIn, address tokenOut)`, `DeskPriceRecomputeDetected()`, `DeskPriceOracleInvalid(int256 answer)`, `DeskPriceOracleStale(uint256 updatedAt, uint256 maxStaleness)`, `DeskPriceInvalidRecords()`, `DeskPriceNoTerms()`, `DeskPriceEmptyBook()`, `DeskPriceSizeTooLarge(uint256 floorBps)`, `DeskPriceCapExceeded(uint256 notional, uint256 cap)`, `DeskPriceInsufficientInventory(uint256 amountOut, uint256 balanceOut)`) and `function _deskPrice(Context memory, bytes calldata) internal { revert("T3"); }`.
	- `DeskOpcodes`, `DeskRouter`: compile-only shells with the target contract names; `DeskArgs`: empty library.
	- All five carry the SwapVM license header (Desk system §12).
4. **TS package** `@desk/lib`: TypeScript 7.0.2 strict, ESM, vitest 5.0.1, eslint 10.11.0, prettier 3.9.9. Dependencies pinned exactly: `viem 2.56.8`, `@1inch/swap-vm-sdk 0.4.4`, `@1inch/sdk-core 0.1.6`, `@1inch/byte-utils 3.1.9`, `@safe-global/protocol-kit 8.0.7`, `@safe-global/types-kit 4.0.1`, `dotenv 18.0.3`, `commander 15.0.0`, `tsx 4.23.15`. Scripts: `build`, `typecheck`, `lint`, `test`, `safe:setup`, `ship`, `bot`, `e2e`.
5. **Config** `config/sepolia.json` exactly the schema in Desk system §8.0 with empty addresses except `aqua`; `.env.example` with the keys in Desk system §8.0 and no values.
6. **Root** `package.json` with devDependencies `secretlint 13.0.5` and `@secretlint/secretlint-rule-preset-recommend 13.0.5`; `.secretlintrc.json` using the preset; script `secretlint`.
7. **`make check`** runs, in order: `forge fmt --check`, `forge build --sizes`, `forge test`, `pnpm -C ts lint`, `pnpm -C ts typecheck`, `pnpm -C ts test --passWithNoTests`, `pnpm secretlint "**/*"`. The web app lane adds web checks. `.github/workflows/qc.yml` runs `make check` on pull requests (use `foundry-rs/foundry-toolchain` and pnpm; submodules recursive).
8. **Licenses and docs:** `LICENSES/SwapVM-1.1.txt` copied verbatim; `NOTICE.md` with an empty table (file · derived from · change · date); `README.md` with one paragraph, "Sepolia testnet · not audited", "Powered by SwapVM. Copyright © 2025 Degensoft Ltd.", "Built on 1inch Aqua and ENSv2 (not affiliated)", and how to run `make check`.

## Security

Desk security §7: no keys anywhere; `.env` stays git-ignored (already in `.gitignore`).

## Acceptance

- `make check` passes on a clean clone after `git submodule update --init` and the `yarn install` in `lib/swap-vm`.
- `git status` is clean after a build.
- `cat config/sepolia.json | jq` parses and matches the Desk system §8.0 keys.
- The CI workflow passes on the T0 PR.
- A grep shows every error name and signature listed above in the two stub files.

## Out of scope

Any instruction logic; the web app scaffold (the web app lane's W1).

## Handoff

Every task branches from `main` after T0 merges (gate G0). The error signatures above are the proposed contract for T2 and T3, which implement them without renaming.
