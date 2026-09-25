---
title: Demo run
domain: Product
type: Explainer
status: Draft
as_of: 2026-09-24
written_from: [Treasury web app, Desk system]
notion: https://app.notion.com/p/3e58f1ec11b481fa9daad3adc8d8c962
---

# Demo run

This page covers the live demo for the judges: the story, every click and spoken line, the chain state needed beforehand, and what to do when something breaks.
The demo is the product for the judges. Timings assume a 4-minute live slot; the video version is the same script cut to 3:30. Who presents, who drives and who holds the keys are proposals, listed in Open questions (§10).

## 1. The story in one breath

"ENS DAO paid the spread to sell 10,000 ETH. With this, it would have earned it. One multisig signature turns the treasury into a desk: it quotes its own price to market makers it names in ENS, the price leans toward a 70/30 target by itself, tokens stay in the Safe until each fill, and anyone can recompute every fill." The ENS DAO sale figures are taken from the idea page (unverified).
The four claims the demo must prove, from the idea page:

1. **You choose who trades, and on what terms.** Two named MMs get different prices; an unnamed wallet is refused.
2. **Policy-driven selling with no votes and no bot.** Fills move inventory and the quote moves with it.
3. **Mandates end by themselves.** An expired name is refused.
4. **Only the spread is delegated.** The agent changes one MM's spread; the price stays inside the treasury's range.

## 2. Stage setup

- Laptop: Chrome, one window 1280 × 800, zoom 125%, bookmarks bar hidden. Tabs: (1) the web app on `/`, (2) Etherscan on the Safe address.
- MetaMask accounts, renamed in this order: `Owner 1`, `Owner 2`, `mm-a`, `mm-b`, `Outsider`, `Deployer`. Each has at least 0.3 Sepolia ETH.
- A terminal (hidden behind the browser) in the repo with `.env` loaded and these ready: `pnpm bot fill --mm mm-a --side buy --weth 10` and `pnpm ship --dock --no-ship`.
- The recorded video on the desktop, playable offline.
- Roles (people proposed in §10):

| Role | Job |
| --- | --- |
| Driver | Clicks through the script, switches MetaMask accounts, runs the hidden terminal fallbacks. |
| Narrator | Speaks the lines in §4. |
| Keys and agent | Holds the Sepolia keys on the demo laptop and writes mm-a's spread with the agent key at 3:00. |

If only one person presents, the Driver speaks and the Narrator watches the clock and holds up a 30-second card.

## 3. Chain state before the demo (T−30 min checklist)

- [ ] No desk is live on the demo Safe (the demo opens it). Check: Dashboard shows "Not open".
- [ ] Oracle refreshed within the last 10 minutes at \$4,000 (Demo tools → Refresh). Max age is 60 minutes, so refresh again at T−5.
- [ ] Safe holds at least 900 WETH and 400,000 USDC.
- [ ] mm-a and mm-b hold tokens and have approved the router (Trade shows "Fill", not "Approve router").
- [ ] ENS: mm-a (tier 10, cap 100,000) and mm-b (tier 25, cap 50,000) live; `mm-c` expired; no agent spread on mm-a yet.
- [ ] Agent key ready to write mm-a's spread (agent lane's command, or `cast send` prepared in the terminal).
- [ ] MetaMask on `Owner 1`, no pending transactions (Settings → Advanced → Clear activity if in doubt).
- [ ] Rehearsed within the last 3 hours (Q-D-1).

## 4. Script (4:00)

