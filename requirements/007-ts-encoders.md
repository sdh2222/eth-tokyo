# 007 TypeScript encoders and price mirror

## One behavior

The TypeScript library reproduces the Desk system §9 byte vectors and fill amounts, including the size floor.

## In scope

- `ts/src/lib` encoders, program builder, taker data, price mirror, and DeskFill decoding, plus their vitest tests.
- The TypeScript parser and `@types/node` pins, because they are not on T0 yet and this package cannot lint `.ts` without them.

## Out of scope

- Chain reads, the desk client, and scripts.

## Acceptance

- [ ] `pnpm -C ts test` passes, and `pnpm -C ts typecheck` is clean.
- [ ] The §9 program, gate, price, taker, and V1–V4 amounts are literals in the tests.
