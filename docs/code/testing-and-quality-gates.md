---
title: Desk testing and quality gates
domain: Code
type: Rules
status: Draft
page_code: QA
as_of: 2026-09-24
written_from: [Desk system, Desk security]
notion: https://app.notion.com/p/3e58f1ec11b481a49b68ca67b35ad1c7
---

# Desk testing and quality gates

This page sets the quality levels, test cases, merge gates and bug rules that every Desk change goes through, from static checks to the demo rehearsal.
QC is the gate every PR passes before merge (§3). QA is the evidence that the product works end to end (§2). Every case has an ID, and a task Spec says which IDs it must turn green. Every case has an exact procedure and an exact expected result, so a pass is always something another team member can repeat.

## Rules at a glance

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| QA-01 | Every PR passes the QC gate commands in §3 (web commands for web PRs). | Format, lint, types, contract size, tests and secrets are checked before anyone reads the diff. | Every PR, all lanes | The coding agent, then CI | The PR waits until every command is green. |
| QA-02 | The PR description carries the §3 checklist, every box ticked. | It shows scope, acceptance output, test IDs, dependencies, prompt file and security checks in one place. | Every PR | The review agent and the human reviewer | The PR goes back to its author. |
| QA-03 | Every test case has an ID, an exact procedure and an exact expected result; each task Spec names the IDs it must turn green. | A pass can be repeated by anyone on the team. | All cases in §2 and Desk system §10 | The human reviewer | The case does not count as evidence. |
| QA-04 | A review agent reviews each PR with the §4.1 prompt, and every item it reports is fixed or answered in the PR. | Spec drift and weakened invariants are caught before a human review. | Every PR | The human reviewer | The PR waits for the review. |
| QA-05 | A human reviewer from the team (proposed) runs the §4.2 steps before merge. | A person reads revert paths and runs the acceptance commands once. | Every PR | The page Owner | The PR waits for the review. |
| QA-06 | Every bug is logged with a severity (§5), the failing case ID and the task that owns the fix, and handled as §5 says. | Severity sets what stops and what waits, and the case ID proves the fix. | All lanes | The page Owner | The bug is re-logged with the missing fields. |
| QA-07 | The release checklist (§7) is complete before the feature freeze. | The submission rests on green E2E, Sepolia, web and rehearsal runs. | The release | The whole team | Open items are raised with the team before the freeze. |

## 1. Quality levels

| Level | What | Where it runs | Who |
| --- | --- | --- | --- |
| L0 Static | format, lint, typecheck, contract size, secret scan | every PR | coding agent, then CI |
| L1 Unit | Foundry unit tests (T-OP, T-G, T-P), TS unit tests (T-TS-1..4) | every PR | coding agent |
| L2 Integration | Foundry with a real Aqua (T-I) | every contract PR after T8 | coding agent |
| L3 Client | desk client against a local anvil deployment (T-TS-5..11) | every `ts/` PR after T5b | coding agent |
| L4 End to end | scripted full flow on an anvil fork of Sepolia (Q-E2E) | before T9, and after any contract or client change | the Aqua lane runs (proposed), the coding agent writes |
| L5 Web QA | every Q-W case on the anvil fork, then on Sepolia | after each web task; full pass at W9 | the web app lane and the Aqua lane (proposed) |
| L6 Sepolia acceptance | Q-S cases on the live deployment | T9 | the Aqua lane (proposed) |
| L7 Demo rehearsal | Q-D cases, timed | twice before the freeze, once after | whole team |

## 2. Test catalogue

Contract and library tests (T-OP, T-G, T-P, T-I, T-F, T-TS) are specified exactly in Desk system §10. This section adds the end-to-end, web, Sepolia and rehearsal cases.

### 2.1 Standard fixture ("Fixture Desk")

Every L3–L5 run uses this state unless a case says otherwise. It is created by `ts/src/dev/fixture.ts` (task T5b) on anvil, with ENS mocks.

| Item | Value |
| --- | --- |
| Oracle | 4000e8, 8 decimals, fresh |
| Desk inventory (shipped) | 900 WETH, 400,000 USDC (V1, share 90%) |
| Policy | w\* 70%, κ 2%, spread 5–200 bps, max age 3600 s, 30 days |
| mm-a | anvil account 5; tier 10 bps; cap 100,000 USDC; agent spread 20 bps valid 1 h |
| mm-b | anvil account 6; tier 25 bps; cap 50,000 USDC; no agent spread |
| mm-c | anvil account 7; expired 1 day ago |
| mm-x | anvil account 8; live name, no `desk.terms` |
| Outsider | anvil account 9; no name |
| Safe | 2-of-3, owners anvil accounts 1–3; deployer account 0 |
| Risk agent | anvil account 4 (writes `desk.spread` on the mock resolver) |

