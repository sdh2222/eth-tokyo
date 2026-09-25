---
title: Aqua lane working rules
domain: Operations
type: Rules
status: Draft
page_code: WR
as_of: 2026-09-24
notion: https://app.notion.com/p/3e58f1ec11b48155ab06f424e706e2bc
---

# Aqua lane working rules

How the team and its coding agents work from these docs during the run.

## Scope

The Aqua lane is everything between the treasury Safe and a filled trade:

- **On-chain:** DeskRouter (a modified SwapVM v1.0.2 router) with instructions #34 EnsGate and #35 DeskPrice; MockWETH, MockUSDC, MockOracle; the deploy script.
- **Tests:** Foundry unit, integration and fork tests.
- **Off-chain:** the TypeScript desk library (used by the web app, the scripts and the bot), the Safe setup and ship scripts, the MM bot.
- **Web app flows that touch the desk** (open a desk, trade, controls, dashboard). The web app lane builds the web app; the Treasury web app page is written in the Aqua lane so the treasury flows match the contracts exactly.
The other lanes cover the rest: the ENS lane owns ENS name setup, and the web app lane owns the web app build. The risk agent's logic and the pitch deck sit outside the Aqua lane.

## Pages and precedence

| Page | What it holds |
| --- | --- |
| Desk security | Invariants, roles and permissions, key handling. Wins over everything else. |
| Desk system | The contract of truth: interfaces, byte layouts, behaviour, reverts, golden vectors. |
| Desk testing and quality gates | Test catalogue, quality gates, review checklists, bug severity. |
| Treasury web app | Information architecture, pages, flows, UI rules, design tokens, copy. |
| Demo run | The on-stage script, timings, fallbacks. |
| Desk dictionary | Terms, units, and every error with its user-facing message. |
| Task Spec (one per task) | What that task delivers, exactly: files, interfaces, behaviour, acceptance. |
| Task Plan (one per task) | How to deliver it: steps, commands, checkpoints, ready-to-paste agent prompt. |

The task Spec and Plan pages live in the "Aqua lane tasks" database.
Precedence when two pages disagree: **Desk security \> Desk system \> Desk testing and quality gates \> Treasury web app \> task Spec \> task Plan \> code comments.** A disagreement is a bug in the docs: the agent stops and reports it with a BLOCKED line (WR-03). An agent never picks one side itself.

## Roles

| Role | Who | Does | Never does |
| --- | --- | --- | --- |
| Aqua lane | Henry + coding agents | Builds DeskRouter, the desk library, the scripts and the bot. Reviews PRs after the review agent. Approves changes to the pages it owns (proposed). Merges every PR (proposed). Holds all Sepolia keys and sends every Sepolia transaction (proposed). Runs the demo (proposed). | Merges a PR whose QC gate (Desk testing and quality gates §3) is not green. |
| ENS lane | Donghyun | Names, records and resolver roles exactly as Desk system §6; hands over addresses into the config. | Changes a record format without the other lanes' yes (WR-04). |
| Web app lane | 건우 | Builds the web app from Treasury web app, calling only the desk library functions listed in Desk system §7. | Re-implements any encoding or price maths inside the app. |
| Coding agent | One agent per task, own worktree | Implements exactly its task Spec, runs its acceptance checks, opens a PR with the template in WR-09. | Edits files outside its task's list; edits any spec; touches keys or Sepolia; installs a dependency not in the task Spec. |
| Review agent | A fresh agent per PR | Adversarial review against the task Spec, Desk system and Desk security before the human review (Desk testing and quality gates §4). | Pushes code. |

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| WR-01 | A page is Draft while it is being written. The page Owner sets it Current after team review. | Everyone builds from pages the team has reviewed. | Every page in Aqua lane docs and Aqua lane tasks | Page Owner | Treat the page as Draft and raise it with the team. |
| WR-02 | A Current page changes only after its Owner's OK. Each change adds a line to the page's change log: `date · what changed · why · link`. | Every change to a page people build from is visible and traceable. | Every Current page | Page Owner | Revert the edit until the Owner gives the OK and the log line exists. |
| WR-03 | An agent that hits a gap or a disagreement between pages writes, at the top of its PR or in chat, `BLOCKED: <page and section> · <question> · <two options>` and stops. | Gaps get answered by the page Owner, not guessed in code. | Coding agents, review agents | Review agent, Aqua lane review | The PR goes back; the gap is raised with the page Owner. |
| WR-04 | A change to an interface between lanes (record formats, event fields, library function signatures, config keys) also needs a yes from the other lane. | Each lane builds against the other's interface in parallel. | All lanes | Page Owner | The change is reverted until the other lane says yes. |
| WR-05 | Byte layouts and golden vectors (Desk system §9) change only together with the reference script, in the same change. | The golden vectors stay reproducible from the reference script. | Desk system, reference script, tests | Review agent, QC gate | The PR is not merged. |
| WR-06 | Definition of ready. A task may start when: (1) every task it depends on is merged into `main`; (2) its Spec and Plan pages are complete (no open question marked in them); (3) any config values it reads exist in `config/sepolia.json` or are marked as placeholders the task may use. | An agent starts only on work it can finish without guessing. | Every task | Aqua lane, before starting the agent | The task waits. |
| WR-07 | Definition of done. A task is done when: (1) every acceptance check in its Spec passes, with the output pasted in the PR; (2) the QC gate in Desk testing and quality gates §3 is green; (3) the review agent's findings are fixed or answered; (4) the PR is merged; (5) the task's Status in the task database is set to Done, with the merge commit. | "Done" means the same thing for every task. | Every task | Review agent, Aqua lane review | The task stays open. |
| WR-08 | Branch `aqua/<task-id>-<slug>` from `main`; worktree `../desk-<task-id>`. Commits cite the spec: `feat(#35): exactOut rounding (Desk system §5.4 step 9)`. | Parallel agents do not collide, and every commit traces to a spec section. | Coding agents | Review agent | Rename the branch or reword the commits before merge. |
| WR-09 | PR description template: **Task** (ID and link) · **What changed** · **Spec sections implemented** · **Acceptance output** (pasted) · **QC gate** (checklist from Desk testing and quality gates §3, ticked) · **Deviations** (should be "none"; otherwise a link to the change log line) · **Prompts used** (link to the prompt file in `docs/prompts/`). | Reviewers check every PR the same way. | Coding agents | Review agent | The PR is not reviewed until the template is complete. |
| WR-10 | Every agent prompt that produced code is saved in `docs/prompts/<task-id>.md` in the same PR. | ETHGlobal rules on AI use require disclosure. | Coding agents | Review agent | The PR is not merged. |
| WR-11 | All specs, plans and prompts go into the submission repo's `/docs` before submission (moved from Notion at the end). Human decisions stay visible: reviews and merges, change approvals, and the Sepolia transactions from the team's keys. | ETHGlobal rules on disclosure and AI use. | Team | Team, before submission | The submission is not sent until the docs are in the repo. |
| WR-12 | Pre-event work (these docs and diagrams) is disclosed in writing to ETHGlobal at kick-off. | ETHGlobal rules on pre-event work. | Team | Team, at H0 | Disclose it as soon as it is noticed. |
| WR-13 | A claim not checked against code, chain or a measurement carries "(unverified)" right after it (e.g. ENS addresses not confirmed on-chain, gas estimates not measured, external facts). | Readers know which facts to check before relying on them. | Every page | Page Owner, review agent | Add the marker, or check the claim and cite the source. |

