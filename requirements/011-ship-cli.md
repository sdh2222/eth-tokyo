# 011 Ship CLI

## One behavior

`pnpm ship` opens, replaces, or stops the desk by planning through the desk client and signing with the Safe when the owner keys are present.

## In scope

- `ts/src/scripts/ship.ts`.

## Out of scope

- Creating the Safe. That is the ENS lane's T6a.

## Acceptance

- [ ] A live strategy without `--dock` is refused with exit 1.
- [ ] `--print-only` prints the plan and does not send a transaction.
- [ ] `--dock --no-ship` with nothing live prints "nothing to dock" and exits 0.
