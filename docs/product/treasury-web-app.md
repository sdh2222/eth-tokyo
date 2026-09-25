---
title: Treasury web app
domain: Product
type: Explainer
status: Draft
as_of: 2026-09-24
written_from: [Desk system, Desk security, Treasury web app look and feel]
notion: https://app.notion.com/p/3e58f1ec11b481689842feecea36b404
---

# Treasury web app

This page covers the treasury web app: its screens, overlays, roles, flows, formatting, copy, data freshness, tech stack and build order.
The web app is where judges see the product. A demo visitor plays a DAO treasury: opens a desk, watches named market makers trade against it, changes the policy and stops it. The web app lane builds it. This page proposes what exists, where, in which order of importance, and how it behaves, so the web app lane designs as little as possible during the run. Visual design is described in text only. Every data read and every transaction comes from the desk client (Desk system §7.2).

## 1. Who uses it and what they must understand

| Persona | Goal in the demo | The one thing they must leave knowing |
| --- | --- | --- |
| Treasury operator (a Safe owner of the DAO) | Open a desk once, watch it sell, adjust or stop it | "One multisig signature turned our treasury into a maker. Tokens never left the Safe." |
| Market maker (a named counterparty) | Get a quote and fill | "I get my own price because of my name, and the price is computed on-chain." |
| Observer / judge | Check that it is real | "Every fill can be recomputed from public data, and an unnamed wallet cannot trade." |

## 2. Principles (tie-breakers for any UI question)

1. **Show the program, not a black box.** Every price on screen can be traced to the shipped program, the oracle and the ENS records.
2. **The chain is the only state.** The UI shows only values it read or can recompute. After a transaction, wait for the receipt, then re-read (no optimistic numbers).
3. **One primary action per screen.** Secondary actions are text buttons or live in Controls.
4. **Plain English first, raw data one click away.** Every plain sentence has a "Show raw" toggle with the exact values.
5. **Refusals are features.** When the router refuses (expired name, stale oracle, over cap), the UI shows why in one sentence, because the refusal is part of the pitch.

## 3. Roles, wallets and the header

- The header (every page except Landing) holds, left to right: product mark and name **Desk**, the role switcher, the page navigation, then the network chip and the wallet chip.
- **Role switcher**: a segmented control `Treasury | Market maker | Observer`. It changes the navigation and the default page only. It grants nothing: what a wallet can do is decided on-chain.
- **Wallet chip**: shows the connected address, shortened, plus what it is to the desk: `Safe owner 1/3`, `mm-a.clients.dao-treasury-a.eth`, or `Not on the desk`. Detected from `readDeskState` (MM addresses) and the Safe owners list.
- **Network chip**: `Sepolia` in neutral; anything else in red with "Switch to Sepolia" (SEC-08).
- **Role and wallet mismatch** (for example, role Treasury with an MM wallet): the page renders read-only and shows an inline banner: "Connect a Safe owner wallet to act as the treasury." It is an inline banner, not a blocking modal.

## 4. Information architecture

### 4.1 Screens (9) and overlays (4)

| ID | Route | Screen | Roles that see it in the nav | Primary action |
| --- | --- | --- | --- | --- |
| P0 | `/` | Landing | public, no nav | Open the live demo |
| P1 | `/desk` | Dashboard | all (default for Treasury and Observer) | none (read); links to Trade or Controls |
| P2 | `/open` | Open a desk (6-step wizard) | Treasury | Propose to Safe |
| P3 | `/counterparties` | Counterparties | Treasury, Observer | Edit terms (Treasury) |
| P4 | `/trade` | Trade | Market maker (default) | Fill |
| P5 | `/controls` | Controls | Treasury | Change policy (re-ship) · Emergency stop |
| P6 | `/fills` and `/fills/:tx` | Fills and Verify a fill | all | Verify |
| P7 | `/program` | The program | all | none (read) |
| P8 | `/agent` | Risk agent | Observer, Treasury | none (read) |

