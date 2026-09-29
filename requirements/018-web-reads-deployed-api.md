# 018 Web reads the deployed API

## One behavior

A live-mode build of main reads the desk from https://watermark-k4ub.onrender.com and shows the live desk.

## In scope

- The API constant in `web/src/desk/api.ts`.

## Out of scope

- An environment variable for the API.
- The watcher (#53).
- The Program page (#54, #55).
- Any other file.

## Acceptance

- [ ] `git grep -n "onrender.com" web/src` shows only watermark-k4ub.
- [ ] In live mode, `/program` shows "0x29ad…da5b · shipped in block 11,789,116", not "No desk is open".
- [ ] `pnpm -C web lint` and `pnpm -C web typecheck` pass.
