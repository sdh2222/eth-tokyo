---
title: T5b Spec · Desk client and fixture
notion: https://app.notion.com/p/3e58f1ec11b481f481e2fb1d89e32528
---

# T5b Spec · Desk client and fixture

## Goal

The single door between every off-chain consumer (web app, ship CLI, bot, e2e runner, risk agent) and the chain: reads, plans, quotes, verification and error decoding, plus the anvil fixture everyone tests against.

## Source of truth

Desk system §7.2 (every function, including Treasury web app §5.3), §4, §5.3, §5.4, §8.3; Desk testing and quality gates §2.1 (fixture), §2.2; Desk dictionary §3 (errors); Treasury web app §9 (how the web app calls it).

## Owns

- `ts/src/lib/client/{ctx,strategies,program,plans,state,quote,fills,verify,errors,index}.ts`
- `ts/src/lib/client/abi/*.ts` (generated) and the script `ts/scripts/gen-abi.ts` (package script `gen:abi`: copies ABIs of DeskRouter, Aqua, MockOracle, MockWETH, MockUSDC, the ENS interfaces and all our custom errors from `contracts/out` into typed `as const` exports)
- `ts/src/dev/fixture.ts` (package script `fixture`) and `ts/src/dev/deploy-local.ts`
- `ts/test/client/*.test.ts`

## Requirements

1. Every function in Desk system §7.2 with exactly that name, parameters and return type, including `planSetTerms` and `planCutOff` (Treasury web app §5.3). Browser-safe: viem only, no Node APIs in `ts/src/lib/client` (Node is allowed in `ts/src/dev` and `ts/scripts`).
2. `findStrategies` scans `Shipped`/`Docked` logs from `cfg.deployBlock` to the latest block in chunks of `cfg.logChunk`, filters `maker == cfg.safe && app == cfg.router`, decodes each strategy with the SDK's `Order.decode`, and marks `live` by checking `Aqua.rawBalances(safe, router, hash, weth)` has a tokens count that is neither 0 nor 0xff (the chain, not the log order, decides liveness).
3. `readDeskState` issues its reads in one viem `multicall` where possible (balances, allowances, oracle, `safeBalances`), then per MM: the #34 registry walk and the two resolver reads, reproducing Desk system §5.3 steps 4 to 8 and §5.4 step 6 to set `status`. Bid/ask per MM come from `priceMirror` for 1 WETH with that MM's policy spread.
4. `quoteFor` performs `simulateContract`/`call` of `router.quote` with `account = mm.address`; on revert returns `{ ok: false, error: decodeDeskError(e) }`. It also runs `priceMirror` and sets `mirrorMatches` (exact equality).
5. `buildSwapTx` sets the taker threshold from the quote and `slippageBps` (min out for exactIn, max in for exactOut) and a taker deadline of `now + deadlineSec`.
6. `verifyFill` recomputes from the event fields only (midWad, spreadBps, wBeforeWad, amounts, direction) with T5's maths and returns each step (`{ label, formula, value }[]`) and `matches`.
7. `decodeDeskError` maps every code in Desk dictionary §3 (3.1 to 3.5) to `{ code, args, title, hint, severity }` with the exact title and hint strings from Desk dictionary, filling `{cap}` and `{balanceOut}` placeholders; for `ERC20InsufficientAllowance` / `ERC20InsufficientBalance` it chooses the row by the spender/sender argument.
8. `describeProgram` returns exactly the line formats in Desk system §7.2 (times in JST, `YYYY-MM-DD HH:mm JST`; percentages with 2 decimals for spreads, 0 decimals for the target).
9. **Fixture** (`pnpm -C ts fixture --rpc <url>`): on an anvil Sepolia fork, deploys (via `deploy-local.ts`, using `forge script` from T4) the mocks and router, deploys the ENS mocks and wires names and records exactly as Desk testing and quality gates §2.1 using anvil accounts, runs `safe:setup --mint`, ships with `planShip` through a Safe transaction, and writes the resulting addresses to `config/local.json` (same schema; never touches `sepolia.json`). It prints the anvil account ↔ role table.
10. Tests T-TS-5..T-TS-11 (Desk system §10) run against the fixture on a local anvil fork.

## Security

Desk security §9 TypeScript checklist; no private keys in `ts/src/lib` (fixture uses anvil defaults only).

## Acceptance

- `pnpm -C ts fixture` then `pnpm -C ts test` green, T-TS-5..11 present by name.
- `pnpm -C ts build` produces ESM whose `lib` output contains no `node:` or `fs`/`path`/`child_process` imports (a vitest test scans `dist/lib/**/*.js` for them). No new dependency is needed for this check.

## Out of scope

The CLI flows (T6b, T7), the web app.