Overlays: **O1** Safe signing flow (§7), **O2** Wallet transaction (MM approve and fill), **O3** Demo tools drawer (§5.10), **O4** Toasts.

### 4.2 Navigation per role (left to right)

- Treasury: Dashboard · Open a desk (hidden while a desk is live; Controls takes over) · Counterparties · Controls · Fills · Program
- Market maker: Trade · Dashboard · Fills · Program
- Observer: Dashboard · Fills · Program · Counterparties · Risk agent

### 4.3 Global banners (top of content, in priority order; show at most two)

| Condition (from the desk client) | Level | Text | Action |
| --- | --- | --- | --- |
| Wrong network | danger | You're on the wrong network. The desk runs on Sepolia. | Switch to Sepolia |
| `findLiveStrategy` warning `MULTIPLE_LIVE` | danger | More than one desk program is live on this Safe. | Go to Controls |
| `oracleStale` | warning | The price feed is older than N minutes, so trading is paused. | (Demo tools: Refresh price) |
| No live strategy | info | No desk is open. The treasury hasn't shipped a program yet, or it was stopped. | Open a desk (Treasury only) |
| Deadline within 24 h | warning | This desk closes in 5 h 12 m. | Controls |
| RPC errors on 3 consecutive reads | warning | Can't reach Sepolia right now. Showing the last data from 14:03:22. | Retry |

## 5. Pages

Each page lists its information hierarchy (L1 = the first thing the eye must land on), its components, its states and its data. QA cases are in Desk testing and quality gates §2 under `Q-W-<PAGE>-n`.

### 5.0 P0 Landing (`/`)

**Purpose:** in 20 seconds a judge understands the idea and clicks into the live desk.

1. **Hero (L1).** Headline: "An OTC desk in your wallet." Subline: "A DAO treasury quotes its own two-sided price to market makers it names. Tokens stay in the multisig until each fill. The price is computed on-chain." Primary button: "Open the live demo" → `/desk`. Secondary text link: "How it works" (scrolls).
2. **Live strip (L2).** Four stat tiles read live: Desk status · ETH share vs 70% target · Oracle mid · Fills today. If nothing is live, the tiles show "Not open".
3. **The problem (L2).** Three lines, from the idea page: "In 2023 ENS DAO sold 10,000 ETH in one trade with a 2% slippage budget (\$323k). Each tranche would have needed its own vote. The DAO was a price taker on its own inventory." (unverified)
4. **How it works (L3).** Three numbered steps with one line each: "1. The Safe ships a pricing program to 1inch Aqua. 2. Named market makers (ENS names) trade against it; the price shades toward a 70/30 target. 3. Tokens move Safe ↔ MM only at fill time." Then the fill diagram (docs/diagrams 02, exported PNG).
5. **Verify it yourself (L3).** "Every fill can be recomputed from public data." Link to `/fills`.
6. **Footer.** "Sepolia testnet · not audited · Powered by SwapVM. Copyright © 2025 Degensoft Ltd. · Built on 1inch Aqua and ENSv2 (not affiliated) · ETHGlobal Tokyo 2026" and the repo link.
States: live strip loading shows skeleton tiles; RPC failure shows an em dash character (U+2014) in the tiles. The landing page shows no error block.

### 5.1 P1 Dashboard (`/desk`)

**Purpose:** the state of the desk at a glance, readable from the back of a room.
Layout: 12-column grid, max width 1280.