### 2.2 End to end (L4, `ts/src/dev/e2e.ts`, anvil fork of Sepolia)

| ID | Steps | Expected |
| --- | --- | --- |
| Q-E2E-1 | Deploy (T4) → safe-setup --mint → fixture ENS mocks → ship (CLI) → mm-a approve → buy 1 WETH → sell 0.5 WETH | Both fills succeed; `quoteFor` equals each fill; Safe and Aqua balance deltas match the fills exactly; `verifyFill` matches both |
| Q-E2E-2 | From Q-E2E-1: make the oracle stale → quote; refresh → quote | `DeskPriceOracleStale`, then success |
| Q-E2E-3 | outsider, mm-c, mm-x and mm-b-with-mm-a's-name each quote | `EnsGateTakerMismatch`, `EnsGateNameExpired`, `DeskPriceNoTerms`, `EnsGateTakerMismatch` |
| Q-E2E-4 | mm-a buys over its cap | `DeskPriceCapExceeded` |
| Q-E2E-5 | `ship --dock` with a new policy (w\* 60%) | One Safe tx; old hash docked; new hash live; quotes change as `priceMirror` predicts |
| Q-E2E-6 | `ship --dock --no-ship`, then any quote | `SafeBalancesForTokenNotInActiveStrategy`; `findLiveStrategy` returns null |
| Q-E2E-7 | Agent key writes `desk.spread` = 1 bps and = 500 bps; writes 3 random bytes | Spread used = 5 bps and 200 bps (clamped); random bytes → tier spread; no revert |

### 2.3 Web QA (L5)

Run on the anvil fork with the fixture, in Chrome with MetaMask, window 1280 wide. Each case: procedure → expected. Page IDs come from Treasury web app §4.1.
**Shell (W1)**

- Q-W-SHELL-1: switch MetaMask to Mainnet → danger banner, every primary button disabled, "Switch to Sepolia" works.
- Q-W-SHELL-2: connect owner 1, mm-a, outsider in turn → wallet chip shows "Safe owner 1/3", "mm-a.clients.desk.eth", "Not on the desk".
- Q-W-SHELL-3: switch roles → navigation matches Treasury web app §4.2 exactly, default page correct.
- Q-W-SHELL-4: role Treasury with mm-a's wallet → read-only banner, no blocking modal.
- Q-W-SHELL-5: every page shows the mandatory footer text exactly (Treasury web app §8).
**P0 Landing**

- Q-W-LAND-1: headline, subline and buttons match Treasury web app §5.0 word for word.
- Q-W-LAND-2: live strip values equal the Dashboard's values at the same block.
- Q-W-LAND-3: stop anvil → tiles show the empty placeholder (a single em dash character), no error block.
**P1 Dashboard**

- Q-W-DASH-1: status Live, short hash, "closes in 29 d …", mid \$4,000.00 with age.
- Q-W-DASH-2: oracle age label amber after 30 min, red plus banner after 60 min (use `evm_increaseTime`).
- Q-W-DASH-3: share bar 90.0%, target marker at 70%, label "skew −40 bps".
- Q-W-DASH-4: mm-a row bid/ask equal `quoteFor(1 WETH)` both sides; mm-a shows "Agent 20 bps".
- Q-W-DASH-5: mm-c row dimmed "Expired"; mm-x row dimmed "No terms".
- Q-W-DASH-6: after a fill from the CLI, the fill appears in Recent fills within 2 blocks without reload.
- Q-W-DASH-7: after `ship --dock --no-ship` → "Not open" state within 2 blocks.
**P2 Open a desk** (start with no live strategy)

- Q-W-OPEN-1: outsider or MM wallet → step 1 blocks with the owner message.
- Q-W-OPEN-2: defaults are 70%, 2%, 5/200, 60 min, 30 days, 900/400,000.
- Q-W-OPEN-3: floor 300 with ceiling 200 → Continue disabled, inline message; ceiling 10,000 → blocked.
- Q-W-OPEN-4: preview sentence equals `priceMirror` for mm-a 1 WETH at the current share.
- Q-W-OPEN-5: WETH amount above the Safe balance → blocked with the balance message.
- Q-W-OPEN-6: with a live desk, `/open` shows "A desk is already open…" and no Ship path (INV-12).
- Q-W-OPEN-7: Review lists "Approve WETH to Aqua", "Approve USDC to Aqua", "Ship the desk program" in order (approvals omitted if already max) and the `describeProgram` lines.
- Q-W-OPEN-8: complete O1 with owners 1 and 2 → success screen hash equals the `Shipped` log; Dashboard Live.
**O1 Safe signing**

