---
title: Screens
domain: Brand & Design
type: Rules
status: Draft
page_code: SC
as_of: 2026-09-26
---

# Screens

This page covers column placement and what sits in an overlay.
The screen list, copy, and data stay in [Treasury web app](../product/treasury-web-app.md). This page wins on columns and overlays. It does not add a route or a fifth overlay. The demo path is [aqua-lane_04_walk](../diagrams/aqua-lane_04_walk.png).

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| SC-01 | The app is the nine screens and four overlays in Treasury web app §4. | The page split is already decided. | Every route | Web QA pass (W9) | A new route or a fifth overlay appears |
| SC-02 | Reading, the six wizard steps, a policy change, and Verify stay on the page. A policy change reopens `/open` at step 3. `/fills/:tx` is a page, not an overlay. | The projector has to show the verdict and the wizard. | P2, P5, P6 | Web QA pass (W9) | Verify or a wizard step opens as a modal |
| SC-03 | O1 is a centered modal, 640 px wide, for Propose, re-ship, stop, edit terms, and cut off. The page behind it stays mounted. | Signing is the only treasury write. | O1 | Web QA pass (W9) | A Safe signature starts without the modal, or the page unmounts |
| SC-04 | O2 is the same modal size, and only for Approve router and Fill. | The market maker signs from their own wallet. | O2 | Web QA pass (W9) | Approve or Fill uses a different chrome, or another action uses O2 |
| SC-05 | Stop and cut off show one confirm sentence, then O1. That sentence is not a new overlay id. | The danger step is a sentence in front of the signature. | P3 cut off, P5 stop | Web QA pass (W9) | Stop or cut off skips the sentence, or the sentence gets its own overlay id |
| SC-06 | Slippage, default 10 bps, is a disclosure inside the order form. | The gear does not need its own layer. | P4 order form | Web QA pass (W9) | Slippage opens a popover or a modal |
| SC-07 | A role and wallet mismatch is an inline banner. The page stays usable for reading. | The switch changes the menu only. The wallet decides the action. | Every page except Landing | Web QA pass (W9) | The mismatch is a blocking modal |
| SC-08 | O3 is a right drawer, 400 px wide, and it is absent from the navigation. O4 is a toast at the bottom right for 5 seconds. | Demo tools stay off the story. Toasts do not cover the primary action. | O3, O4 | Web QA pass (W9) | Demo tools appear in the nav, or a toast covers the primary button |
| SC-09 | Each screen has one primary button. On Controls the primary is Change. Stop the desk is a danger outline button. | Principle 3 in Treasury web app §2. | Every screen with an action | Web QA pass (W9) | Controls shows two filled primary buttons |
| SC-10 | Counterparties has no "Add a market maker". Edit terms and Cut off appear only when the desk client exposes `planSetTerms` and `planCutOff`. Otherwise one line under the table reads "Terms are managed by the ENS lane". Edit fields expand in the row. Saving opens O1. | Adding a name belongs to the ENS lane. | P3 | Web QA pass (W9) | An add-name control appears, or edit fields open a new route |
| SC-11 | The dashboard price chart is not in the locked frame. Treasury web app §5.1 item 5 stays written as optional. | The demo frame has no spare row for it. | P1 | Web QA pass (W9) | The locked dashboard draws the chart |
| SC-12 | The letter mosaic is the landing hero's right 5 columns, and nowhere else. | ASC-02. | P0 | Web QA pass (W9) | A letter mosaic appears off the landing hero |
| SC-13 | Dither pictures are only the empty states "No desk is open" and "No fills yet". A data card has no dither. | DIT-01 and DIT-03. | P1 empty card, P1 recent fills empty, P6 empty | Web QA pass (W9) | A dither sits on a live number or a quote row |
| SC-14 | A terminal window, title bar then mono body, holds the landing proof, the quote board, the fills table, program raw bytes, the verify formulas, and the hash in the signing overlay. Dashboard stat tiles and sentence copy stay in the UI face. | ASC-01, limited to the proof blocks. | Landing proof, quote board, fills, program raw, verify, O1 hash | Web QA pass (W9) | Those blocks are plain cards, or a dashboard stat tile becomes a terminal |
| SC-15 | The shell is a 64 px header on every page except Landing, then at most two global banners, then the content. No sidebar. Content is max width 1280, 12 columns, 24 px gutters, 32 px page padding. Banner order is Treasury web app §4.3. | UI-12 and SP-03. The demo laptop is the frame. | Every page | Projector check (W9) | A sidebar appears, the header is a different height, or a third banner shows |
| SC-16 | Landing: the pink field, the headline, and terminal windows. No app header and no stat tiles. The letter mosaic, when it is used, stays in the hero. | ST-04. The hero is the picture. | P0 | Web QA pass (W9) | The landing is a card grid, or it uses the app header |
| SC-17 | Dashboard: status bar 12 columns. Inventory 5, quote board 7. Recent fills 12. When no desk is open, one empty card replaces inventory and the quote board. | Status, inventory, and prices are the glance. | P1 | Web QA pass (W9) | Inventory and the quote board stack full width while a desk is live |
| SC-18 | Open a desk: stepper 3 columns, content 9. On Policy, controls 6 and the preview 6. Back and Continue stay fixed at the bottom of the page. | The step stays visible while the form changes. | P2 | Web QA pass (W9) | The stepper sits above the form, or Back and Continue scroll away |
| SC-19 | Trade: identity 12 columns. Order form 5, quote 7. Fill sits under the quote. The receipt replaces the quote in that same slot. | The quote is what the room looks at while the form is set. | P4 | Web QA pass (W9) | The receipt opens a new page or a third overlay |
| SC-20 | Counterparties is one 12-column table. | The list is the screen. | P3 | Web QA pass (W9) | The table is split beside a side panel |
| SC-21 | Controls: the current program is 12 columns, then Change and the Stop outline, then the "what changes without reopening" table at 12. | Change is the primary. The rest is reading. | P5 | Web QA pass (W9) | Stop sits in a second column as a peer of Change |
| SC-22 | Fills: filters are one row above the table. Verify: the verdict is 12 columns, and the formula terminal is 12 columns under it. | The verdict is the first line a judge reads. | P6 | Web QA pass (W9) | Filters open a panel, or the formulas sit beside the verdict |
| SC-23 | Program: plain English is 12 columns. The argument table is 7 and the raw terminal is 5. Hover on a segment highlights its row, and hover on a row highlights its segment. | Plain English first, raw beside it. | P7 | Web QA pass (W9) | Raw bytes sit under the table, or hover does not connect them |
| SC-24 | Risk agent: identity, the per-MM table, `desk.stats`, and the explainer are each 12 columns. No overlay. | The agent page is read-only. | P8 | Web QA pass (W9) | An agent action opens an overlay |

<details>
<summary>Change log</summary>

- 2026-09-26: The landing is a pink field and terminal windows. The four live tiles are no longer the hero.

</details>