1. **Status bar (L1, full width).** Desk status pill (`Live` green · `Stopped` gray · `Not open` gray) · strategy hash (short, copy) · "closes in 29 d 23 h" · Oracle mid "\$4,000.00" with age "updated 12 s ago" (amber when over half of max age, red when stale).
2. **Inventory card (L1, 5 columns).** Two big numbers: WETH and USDC in the desk (Aqua virtual balances). Below them, the **ETH share bar**: a horizontal bar 0-100% with the current share filled in the treasury colour, a vertical marker at the target (70%), and the label "90.0% ETH · target 70% · skew −40 bps". Small line under it: "In the Safe: 900.0000 WETH · 400,000.00 USDC" (real balances).
3. **Quote board (L1, 7 columns).** Table, one row per MM name from config: Name · Status badge · Tier · Agent spread (with "until 18:40") · Spread used · **Bid** · **Ask** · Cap per fill. Bid and ask in the mono font, large. Rows with a non-ok status are dimmed with the reason in the badge (`Expired`, `No terms`, `Wrong resolver`, `No address`). A footnote: "Prices for a 1 ETH fill. Larger fills can carry a size floor."
4. **Recent fills (L2, full width).** The last 10 fills: time · MM · side ("bought ETH" / "sold ETH") · size · price · vs mid (bps) · spread (source badge: Tier / Agent / Size floor) · "Verify" link. Empty state: "No fills yet. Market makers see this desk on the Trade page."
5. **Price chart (L3, optional, only if time allows).** Oracle mid as a line with fills as dots (green bids, red asks) for the last 2 hours.
Data: `findLiveStrategy`, `readDeskState` every new block; `readFills` every new block.
States: loading skeletons; no live strategy → status "Not open", inventory and quote board replaced by one empty card "No desk is open" with (Treasury) "Open a desk".

### 5.2 P2 Open a desk (`/open`, wizard)

**Purpose:** a treasury opens the desk with one multisig transaction and knows exactly what it signed.
Wizard frame: a left stepper (6 steps, the current one bold), content on the right, footer with "Back" and "Continue". Every step validates before Continue enables. Values persist while navigating back and forth (in memory only).

1. **Treasury.** Shows the Safe from config: address, owners (with "you" marked), threshold "2 of 3", balances. Blocks with an inline message if the connected wallet is not an owner.
2. **Market.** Pair "WETH / USDC" (the only pair, shown as read-only), price feed address, current price and age. Explains in one line: "The desk prices off this feed. If it is older than the limit you set, trading pauses."
3. **Policy (L1 of the wizard).** Controls, each with a one-line explanation and its default:
	- Target ETH share: slider 50-90%, step 5, default **70%**.
	- Skew strength κ: segmented `1% · 2% · 4%`, default **2%** ("how hard the price leans toward the target").
	- Spread floor and ceiling: two bps inputs, defaults **5** and **200**, shown with % in grey ("the agent can only move spreads inside this range").
	- Price feed max age: segmented `15 min · 60 min · 3 h`, default **60 min**.
	- Desk open for: segmented `7 · 30 · 90 days`, default **30 days**.
	- **Live preview panel** on the right: a line chart of ask and bid (for a 10 bps name, 1 ETH) against ETH share 0-100%, with a dot at the current share and a dashed line at the target; under it one sentence computed with `priceMirror`: "Right now mm-a would buy 1 ETH at 3,987.98 USDC (30 bps under mid)."
4. **Inventory.** Two amount inputs (WETH, USDC) with "Max" buttons, defaults from config (900 / 400,000). Shows the resulting ETH share and "above / below target". Blocks amounts above the Safe's real balance: "The Safe holds only 900 WETH."
5. **Counterparties.** Read-only list from ENS of who will be able to trade (the Quote board columns without prices). Line: "The list lives in ENS, not in this program. You can change it later without reopening the desk."
6. **Review.** Three blocks:
	- "What you are signing": each `PlannedTx.label` in order (for example "Approve WETH to Aqua", "Approve USDC to Aqua", "Ship the desk program").
	- "The program, in plain English": `describeProgram` lines, then "Show raw" (the P7 view inline).
	- "What does not happen": "No tokens move now. They leave the Safe only when a named market maker fills."
	Primary: **Propose to Safe** → O1.
Success screen: "Your desk is live." Strategy hash, block, explorer link, and "Go to dashboard".
If a desk is already live, `/open` shows: "A desk is already open. Change it from Controls." (INV-12).

### 5.3 P3 Counterparties (`/counterparties`)

**Purpose:** see and manage who may trade, on what terms, until when.