- Q-W-SIGN-1: after signature 1, reload the page → the overlay resumes at "Switch owner" with 1 of 2.
- Q-W-SIGN-2: reconnect the same owner → "That owner has already signed."
- Q-W-SIGN-3: reject in MetaMask → overlay closes, neutral toast "Cancelled", nothing sent.
- Q-W-SIGN-4: "Copy transaction for Safe\{Wallet\}" data equals `ship.ts --print-only` output for the same plan.
- Q-W-SIGN-5: after execute, the Done step shows the result checks, all green.
**P4 Trade**

- Q-W-TRADE-1: mm-a wallet → identity strip with tier and cap; outsider → "isn't on the desk's list", Fill hidden, quote shows the refusal title.
- Q-W-TRADE-2: type 1 in ETH with Buy → exactOut; in USDC with Buy → exactIn (check the call's traits in devtools or the debug panel).
- Q-W-TRADE-3: quote expires at 15 s; Fill disabled until refreshed.
- Q-W-TRADE-4: fresh MM wallet → "Approve router" appears once, then Fill.
- Q-W-TRADE-5: fill 1 WETH buy → receipt shows the decoded DeskFill; Dashboard updates.
- Q-W-TRADE-6: stale oracle, over cap, expired name → each shows its dictionary title and hint.
- Q-W-TRADE-7: `mirrorMatches` check line shown on every successful quote.
**P5 Controls**

- Q-W-CTRL-1: Change → wizard at step 3 with current values; Review's first line is "Close the current desk (dock)".
- Q-W-CTRL-2: Stop the desk → confirm dialog text exact → O1 → Dashboard "Not open".
- Q-W-CTRL-3: create two live strategies with the CLI (ship by hand, because `--replay` is not enough) → red card and "Close all except the newest" works.
**O3 Demo tools**

- Q-W-DEMO-1: `Shift+D` opens it; set price 3,800 → mid updates within 1 block; "Make price stale" → stale banner; "Refresh" clears it.
**P6 Fills and Verify**

- Q-W-FILLS-1: list filters by MM and side.
- Q-W-FILLS-2: Verify on a normal fill and on a V4 size-floor fill → green "matches", each line's numbers equal `verifyFill`.
**P7 Program**

- Q-W-PROG-1: plain lines equal `describeProgram`; hovering a raw segment highlights its table row; segment lengths 7/10/100/97 bytes (with opcode and length bytes) for the golden program.
**P3 Counterparties**

- Q-W-CP-1: table values equal `readDeskState.mms` for all four fixture names.
- Q-W-CP-2 (only with Treasury web app §5.3): Cut off mm-b via O1 → mm-b's next quote shows "No terms".
**P8 Risk agent**

- Q-W-AGENT-1: mm-a shows agent spread 20 bps with its expiry; mm-b shows "none".
**Accessibility and projector**

- Q-W-A11Y-1: complete the wizard with the keyboard only.
- Q-W-A11Y-2: at 125% zoom on 1280 wide, P1, P2 and P4 fit without horizontal scroll.
- Q-W-A11Y-3: every status has text as well as colour.

### 2.4 Sepolia acceptance (L6, T9)

- Q-S-1: `config/sepolia.json` ENS addresses have code; router verified on Etherscan; `AQUA()` is the official registry.
- Q-S-2: `cast` checks mirroring #34 steps 4–8 pass for mm-a and fail as expected for an expired test name.
- Q-S-3: T-F-2 green.
- Q-S-4: ship from the web app (O1 with two owners) → `Shipped` log, `safeBalances` equal.
- Q-S-5: mm-a buy and sell from the Trade page; tx hashes recorded in the demo log.
- Q-S-6: agent key cannot write `desk.terms` or `addr` (INV-9): both revert `EACUnauthorizedAccountRoles`.
- Q-S-7: stale oracle and expired-name refusals reproduced on Sepolia.
- Q-S-8: emergency stop from Controls, then re-open with a new salt.

### 2.5 Demo rehearsal (L7)

- Q-D-1: full script in Demo run within its time limit, twice in a row without an S1 or S2 bug.
- Q-D-2: fallback drill: RPC down (switch RPC URL) and wallet stuck (reset account) each recovered in under 60 s.
- Q-D-3: video fallback plays from the laptop without network.

## 3. QC gate (every PR, all must pass)
```bash
# contracts
cd contracts && forge fmt --check && forge build --sizes && forge test -vv
# ts library, scripts, bot
pnpm -C ts lint && pnpm -C ts typecheck && pnpm -C ts test
# web (web PRs)
pnpm -C web lint && pnpm -C web typecheck && pnpm -C web build
# secrets (secretlint 13.0.5 with the recommended preset, installed at the repo root by T0)
pnpm secretlint "**/*"
```
Plus this checklist in the PR description, ticked:

- [ ] Only files listed in the task Spec changed (`git diff --name-only main`).
- [ ] Every acceptance check in the task Spec pasted with output.
- [ ] Test IDs named in the task Spec are present and green.
- [ ] No new dependency (or its change log line).
- [ ] The prompt file `docs/prompts/<task-id>.md` is included.
- [ ] Security checklist (Desk security §9) for the PR type is ticked.
- [ ] DeskRouter runtime size pasted (contract PRs).

## 4. Reviews

### 4.1 Review agent prompt (paste into a fresh agent with the PR branch checked out)
```javascript
You are reviewing PR <link> for task <ID> of the Desk project. Do not edit files.
Read: the task Spec page, the Desk system sections it cites, Desk security §4 and §9.
Report only real defects, most severe first, each with file:line, the spec sentence it violates,
and a one-line fix:
1. Behaviour that differs from the spec (a missing or reordered check, a wrong error name or argument,
   wrong rounding, a byte offset off by one, an event emitted in a static context).
2. Any invariant in Desk security §4 that the change weakens, or a test that no longer proves it.
3. Files changed outside the task's list; new dependencies.
4. Tests that pass without testing the claim (asserting nothing, mocks that hide the behaviour).
Run the QC gate commands (Desk testing and quality gates §3) and paste their result. Under 600 words.
```

### 4.2 Human review (before merge)

A human reviewer from the team (proposed) does these steps; who reviews and merges is in Open questions.

1. Read the review agent's report; every item is fixed or answered in the PR.
2. For contract PRs: read every revert path against the spec side by side.
3. Run the task's acceptance commands once.
4. Merge with a merge commit; set the task's Status to Done.

## 5. Bug severity and response

| Severity | Definition | Response |
| --- | --- | --- |
| S1 | Breaks an invariant (Desk security §4) or blocks the demo path | Stop other work; fix now; allowed during the freeze |
| S2 | A wrong number or wrong message on a demo screen | Fix before the next rehearsal; allowed during the freeze |
| S3 | Off the demo path, or cosmetic on the demo path | Fix if time allows before the freeze |
| S4 | Nice to have | Log only |

Log bugs in the task database as rows with Type = Bug, the severity, the failing case ID, and the task that owns the fix.

## 6. Environments and accounts

| Env | Chain | ENS | Keys | Used for |
| --- | --- | --- | --- | --- |
| Local | `anvil` (chain id 31337) | mocks from T2 | anvil defaults | L1–L3, agent work |
| Fork | `anvil --fork-url $SEPOLIA_RPC_URL --chain-id 11155111` | mocks (until T9), then real | anvil defaults | L4, L5 |
| Sepolia | 11155111 | real | the Aqua lane's `.env` (key holder proposed, see Open questions) | L6, L7 |

On the fork, the web app points at `http://127.0.0.1:8545` via `VITE_SEPOLIA_RPC_URL`; MetaMask gets a custom network with chain id 11155111 and that RPC, and imports anvil accounts 1–8 (test keys only, Desk security §7).

## 7. Release checklist (before the feature freeze)

- [ ] Q-E2E-1..7 green on the fork with the release code.
- [ ] Q-S-1..8 green on Sepolia.
- [ ] Full Q-W pass on Sepolia.
- [ ] Two Q-D rehearsals clean.
- [ ] README: what it is, how to run, addresses, "not audited", license lines.
- [ ] `NOTICE.md` lists every derived file with its date.
- [ ] Docs moved from Notion into `/docs`; prompts in `docs/prompts/`.
- [ ] Demo video recorded and playable offline.

## Open questions

| Question | Proposed default | Who answers |
| --- | --- | --- |
| Who does the human review (§4.2) and merges PRs? | A human reviewer from the team; the page Owner merges | Team |
| Who runs L4 end-to-end and L6 Sepolia acceptance? | The Aqua lane | Team |
| Who runs L5 web QA? | The web app lane together with the Aqua lane | Team |
| Who holds the Sepolia deployer and owner keys (`.env`)? | The Aqua lane | Team |

<details>
<summary>Change log</summary>

No entries while Draft.

</details>
