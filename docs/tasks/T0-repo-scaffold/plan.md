---
title: T0 Plan · Repo scaffold
notion: https://app.notion.com/p/3e58f1ec11b4818eba1af4370a1395d6
---

# T0 Plan · Repo scaffold

## Ready when

Kick-off (H0). The repo is `sdh2222/eth-tokyo`, and these docs already live in its `/docs`.

## Branch

`aqua/t0-scaffold` from `main`.

## Steps

1. The Aqua lane creates the repo and pushes an empty `main` with the existing `.gitignore`.
2. Agent: submodule and Foundry setup (Spec 1–2). Checkpoint: `forge build` compiles an empty `src/`.
3. Agent: mocks, interfaces, stubs (Spec 3–5). Checkpoint: `forge build` compiles everything.
4. Agent: TS package and root tooling, including the `.gitignore` additions (Spec 6, 8). Checkpoint: `pnpm -C ts typecheck` passes.
5. Agent: config, env example, licenses, README, Makefile and CI workflow (Spec 7, 9, 10). Checkpoint: `make check` green.
6. A human reviewer (proposed) reviews (Aqua lane working rules WR-07) and merges. Gate G0.

## Commands
```bash
git submodule add https://github.com/1inch/swap-vm contracts/lib/swap-vm
cd contracts/lib/swap-vm && git checkout v1.0.2 && yarn install --frozen-lockfile && cd -
cd contracts && forge build --sizes
pnpm install && make check
```

## Risks and fallbacks

- `yarn install` inside the submodule fails on Node version: use the Node version in `lib/swap-vm/.nvmrc` if present, else Node 22 LTS.
- A pinned npm version fails to install: stop and tell the page Owner with the error; do not float versions.

## Review focus

Remappings exact; error names and argument types in the stubs match Desk system character for character (wave-1 agents compile against them).

## Time box

45 minutes. If over, a human in the Aqua lane takes over the remaining steps by hand (proposed).

## Agent prompt
```javascript
You are setting up the monorepo for the "Desk" ETHGlobal project. Read the Notion pages
"T0 Spec · Repo scaffold", "Desk system" §3, §5.5, §6.4, §8.0, §12 and "Desk testing and quality gates" §3.
Branch aqua/t0-scaffold. Create exactly the files listed under "Owns" in the T0 Spec, following its
Requirements 1-10 exactly: pinned versions, exact remappings, exact error names in the stubs.
Do not implement any instruction logic. Do not add dependencies beyond those listed.
When done: run `make check`, paste the output into the PR description with the QC checklist
(Desk testing and quality gates §3), save this prompt as docs/prompts/T0.md, and open the PR. If any pinned version or
the swap-vm install fails, stop and report the exact error instead of working around it.
```