## Timeline

Proposed windows, in hours after kick-off (H0 = Fri 25 Sep, 21:00 JST).

| Window | Goal | Exit criterion |
| --- | --- | --- |
| H0–H1 | T0 scaffold merged; build-day checks C1, C2, C5 done; 1inch Discord question posted | `make check` green on `main`; config has live ENS addresses |
| H1–H7 | Wave 1: T1, T2, T2b, T3, T5, T6a in parallel (web: W1–W4 on fixtures) | All merged; T2b gas numbers posted |
| H7–H10 | Wave 2: T4, T8, then T5b (desk client + fixture) | T-I and T-TS-5..11 green; web switches from fixtures to the desk client |
| H10–H12 | Wave 3: T6b, T7, T8b | Q-E2E-1..7 green on an anvil Sepolia fork |
| H12–H16 | T9 Sepolia bring-up with the ENS lane; web app wired to the live desk | First real buy and sell on Sepolia from the web app |
| H16–H20 | Demo hardening: rehearsal 1 and 2 (Demo run), fix S1/S2 bugs only | Two clean rehearsals under the time limit |
| Last 4 h before submission | **Feature freeze.** Only S1 fixes. Record the demo video. Move docs to the repo. Submit. | Submitted with video, repo, disclosure |

Check the exact submission deadline at kick-off and write it here: `SUBMISSION DEADLINE: ____ JST`.

## Open questions

The proposed default applies until the question is answered.

| Question | Proposed default | Who answers |
| --- | --- | --- |
| Who owns MM names (treasury or MM)? | Treasury owns all names (Desk system A1). | Team |
| Who builds the risk agent? | 건우, after the web app core pages. | Team |
| Does 1inch accept a Sepolia submission? | Yes, based on the Batas precedent (unverified); ask on Discord at H0. | Aqua lane |
| Safe threshold for the demo | 2-of-3, signed in the web app with two owner accounts (Treasury web app §7). | Aqua lane + web app lane |
| Who can set a page Current besides its Owner? | Only the page Owner, after team review. | Team |
| Who holds the Sepolia keys and sends Sepolia transactions? | Henry (Aqua lane) holds all Sepolia keys and sends every Sepolia transaction. | Team |
| Who merges PRs? | Henry (Aqua lane) reviews and merges every PR. | Team |

<details>
<summary>Change log</summary>

No entries while Draft.

</details>
