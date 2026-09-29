# 019 The Program page stops at the zero padding of the program

Source: issue #54. The live program `0x29ad…da5b` comes to the page as 224 bytes: 216 bytes of instructions, then 8 zero bytes of padding. `programFromStrategy` in `ts/src/lib/client/strategies.ts` finds the program by the `0d05` marker in the `Shipped` strategy and keeps every byte to the end, so the padding stays. The read API serves the same 224 bytes. `instructions()` in `web/src/pages/ProgramPage.tsx` reads each `00 00` pair as opcode 0 with length 0, so the Instructions table and Raw bytes show four extra `0x00` rows.

## One behavior

Controls → Program shows only the instructions of the shipped program. The zero bytes after the last instruction are not shown as instructions, as raw bytes, or in the byte count.

## In scope

- `web/src/pages/ProgramPage.tsx`: `instructions()` stops at an instruction boundary when only zero bytes are left. The byte count in Raw bytes is the sum of the listed instructions.

## Out of scope

- `programFromStrategy` in `ts/src/lib/client/strategies.ts`, and the program that the read API stores.
- The read API address (issue #52) and the watcher (issue #53).
- The plain-English lines (issue #55).
- Any other screen, and any component or style change.

## Acceptance

- [ ] Live mode, with a live desk on the page (the read API from issue #52, or a local build that reads the chain), `/program` for `0x29ad…da5b`: the Instructions table has four rows: `0x0d` Deadline, `0x14` Salt, `0x22` Name gate, `0x23` Price.
- [ ] On the same page, Raw bytes has four lines and shows `216 bytes`.
- [ ] Fixture mode (`VITE_DESK_MODE=fixture`, `VITE_FIXTURE=qa`), `/program`: two rows, `0x0d` and `0x14`, and `17 bytes`, the same as before.
- [ ] `pnpm -C web lint`, `pnpm -C web typecheck`, and `make check` pass.
