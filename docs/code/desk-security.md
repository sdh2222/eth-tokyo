---
title: Desk security
domain: Code
type: Rules
status: Draft
page_code: SEC
as_of: 2026-09-24
written_from: [Desk system]
notion: https://app.notion.com/p/3e58f1ec11b4812eaab4eb76bec8e370
---

# Desk security

This page sets out the desk's security model: assets, actors, on-chain permissions, invariants, threats, key and web app rules, the review checklist and the incident playbook.
Every invariant below has an enforcing mechanism and a test. A PR that weakens an invariant, or removes its test, does not merge (proposed). Aqua lane working rules (Pages and precedence) proposes that this page takes precedence when pages disagree.

## 1. Assets

| Asset | Where | Worst case if lost |
| --- | --- | --- |
| Treasury WETH and USDC | The Safe | Drained, or sold at a bad price |
| Safe allowances to Aqua | WETH and USDC contracts | Pulled by a strategy we did not intend |
| MM list and terms | ENS names and resolver R records | An outsider trades, or a listed MM gets better terms |
| The live strategy | Aqua (Safe → DeskRouter → strategyHash) | Wrong parameters live; two strategies live on one balance |
| Private keys | The transaction-sending machine only, in `.env` (holder proposed, see Open questions) | Any of the above |
| Demo credibility | The web app and Sepolia | A failed or misleading demo |

## 2. Actors and trust

| Actor | Trust | Can | Cannot |
| --- | --- | --- | --- |
| Safe owners (3 test keys, 2-of-3, proposed) | Trusted | Ship, dock, approve, write every ENS record, grant and revoke roles | Act alone (threshold 2) |
| Deployer | Trusted, demo-only powers | Owns DeskRouter (`rescueFunds`) and MockOracle (`setAnswer`, `setUpdatedAt`); mints mock tokens (anyone can) | Move Safe funds; change the strategy |
| Listed MM | Semi-trusted: named, but adversarial on price | Quote and fill within its terms while its name is live | Change any record; use another MM's name; exceed its cap; round-trip for profit |
| Risk agent key | Semi-trusted, scoped | Write `desk.spread` (data) and `desk.stats` (text) on R, for every name | Change addr, terms, expiry, resolver; move funds; push the spread outside `[sMin, sMax]`; block fills |
| Anyone else | Untrusted | Read everything; call `quote` (reverts for them); register other ENS names | Fill; affect any price |
| Web app visitor | Untrusted input | Type any value into any form | Get a transaction built from unvalidated input |
| RPC provider | Untrusted for availability and freshness | Be slow, rate-limit, return stale data | Forge signed transactions |

## 3. Permission matrix (on-chain)

| Action | Contract | Allowed caller | Enforced by |
| --- | --- | --- | --- |
| `ship`, `dock` | Aqua | The Safe (as maker) | Aqua keys balances by `msg.sender` (`Aqua.sol:40-60`) |
| `pull` from the Safe | Aqua | Only the app the Safe shipped to (DeskRouter), up to that strategy's virtual balance | `_balances[maker][msg.sender]` (`Aqua.sol:63-66`) |
| `swap` that succeeds | DeskRouter | The `addr` of a live listed name | #34 (Desk system §5.3) |
| `rescueFunds` | DeskRouter | Deployer (owner) | `Rescuable`; the router holds no tokens between transactions (INV-13) |
| `setAddress`, `setData(desk.terms)`, `setResolver`, register/renew names | ENS | The Safe | ENS roles (Desk system §6.3) |
| `setData(desk.spread)`, `setText(desk.stats)` | Resolver R | The Safe and the agent | `grantSetterRoles` per key |
| `ROLE_LINK`, `ROLE_UPGRADE` on R | Resolver R | The Safe only. Never granted to anyone else. | ENS lane setup; checked in T9 |
| `setAnswer`, `setUpdatedAt` | MockOracle | Deployer | `onlyOwner` |

## 4. Invariants

Each invariant names what enforces it and which test proves it. Test IDs are defined in Desk system §10 and Desk testing and quality gates §2.

