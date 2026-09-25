# 002 ENS lane setup on Sepolia

## One behavior

The desk's ENS names and records exist on Sepolia exactly as Desk system §6, and anyone can confirm it with `npm run verify` in `ens/`, without keys.

## In scope

- `ens/`: idempotent scripts that register `desk.eth`, deploy the treasury resolver R and the desk, clients and agents UserRegistries, issue `mm-a`, `mm-b` and `mm-c` under `clients.desk.eth` with `addr` and `desk.terms`, and grant the risk agent `desk.spread` and `desk.stats` through `grantSetterRoles` (Desk system §6.1–6.3).
- `ens/deployments/`: the Sepolia addresses, and `config.ens.json`, the §6.5 hand-off in the `config/sepolia.json` shape (§8.0).
- `ens/src/read.ts`: a read library that applies the router's ENS gate and record rules (§5.3, §5.4 step 6).

## Out of scope

- `contracts/`, `ts/`, `web/`, `config/` and root tooling (T0 and later tasks). The hand-off is merged into `config/sepolia.json` with `npm run export` after T0 lands.
- Moving name ownership and the resolver and registry root roles to the treasury Safe (after T6a).
- The risk agent's logic.

## Acceptance

- [ ] `cd ens && npm ci && npm run verify` ends with `all required checks passed` and exits 0. It reads Sepolia and needs no keys.
- [ ] `desk.terms` on `mm-a.clients.desk.eth` is 96 bytes and decodes to `(1, 10, 100000000000)`.
- [ ] The agent's `desk.terms` write reverted on-chain with `EACUnauthorizedAccountRoles`: https://sepolia.etherscan.io/tx/0x00f2815bfd1f352629ea187c583d2730595b239db38bf79974a85c2b117a6bae
- [ ] UniversalResolverV2 resolves `mm-a.clients.desk.eth` to its MM address through R.