| Time | Screen and clicks (Driver) | Spoken (Narrator) |
| --- | --- | --- |
| 0:00–0:25 | Landing page, hero visible. | "In 2023 ENS DAO sold 10,000 ETH in one trade, budgeting 2% slippage, because every tranche needed its own vote. The DAO was a price taker on its own inventory. We make the treasury the maker." (unverified) |
| 0:25–0:40 | Click "Open the live demo". Role: Treasury. Dashboard shows "Not open". Click "Open a desk". | "This is the DAO's Safe on Sepolia. Nothing is open yet." |
| 0:40–1:05 | Continue through Treasury and Market. On Policy, drag the target to 70% and point at the preview sentence. | "The DAO sets a policy once: hold 70% ETH, lean the price toward it, keep spreads between 5 and 200 basis points. Right now the treasury is 90% ETH, so it offers ETH 30 bps under the market." |
| 1:05–1:20 | Inventory (defaults) → Counterparties → Review. Point at "What does not happen". | "It's one transaction: approve, and ship this program to 1inch Aqua. No tokens move. They stay in the Safe until a market maker fills." |
| 1:20–1:45 | Propose to Safe → sign as Owner 1 → switch MetaMask to Owner 2 → Sign and execute. While it confirms, keep talking. | "A real 2-of-3 multisig, so a second owner signs. That's the one vote. After this, nobody on the DAO side has to do anything per trade." |
| 1:45–2:20 | Done → Dashboard: Live, share bar at 90%, quote board. Switch MetaMask to mm-a, role Market maker → Trade. Buy 10 ETH → quote → Fill. | "mm-a is a named market maker: its ENS name carries its address, its tier and its cap. It buys 10 ETH at its own price. The router checked the name and computed the price on-chain, and Aqua moved the tokens straight between the Safe and mm-a." |
| 2:20–2:40 | Back to Dashboard: share dropped, ask moved up. Switch to mm-b → Trade → same 10 ETH quote (worse, tier 25). | "The treasury got closer to its target, so its price rose by itself. mm-b is on a different tier, so it gets a different price for the same size." |
| 2:40–3:00 | Switch to Outsider → quote refused. Then the `mm-c` scenario: switch to the mm-c-mapped wallet if prepared, otherwise show Counterparties with mm-c Expired and its refusal on the Dashboard row. | "A wallet without a name can't trade. And mandates end by themselves: mm-c's name expired, so the desk refuses it. Nobody had to switch it off." |
| 3:00–3:20 | Agent writes mm-a's spread (terminal or agent UI). Dashboard: mm-a row shows "Agent 40 bps". | "The risk agent holds one key: the spread record. It just widened mm-a's spread. It can't touch the address, the cap or the expiry, and the router keeps its value inside the treasury's range." |
| 3:20–3:40 | Fills → Verify on mm-a's fill: green "matches". | "Every fill carries its inputs. Anyone can recompute the price. Here it is, step by step." |
| 3:40–4:00 | Program page, plain-English view. | "Two new SwapVM instructions: one asks ENS who may trade, one prices the fill. Aqua keeps custody in the multisig. One vote, one program, and the treasury is a desk." |

If the slot is 3 minutes: drop 2:20–2:40 (mm-b) and 3:00–3:20 (agent) and say both in one sentence each on the Program page.

## 5. Fallbacks (proposed)

| Failure | Detect | Do (within 15 s) |
| --- | --- | --- |
| Safe signing stalls in the browser | Overlay stuck more than 20 s | Say "Sepolia is slow, here's the same step from our rehearsal" and play the video from 1:05 to 1:45; then continue live on the Dashboard if the desk became live, else continue in the video |
| Fill fails with a stale oracle | Stale banner | `Shift+D` → Refresh price → retry. Turn it into a line: "the desk refuses to trade on an old price" |
| MetaMask account switch confusion | Wrong wallet chip | The wallet chip tells you who you are; switch again. Sign only once the chip shows the intended account |
| RPC errors | "Can't reach Sepolia" banner | Switch `VITE_SEPOLIA_RPC_URL` to the backup (prepared second tab of the app built with the backup RPC) |
| Web fill broken | Error that is not a planned refusal | Run `pnpm bot fill --mm mm-a --side buy --weth 10` in the terminal; the Dashboard picks it up |
| Anything else | Any other unexpected state | Play the video from the current step. Keep debugging off stage |

## 6. Pain points found in planning, and their fixes