| ID | Invariant | Enforced by | Proven by |
| --- | --- | --- | --- |
| INV-1 | Only the `addr` of a live name under the pinned `clients.desk.eth` can fill or get a quote. | #34 steps 3 to 8 | T-G-1..10, T-I-3, T-I-6 |
| INV-2 | A lapsed and re-registered `desk.eth` or `clients.desk.eth` cannot revive the gate. | Pinned desk and clients registries (D3) | T-G `DeskMismatch`, `ClientsMismatch` |
| INV-3 | No fill moves more than the name's `capPerFill` of USDC notional. | #35 step 10 | T-P-5 |
| INV-4 | No fill is priced better for the MM than `r·(1 ± sMin)`. | Clamp in #35 step 6; floor only raises s | T-P-3, T-P-10 |
| INV-5 | A buy followed by a sell-back (or the reverse) never leaves the MM richer at mid. | Size floor (D16) | T-P-10 fuzz |
| INV-6 | Rounding always favours the treasury. | #35 step 9 | T-P-2 fuzz |
| INV-7 | A stale, future-dated, zero or negative oracle answer blocks every fill. | #35 step 5 | T-P-6 |
| INV-8 | Nothing the agent writes can make a fill revert. | Spread record ignored when invalid (D7) | T-P-3 |
| INV-9 | The agent key can write only `desk.spread` and `desk.stats`. | ENS per-key roles | T9 check: `setData(desk.terms)` and `setAddress` from the agent revert `EACUnauthorizedAccountRoles` |
| INV-10 | Tokens leave the Safe only through `Aqua.pull` called by DeskRouter for a live strategy, and never beyond its virtual balance. | Aqua accounting | T-I-1, T-I-4 |
| INV-11 | A quote changes no state and emits nothing. | `isStaticContext` guard | T-P-8, T-I-2 |
| INV-12 | At most one strategy is live for the Safe on DeskRouter. | Off-chain only: `planShip` docks first; `ship.ts` refuses; the web app blocks Ship while one is live | T-TS-5, T-TS-7, Q-W-OPEN-6 |
| INV-13 | DeskRouter holds zero WETH and USDC after every transaction. | SwapVM push flow | T-I-1 asserts router balances are 0 |
| INV-14 | Our contracts have no storage of their own. | Design (§2.1 item 8) | Review checklist §9; `forge inspect DeskRouter storageLayout` shows only upstream slots |

## 5. Threat model

| # | Threat | Mitigation | Residual risk |
| --- | --- | --- | --- |
| TH-1 | Outsider fills | INV-1 | None known |
| TH-2 | MM uses another MM's name to get better terms | `addr == msg.sender` (#34 step 8) | None known |
| TH-3 | Attacker builds `mm-a.clients.evil.eth` pointing at our clients registry | Suffix pin (D4) | None known |
| TH-4 | `desk.eth` lapses and is re-registered by someone else | INV-2 | Desk stops; renew before expiry |
| TH-5 | Agent key stolen | INV-4, INV-8, INV-9; Safe revokes roles | Attacker can widen spreads to sMax for every MM until revoked (fills get worse for MMs, not for the treasury) |
| TH-6 | MM round-trips a large size for profit | INV-5 | Many small alternating fills pay 2s each way, so they lose |
| TH-7 | Oracle stale or manipulated | INV-7; MockOracle owned by deployer | Accepted for the demo (proposed): the deployer can set any price. Production would use Chainlink with a deviation band (out of scope) |
| TH-8 | Two strategies live on one Safe balance (double-selling the same ETH) | INV-12 | A Safe owner could still ship a second strategy by hand outside our tools; the dashboard shows `MULTIPLE_LIVE` in red |
| TH-9 | Max allowance to Aqua is abused | INV-10: only apps the Safe shipped to can pull, and only up to virtual balances | A mistaken ship to a malicious app would expose its shipped amounts; our tools only ship to `cfg.router` |
| TH-10 | Reentrancy during a fill | SwapVM per-order transient lock; mock tokens have no hooks | None known |
| TH-11 | MM is front-run or sandwiched | Only listed names can fill; taker threshold and deadline | None relevant |
| TH-12 | Opcode table wired wrong (a no-op where a check should be) | T-OP-1 pins every index by behaviour | None if T-OP-1 is green |
| TH-13 | Web app signs something different from what it shows | Review screen shows every `PlannedTx.label` and the decoded program; calldata comes only from the desk client | Wallet UI still shows raw calldata; users must trust the review screen |
| TH-14 | Private key leaks from the repo or the web bundle | §7 key rules (SEC-01 to SEC-07); secret scan in the QC gate | Testnet keys only; rotate on leak |
| TH-15 | Dependency supply-chain attack | Pinned versions and lockfiles; no new dependency without a change request | Normal npm risk |
| TH-16 | Presenting the demo as 1inch-endorsed | License rules (Desk system §12) | None if copy follows Treasury web app §8 |

