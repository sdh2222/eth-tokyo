# 010 Desk client

## One behavior

The TypeScript desk client reads the chain and returns unsigned transactions for every off-chain caller.

## In scope

- `ts/src/lib/client`, the local fixture, and tests T-TS-5 through T-TS-11.

## Out of scope

- The ship CLI, the bot, and the web app.

## Acceptance

- [ ] `pnpm -C ts test` passes, and the tests include T-TS-5 through T-TS-11 by name.
- [ ] `pnpm -C ts build` emits no `node:`, `fs`, `path`, or `child_process` import under `dist/lib`.
