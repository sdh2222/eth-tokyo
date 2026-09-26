---
title: Treasury web app look and feel
domain: Brand & Design
type: Rules
status: Draft
page_code: UI
as_of: 2026-09-24
notion: https://app.notion.com/p/3e58f1ec11b4812abbccef31d01a4446
---

# Treasury web app look and feel

This page covers shape, the component list, and the projector.
Style, colour, type, spacing, component sizes, dither, ascii, libraries, and first paint are separate rule pages: [Style](style.md), [Color](color.md), [Type](type.md), [Spacing](spacing.md), [Components](components.md), [Dither](dither.md), [ASCII](ascii.md), [Libraries](libraries.md), [First paint](loading.md). Those pages win on their topic.
It goes with [Treasury web app](../product/treasury-web-app.md), which holds the screens, flows and copy. Visual design is described in text only.

## Decided 26 Sep 2026

This block wins where an older row on this page disagrees with it.

The product name is watermark. Water is Aqua. Marks are ENS. In the wordmark, water is sky (#b7e4f8) and mark is ink. Desk is the name of the job, not the product. The view switch is Treasury and Counterparty. The UI does not say maker or taker. Treasury's menu is Dashboard, Open a desk, Counterparties, Risk agent, Fills, Controls. Open a desk stays in that menu only while no desk is live. Program is reached from Controls, not from the menu. Counterparty's menu is Trade and My fills. Fills, Verify a fill, Program, and Risk agent can be read without choosing a role. The switch changes the menu only.

Two layers. The picture is one ink on a field. It is a dither of a subject, as in the TypeSafe clouds and the Cognition blue form, or a grid of equal squares that changes pose, as in Aqua's whale. The dots follow the subject. They are not a texture under the words. If the picture moves, it moves as frames. A library does not draw it. The in-app picture comes first and sits on sky. The landing picture is last and is the more pictorial screen, with TypeSafe and Cognition as the references.

The software sits on that picture. It should feel like a tool, as in Devin and the TypeSafe console. Buttons, inputs, menus, and dialogs are Astryx. Their behavior and shape stay. Sky, ink, paper, and chip white replace Astryx's gray. Astryx's preset themes are not the look. We do not redraw those controls. The only custom drawing is the icons and the pictures. A quote or a raw value sits on an Astryx surface with those colors.

Type is Die Grotesk C, weights 400 and 500, for almost all text, including numbers. LisaTerminal Paper is 16 px and only when a passage is asked to feel special. The retail files are Die Grotesk C Regular and Die Grotesk C Medium, web licence, smallest tier, from https://klim.co.nz/buy/die-grotesk/. Installing them is the last action, after the in-app screens and the landing exist. Until then the test cut on this machine stays local and out of the repo. A separate motion library is for the landing only, and only if that screen needs a window or a section to enter. The in-app does not add one.

## 1. Theme and tokens

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| UI-01 | One light theme. The light theme is the pink field and the sky field in [Color](color.md). | Projectors wash out a black UI, and a white card grid is not the field. | Every screen and overlay | Web QA pass and projector check (W9) | The demo screen is black, or it is a white card grid |
| UI-02 | All values are CSS variables on `:root`; components use only tokens. | One place to change a value; no raw hex in components. | All components | Tailwind configured to use only the tokens; web QA pass (W9) | Colours and sizes drift between screens |

## 2. Type

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| UI-03 | UI font: **Die Grotesk C**, weights 400 and 500, fallback `system-ui, sans-serif`. | The locked page face. | All UI text, including a window title | Web QA pass (W9) | A second UI family appears |
| UI-04 | Text is Die Grotesk C, including numbers, with `font-variant-numeric: tabular-nums`. **LisaTerminal Paper** at 16 px is only for a passage that should feel special. | Lisa is not the default. | All text | Web QA pass (W9) | Lisa is the default face, or Lisa is used as a headline |
| UI-05 | Weights: 400 body, 500 labels, 600 headings and big numbers. No other weights. | A small, consistent type hierarchy. | All text | Web QA pass (W9) | Hierarchy reads inconsistently |

Type scale (size / line height in px):

| Token | Size / line height | Use |
| --- | --- | --- |
| `--text-display` | 48 / 56 | Landing headline only |
| `--text-h1` | 32 / 40 | Page title |
| `--text-h2` | 24 / 32 | Card title, big numbers in stat tiles |
| `--text-h3` | 20 / 28 | Section title |
| `--text-body` | 16 / 24 | Body, table cells (minimum on the demo screen) |
| `--text-small` | 14 / 20 | Secondary lines, captions |
| `--text-micro` | 12 / 16 | Badges only |

## 3. Colour

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| UI-06 | Role colours use the same families as the diagrams. | Slides, diagrams and UI agree. | UI, diagrams, slides | Web QA pass (W9) | The same actor looks different on slides and on screen |
| UI-07 | Semantic colours carry meaning; a role colour is never reused for meaning. | Green and red always mean the same thing. | Prices, statuses, banners | Web QA pass (W9) | A role colour is read as good or bad |
| UI-08 | Colour is never the only signal: every status also has a text label or an icon. | Accessibility, and projectors shift colours. | Every status, badge and banner | Web QA pass (W9) | Some viewers miss the status |

Fields and chrome are the table in [Color](color.md). `--bg` is the field of the current screen. `--text` is ink. `--surface` is paper. `--border` is the ink rule. `--focus` is ink, and the primary button is the ink button, not a blue one. Muted text is ink at 60% opacity, still meeting UI-16.

Role colours:

| Token | Hex (strong / tint) | Meaning |
| --- | --- | --- |
| `--treasury` | #0F9D6E / #E6F6F0 | the Safe, inventory |
| `--mm` | #E8590C / #FFF1E6 | market makers |
| `--program` | #7048E8 / #F1ECFF | DeskRouter, the program |
| `--aqua` | #1C7ED6 / #E7F3FF | Aqua, balances in the desk |
| `--ens` | #D6336C / #FFEBF2 | names, records |
| `--oracle` | #0C8599 / #E3F7FA | price feed |
| `--agent` | #4263EB / #EDF2FF | risk agent |

Semantic:

| Token | Hex | Use |
| --- | --- | --- |
| `--bid` | #2B8A3E | bid prices, "sold ETH to the desk" |
| `--ask` | #C92A2A | ask prices, "bought ETH from the desk" |
| `--success` | #2F9E44 | Live, verified ✓ |
| `--warning` | #F08C00 | stale soon, closing soon |
| `--danger` | #E03131 | refusals, stop, wrong network |

## 4. Space, shape, depth

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| UI-09 | Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64. Card padding 24; section gap 32. | One rhythm across screens. | All layout | Web QA pass (W9) | Uneven spacing between screens |
| UI-10 | Windows, buttons, and inputs are square. Status badges are pills (radius 999). | TypeSafe's chrome is square. A pill is only a status. | Windows, inputs, buttons, badges | Web QA pass (W9) | A window or a button is a rounded card |
| UI-11 | Borders 1 px `--border`. One shadow only, for overlays: `0 8px 24px rgba(16,24,40,0.12)`. | Depth marks overlays only. | Borders, overlays | Web QA pass (W9) | Cards compete with overlays for attention |
| UI-12 | Layout: max width 1280, 12 columns, 24 px gutters, 32 px page padding. Minimum supported width 1280; no mobile layout. | The demo runs on a laptop. | Every page | Projector check (W9) | Layout breaks on the demo laptop |
| UI-13 | Motion: 150 ms ease-out for hovers and panels; no motion on numbers (they change in place). | Live numbers stay readable while they update. | Hovers, panels, live numbers | Web QA pass (W9) | Numbers are hard to read while they change |

## 5. Components (build once, reuse)

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| UI-14 | Build each component in the table below once and reuse it. | The same data looks the same on every page. | All pages | Web QA pass (W9) | Two versions of the same component drift apart |
| UI-15 | Every data component has four states specified: loading (skeleton with the final layout), empty (one sentence + one action), error (dictionary title + Retry), and ready. | Live chain data is often loading, empty or failing. | Every data component | Web QA pass (W9) | Blank or broken areas on screen during the demo |

| Component | Rules |
| --- | --- |
| StatTile | label (small, muted) above value (h2, mono); optional delta line |
| ShareBar | 0-100% bar, treasury fill, target marker line with label, current value label |
| QuoteBoard | table; bid and ask in mono h3; dimmed rows for non-ok status with the status badge |
| StatusBadge | pill, micro text, colour + text: Live, Stopped, Not open, Expired, No terms, Wrong resolver, No address, Stale |
| SourceBadge | Tier (grey), Agent (agent colour), Size floor (program colour) |
| Address | short mono + copy + explorer icon; ENS name above if known |
| TxLink | short hash + explorer; pending spinner state |
| AmountInput | numeric only, unit toggle, Max button, inline validation message under the field |
| Stepper | vertical, numbered, completed steps clickable |
| Countdown | ring with seconds; turns muted at 0 |
| Banner | info / warning / danger; icon + one sentence + one action |
| PlainProgram | `describeProgram` lines + "Show raw" toggle revealing the P7 table |
| SigningOverlay | Treasury web app §7.1 steps as a vertical progress list |
| Toast | bottom-right, 5 s, never used for errors that need action |

## 6. Accessibility and the projector

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| UI-16 | WCAG AA contrast for all text on the pink field, the sky field, paper, and ink. | Text stays readable on a projector. | All text | Web QA pass and projector check (W9) | Text is unreadable from the room |
| UI-17 | Visible focus ring on every interactive element; full keyboard path through the wizard and the Trade form. | The flows work without a mouse. | Every interactive element, P2 wizard, P4 Trade | Web QA pass (W9) | Keyboard users get stuck |
| UI-18 | Body text never below 16 px on demo screens; test the demo at 125% browser zoom on a 1280-wide window. | The demo is read from the back of a room. | Demo screens | Projector check (W9) | Text is too small on the projector |

Status is never shown by colour alone (UI-08).
<details>
<summary>Change log</summary>

- 2026-09-26: The wordmark uses sky for water and ink for mark.
- 2026-09-26: The product name is watermark. Water is Aqua. Marks are ENS.
- 2026-09-26: Colour moves to Color. The light theme is the pink and sky fields. Windows and buttons are square.

</details>