## 6. Accepted risks (proposed)

These are hackathon-scope risks the team proposes to accept. State them openly if asked.

- MockOracle is set by the deployer. It exists so the demo can move the price and trigger staleness.
- ENSv2 contracts are marked not final (unverified) and live only on Sepolia.
- The agent's per-key role covers every name on resolver R, not one MM (by design, arch page §3).
- The Safe approves Aqua for the maximum amount (D10); the virtual balance is the cap.
- INV-12 is enforced by our tools, not on-chain.
- No audit. The README says "not audited".

## 7. Key handling rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | One key per role, never shared: `DEPLOYER_PK`, `SAFE_OWNER_1..3_PK`, `MM_A_PK`, `MM_B_PK`, agent key (holders proposed, see Open questions). | A leak or misuse stays scoped to one role and can be revoked alone. | All lanes | Review agent | Treat as a suspected leak (SEC-07) |
| SEC-02 | Testnet-only keys, freshly generated for this event. Never a key that has held mainnet funds. | A leaked key costs nothing real (TH-14). | All lanes | Key holders | Rotate the key (SEC-07) |
| SEC-03 | Keys live only in `.env` on the machine that sends transactions (proposed: one Aqua lane machine). Never in the repo, CI, Notion, chat, screenshots or the web bundle. | Keeps keys out of every shared surface (TH-14). | All lanes | Secret scan (SEC-06); review agent | Rotate the key; remove the file (§10) |
| SEC-04 | The web app never holds a private key. All web signing goes through the browser wallet (Treasury web app §7). | The web bundle is public. | Web app lane | Review agent (§9 web PRs) | PR does not merge |
| SEC-05 | Coding agents never receive keys. Anything that needs a key runs on anvil with anvil's default accounts. | Agent context and logs are not a safe place for secrets. | Coding agents, all lanes | Review agent | Rotate the key (SEC-07) |
| SEC-06 | The QC gate runs a secret scan (`pnpm secretlint "**/*"`) on every PR (Desk testing and quality gates §3). | Catches committed secrets before merge. | All PRs | QC gate | PR does not merge |
| SEC-07 | On a suspected leak: stop, dock the strategy (§10), generate new keys, move roles, note it in the change log. | Limits exposure to the time before the dock. | Key holders | The team | Follow the incident playbook (§10) |