- **12-second blocks.** Every step that waits has a spoken line prepared (the script's long lines sit on the waits).
- **Oracle staleness during long judging queues.** Max age 60 min; refresh at T−5 and between judging rounds (Demo tools).
- **Wallet switching on stage.** Named accounts in a set order; rehearse the switch path; the wallet chip always shows who is connected.
- **Opening the desk live means it must not be open before.** After each rehearsal, run `pnpm ship --dock --no-ship` so the next run starts from "Not open".
- **Faucets fail at events.** Fund every account with Sepolia ETH before arriving.
- **mm-c must already be expired.** The ENS lane registers it with an expiry in the past (or a short one that lapses before judging).

## 7. Video (submission)

- Length 3:30, 1080p screen recording plus voice, same script minus the slow waits (cut them).
- Recorded at the feature freeze (Aqua lane working rules, Timeline), after rehearsal 2.
- Opening card: "Desk: an OTC desk in your wallet"; closing card: repo link, "Powered by SwapVM. Copyright © 2025 Degensoft Ltd.", "Built on 1inch Aqua and ENSv2 (not affiliated)".

## 8. What judges score, and where we show it

Prize requirements as read from the prize pages (unverified).

| Prize requirement | Where in the demo |
| --- | --- |
| 1inch: build an Aqua app; SwapVM use scores higher; opcodes may be modified | Program page (#34, #35), Review step (ship to Aqua) |
| 1inch: positions demonstrated through tests or a UI, on-chain token movement shown | The live fill; Etherscan tab shows Safe → MM transfer in the same tx |
| ENS: best use of ENSv2 | Names as the client book: address, terms, expiry, per-key delegation |
| ENS bonus: agents as namespaces with their own identity and permissions | `risk.agents.desk.eth` writes one record key only |

## 9. Judge questions and prepared answers

| Question | Answer (one or two sentences) |
| --- | --- |
| Why not just use a Uniswap pool or CoW? | Those make the treasury a taker or open its quote to everyone; an open oracle quote gets arbitraged. Named counterparties are what make an oracle quote safe. |
| What if the oracle is wrong or stale? | Stale or non-positive prices block every fill. The mock oracle is for the demo; production would use Chainlink with a deviation band. |
| Can a market maker game the inventory skew? | We found that a big buy then sell-back could profit, so large fills pay a size floor on the spread. Tests prove a round trip never gains. |
| What can the agent do if its key is stolen? | Widen or tighten spreads inside the treasury's range, until the Safe revokes the role. It can't move funds, change addresses or caps, or stop trading. |
| Why your own router instead of 1inch's? | The prize allows modified SwapVM; our two instructions run inside it. The deployed router's KYC gate is an instruction the maker opts into, and we don't (unverified). |
| Gas? | Say the measured number from T2b. It's a few registry and resolver reads per fill. |
| Why Sepolia? | ENSv2 lives only on Sepolia today (unverified), and the router must read ENS inside the fill. |
| Who owns the MM names? | The treasury (proposed, see §10), so an MM can't change its own terms. |
| What if no MM comes? | Then nothing sells, which suits runway sales that can wait; the skew makes the quote more attractive the further the book is from target. |
| Is it audited? | No. It's a hackathon build; the invariants and their tests are in the repo. |

## 10. Open questions

| Question | Proposed default | Who answers |
| --- | --- | --- |
| Who is the Driver? | Henry (Aqua lane), as first drafted; Donghyun and 건우 are equally possible | Team |
| Who is the Narrator? | Donghyun (ENS lane) or 건우 (web app lane); Henry if the team prefers the Driver to narrate | Team |
| Who holds the Sepolia keys (Safe owners, MM accounts, Deployer) on the demo laptop? | The Driver | Team |
| Who writes mm-a's agent spread at 3:00 (agent key)? | Whoever runs the agent lane's command; the Driver from the hidden terminal if nobody else is on stage | Team |
| Who owns the MM names? | The treasury, so an MM cannot change its own terms | Team |
| Is the slot 4 minutes or 3? | 4 minutes, with the 3-minute cut in §4 ready | Team |

<details>
<summary>Change log</summary>

No entries while Draft.

</details>