- **Table (L1):** Name · Address (short, copy) · Expires (date + "in 12 d", red if expired) · Tier · Cap per fill · Agent spread (value, valid until, or "none") · Status.
- **Row actions (Treasury, Safe owner wallet):** "Edit terms" (tier bps, cap USDC) and "Cut off" (sets cap to 0). Both open O1 with the planned ENS write. These exist only if the desk client exposes `planSetTerms` and `planCutOff` (see §15); otherwise the actions are hidden and a note says "Terms are managed by the ENS lane".
- **Explainer (L3):** "Each market maker is a name under clients.dao-treasury-a.eth. Its address, tier and cap live in its ENS records; the desk reads them at every fill. When the name expires, it can no longer trade."

### 5.4 P4 Trade (`/trade`)

**Purpose:** a market maker gets its own price and fills in two clicks.

1. **Identity strip (L1).** "Trading as mm-a.clients.dao-treasury-a.eth · tier 10 bps · cap 100,000 USDC per fill". If the wallet is not a listed name: "This wallet isn't on the desk's list. You can still ask for a quote to see the desk refuse it." (quote allowed, Fill hidden).
2. **Order form (L1).** Side toggle `Buy ETH | Sell ETH`. One amount input with a unit toggle `ETH | USDC` (the leg rule in Desk system §8.4). Slippage setting behind a gear, default 10 bps.
3. **Quote panel (L1).** Refreshes 400 ms after the last keystroke. Shows: You pay · You receive · Price (USDC per ETH) · vs mid (± bps) · Spread used with its source badge. A 15-second countdown ring; at zero the quote greys out and "Refresh quote" appears. A small line "Checked against the on-chain formula ✓" when `mirrorMatches`.
4. **Primary button:** "Approve router" if `planMmApprovals` returns anything, then "Fill". Opens O2.
5. **Refusals:** any quote error renders in the quote panel as the dictionary title and hint (Desk dictionary §3), for example "Your name has expired. Ask the treasury to renew it."
6. **After a fill:** a receipt card with the decoded DeskFill, the tx link and "Verify this fill".

### 5.5 P5 Controls (`/controls`)

**Purpose:** change or stop the desk safely.

1. **Current program (L1):** `describeProgram` lines, deadline, strategy hash, "Show raw".
2. **Change policy or inventory:** "Change" opens the wizard at step 3 with current values. On Review, the first planned transaction is "Close the current desk (dock)", then "Ship the new program". Explainer: "A shipped program can't be edited. Changing it closes the old one and opens a new one in the same transaction."
3. **Emergency stop (L1 for danger):** a red outline button "Stop the desk". Confirm dialog: "Market makers will not be able to trade until you open a new desk. Tokens stay in the Safe." → O1 with `planDock`.
4. **Multiple live strategies:** if `MULTIPLE_LIVE`, a red card lists them with "Close all except the newest".
5. **What changes without reopening (L3):** a short table from Desk system §4.3 (oracle, agent spread, terms, names).

### 5.6 P6 Fills (`/fills`) and Verify a fill (`/fills/:tx`)

- **Fills list:** columns as the Dashboard's recent fills, plus filters (MM, side) and pagination by 25.
- **Verify a fill (L1 = the verdict):** a green "Recomputed ✓ matches on-chain" or red "Does not match". Below, the recomputation as numbered lines with real numbers (from `verifyFill`): mid → ETH share before → skew → reference price r → spread used and why → ask or bid → amount. Each line shows the formula in mono and the value. Footer: "Anyone can do this: the event carries every input."

### 5.7 P7 The program (`/program`)