## 8. Web app security rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| SEC-08 | Refuse to act unless the wallet's chain id is 11155111; show a "Switch to Sepolia" button instead. | The desk runs only on Sepolia. | Web app lane | Review agent (§9 web PRs) | PR does not merge |
| SEC-09 | Validate every form value against Desk system §5.4 step 1 before calling the desk client; the desk client validates again. | Visitors are untrusted input (§2). | Web app lane | Review agent (§9 web PRs) | PR does not merge |
| SEC-10 | Build transactions only with the desk client. No hand-built calldata in the app. | What is signed matches what is shown (TH-13). | Web app lane | Review agent (§9 web PRs) | PR does not merge |
| SEC-11 | Before any signature, show the review screen: each `PlannedTx.label`, the decoded program in plain English, and amounts in human units. | Users rely on the review screen (TH-13). | Web app lane | Review agent (§9 web PRs) | PR does not merge |
| SEC-12 | Show addresses checksummed and shortened (`0x1234…5678`) with a copy button and an explorer link; show ENS names only as read from the chain. | Users can check who they deal with. | Web app lane | Review agent (§9 web PRs) | PR does not merge |
| SEC-13 | No `dangerouslySetInnerHTML`; render all chain data as text. | Chain data is untrusted. | Web app lane | Review agent (§9 web PRs) | PR does not merge |
| SEC-14 | RPC URL: a public Sepolia endpoint or a key restricted to the app's domain. Nothing else in `VITE_*` variables. | `VITE_*` values ship in the public bundle. | Web app lane | Review agent; secret scan (SEC-06) | PR does not merge; rotate the RPC key |
| SEC-15 | Pin every dependency; no CDN scripts except fonts. | Supply-chain risk (TH-15). | Web app lane | Review agent (§9 web PRs) | PR does not merge |

## 9. Security review checklist

The review agent and the page Owner use this checklist (proposed).
**Solidity PRs**

- [ ] No new storage variables in our contracts (INV-14).
- [ ] External calls only to the addresses in the program args (registries, resolver, oracle), exactly as Desk system §5.3 to §5.4.
- [ ] No `delegatecall`, `selfdestruct`, `tx.origin`, `block.prevrandao`.
- [ ] Assembly only for reading calldata words in argument parsing, each block commented with its offsets.
- [ ] `unchecked` only where overflow is impossible, with a comment proving it.
- [ ] Every revert path in the spec has its custom error, with the spec's name and arguments.
- [ ] No `abi.decode` on ENS record values (D7).
- [ ] Emission only under `!isStaticContext`.
- [ ] License header and derived-file notice present (Desk system §12).
**TypeScript PRs**

- [ ] No private keys, mnemonics or RPC secrets in code, tests or fixtures (anvil default keys allowed in tests only).
- [ ] No calldata built outside `ts/src/lib`.
- [ ] bigint end to end; no `Number()` on token amounts.
- [ ] Errors decoded with `decodeDeskError`, never swallowed.
**Web PRs**

- [ ] SEC-08 to SEC-15 hold on every page the PR touches.

## 10. Incident playbook (during the event)

| Situation | Do this first | Then |
| --- | --- | --- |
| Suspected pricing or gate bug on Sepolia | Dock: Controls → Emergency stop, or `pnpm ship --dock --no-ship` | Reproduce on anvil, fix, re-ship with a new salt |
| Agent key leaked or misbehaving | Safe `revokeRoles` on R for the agent | New agent key, re-grant |
| MM key leaked | Safe sets that name's `addr` to zero (or cap 0) | New MM key, update `addr` |
| Oracle stuck or wrong | `pnpm bot oracle --price <x>` | If the owner key is lost, redeploy the oracle and re-ship |
| Two strategies live | Controls → dock every strategy except the newest | Find how it happened; raise a change request if our tools allowed it |
| Secret committed | Rotate the key immediately | Remove the file; note it in the change log |

## 11. Open questions

| Question | Proposed default | Who answers |
| --- | --- | --- |
| Who holds the deployer, Safe owner and MM keys and sends Sepolia transactions? | One Aqua lane machine, keys in its `.env` | Team |
| What is the Safe owner set and threshold, and who holds each owner key? | 3 test keys, threshold 2-of-3 | Team |
| Who holds the risk agent key? | The lane that runs the risk agent | Team |
| Who signs off the security review checklist? | The review agent and the page Owner | Team |
| Does this page take precedence over other pages when they disagree, and does a PR that weakens an invariant always block? | Yes to both (Aqua lane working rules, Pages and precedence) | Team |
| Which hackathon-scope risks in §6 does the team accept? | All six as listed | Team |

<details>
<summary>Change log</summary>

No entries while Draft.

</details>