- Plain-English lines (L1).
- Table of decoded arguments grouped by instruction (#13, #20, #34, #35), each with its meaning (L2).
- Raw bytes (L3) in mono, segmented and coloured per instruction: opcode byte, length byte, arguments. Hover on a segment highlights its row in the table.

### 5.8 P8 Risk agent (`/agent`)

- Agent identity: `risk.agents.dao-treasury-a.eth` → address.
- Table per MM: current agent spread, valid until, clamped value, and whether it is in force.
- Text of `desk.stats` if present.
- Explainer: "The agent can only change one number per market maker, inside the range the treasury set. It can't block trading."
- Owned by the agent lane for anything beyond reading ENS.

### 5.9 O1 and O2 overlays

See §7.

### 5.10 O3 Demo tools drawer

Opened with the keyboard shortcut `Shift+D` or `?demo=1`. It stays out of the navigation. Needs the deployer wallet for oracle actions.

- Set oracle price (input, default current), "Refresh price now" (same price, new timestamp), "Make price stale" (sets updatedAt to now − 2 h).
- A read-only checklist for the presenter: current wallet, role, desk status.

## 6. Numbers, units and time

| Kind | Display rule | Example |
| --- | --- | --- |
| USDC amount | 2 decimals, thousands separators, unit after | 400,000.00 USDC |
| WETH amount | 4 decimals, thousands separators; full precision in a tooltip | 24.7597 WETH |
| Price | USDC per ETH, 2 decimals, `$` prefix only for the oracle mid | 3,987.98 · mid \$4,000.00 |
| Spread and skew | bps first, percent in grey | 10 bps (0.10%) |
| Versus mid | signed bps; green when better for the treasury, red when worse | −30 bps |
| ETH share | percent, 1 decimal | 90.0% |
| Time | relative within 24 h ("12 s ago", "in 5 h 12 m"), else absolute; absolute always in JST with the zone | 2026-10-25 21:00 JST |
| Address / hash | first 6 and last 4 characters, mono, copy button, explorer link | 0x1bd2…09f6 |
| ENS name | full name, never shortened | mm-a.clients.dao-treasury-a.eth |

Rules: plain decimal notation only (no scientific notation); show the exact, unrounded number for anything the user will sign (in the review step); formatting happens only in the UI (the desk client returns bigint); a number that could not be read shows an em dash character (U+2014), never 0.

## 7. Signing flows

### 7.1 O1 Safe signing (2-of-3), all Treasury transactions

The demo keeps the multisig real: two owner accounts sign in the same browser, one after the other.

1. **Review** (from the page that started it): the list of `PlannedTx.label`s, the MultiSend target, and the plain-English summary. Button: "Sign as owner".
2. **Signature 1 of 2**: the connected wallet signs the Safe transaction hash (EIP-712, through protocol-kit in the browser). The overlay shows "1 of 2 signatures".
3. **Switch owner**: text "Switch your wallet to another Safe owner (Owner 2 or 3). This window will wait." The overlay watches the wallet's account and moves on when it is a different owner. If the same owner reconnects: "That owner has already signed."
4. **Signature 2 of 2 and execute**: the second owner signs and executes in one transaction. Button: "Sign and execute".
5. **Confirming**: spinner with the tx hash link; waits for 1 confirmation.
6. **Done**: re-reads the chain, then shows the result checks (for a ship: "Desk is live · strategy 0x3fa1…c2d0 · 900 WETH / 400,000 USDC committed"). If a check fails, show the failure and the raw receipt link.
Pending signatures (never keys) are kept in memory and in `localStorage` under the Safe transaction hash, so a page reload in step 3 keeps signature 1. They are dropped after execution or after 30 minutes.
Fallback (if protocol-kit misbehaves in the browser): the overlay offers "Copy transaction for Safe\{Wallet\}", which shows the MultiSend target and calldata to paste into the Safe web app. Same data as `ship.ts --print-only`.

### 7.2 O2 wallet transaction (market maker)

Approve and fill are plain wallet transactions from the MM's own address. The overlay shows: what will happen (one sentence), the wallet prompt, then pending with the tx link, then the result (for a fill, the decoded DeskFill). A rejected signature closes the overlay with a neutral toast "Cancelled", not an error.

## 8. Copy rules

- English UI, sentence case, no exclamation marks.
- Buttons are verbs: "Open the live demo", "Continue", "Propose to Safe", "Sign as owner", "Get quote", "Fill", "Stop the desk".
- One term per concept, from Desk dictionary: "desk", "program" (never "strategy" in the UI; "strategy" is the Aqua term used in code), "market maker" (never "taker" in the UI), "spread", "ETH share", "cap per fill", "name".
- Every refusal message = dictionary title + hint (Desk dictionary §3). Raw revert data appears only under "Show details".
- Footer on every page: "Sepolia testnet · not audited · Powered by SwapVM. Copyright © 2025 Degensoft Ltd. · Built on 1inch Aqua and ENSv2 (not affiliated)".
- Never "1inch Desk", never a 1inch or ENS logo.

## 9. Data freshness

| Data | Source | Refresh |
| --- | --- | --- |
| Live strategy | `findLiveStrategy` | on load, after every confirmed Treasury transaction, and every 60 s |
| Desk state (balances, share, oracle, MM statuses) | `readDeskState` | every new block (watch block number, about 12 s on Sepolia) |
| Fills | `readFills` from the last seen block | every new block |
| Quote (Trade) | `quoteFor` | 400 ms after typing stops; expires after 15 s |
| Oracle age label | derived from `oracleUpdatedAt` | ticks every second on the client |

Use TanStack Query with the block number in the query key for block-driven data. After any confirmed transaction, invalidate everything.

## 10. Look and feel

Design tokens, components and accessibility rules (formerly §10 to §12) live on [Treasury web app look and feel](../design/look-and-feel.md).

## 13. Tech defaults for the web app

The web app lane may change these with a note to the page Owner (proposed, see §15); the interfaces to the desk client stay as specified in Desk system §7.2.

- Vite + React 18 + TypeScript (strict), React Router.
- wagmi 3.7.7 + viem 2.56.8 for wallet and reads; MetaMask (EIP-6963) as the tested wallet.
- TanStack Query 5.103.2 for data; block number in the query keys.
- `@safe-global/protocol-kit` 8.0.7 in the browser for O1.
- Styling: CSS variables for the tokens in Treasury web app look and feel, with Tailwind configured to use only those tokens (no raw hex in components).
- Charts (preview and optional price chart): Recharts.
- Imports `@desk/lib` from the monorepo (`ts/`); no copied encoders.
- Config: reads `config/sepolia.json` at build time; RPC URL from `VITE_SEPOLIA_RPC_URL` (SEC-14).
- Static build, deployable to any static host; the demo can also run from `pnpm dev` on the laptop.

## 14. Suggested build order for the web app (web app lane)

| ID | Work | Needs |
| --- | --- | --- |
| W1 | App shell: header, role switcher, wallet and network chips, banners, tokens, footer | T0 |
| W2 | P1 Dashboard with fixtures, then wired to `readDeskState` / `readFills` | W1, T5b |
| W3 | P4 Trade + O2 | W1, T5b |
| W4 | O1 Safe signing overlay | W1, T5b (`planMultiSend`) |
| W5 | P2 Open a desk wizard | W4 |
| W6 | P5 Controls | W4, W5 |
| W7 | P6 Fills + Verify, P7 Program | W2 |
| W8 | P0 Landing, P3 Counterparties, P8 Agent, O3 Demo tools | W2 |
| W9 | Web QA pass (Desk testing and quality gates §2 Q-W-\*) and the projector check | all |

Until T5b merges, W2 to W4 build against a fixture module with the same function signatures as the desk client (Desk system §7.2), returning the Desk system §9 vector states.

## 15. Open questions

| Question | Proposed default | Who answers |
| --- | --- | --- |
| Counterparty edits from the UI need `planSetTerms` and `planCutOff` in the desk client. Where do they come from? | Add them to T5b. If the ENS lane already ships equivalents, use theirs. | Team |
| Does the web app offer "Add a market maker" (register a new subname)? | No. It is the ENS lane's flow; P3 links to the ENS lane's instructions. | ENS lane |
| Who may change the tech defaults in §13? | The web app lane, with a note to the page Owner. | Team |

<details>
<summary>Change log</summary>

No entries while Draft.

</details>
