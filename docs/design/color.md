---
title: Color
domain: Brand & Design
type: Rules
status: Draft
page_code: CL
as_of: 2026-09-26
---

# Color

This page covers the fields and the chrome.
TypeSafe's picture is pink, and the controls on it are black and white. This app uses two fields, pink and sky blue, so a working screen is not the same ground as the landing. The hex values below are the app's choices. They are not sampled from the TypeSafe PNG.

This page wins on colour. [Look and feel](look-and-feel.md) UI-06, UI-07, and UI-08 still hold: a role colour matches the diagrams, a semantic colour is never a role colour, and colour is never the only signal.

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| CL-01 | The landing and the two empty states use the pink field. Every other screen uses the sky field. | Pink is the picture. Sky is the working ground. | P0, empty states, P1–P8 | Web QA pass (W9) | A working screen is white, black, or pink |
| CL-02 | Text on a field is ink. The one filled button and a window title bar are ink, with white type. Chips are white. | Chrome stays black and white on either field. | Text, buttons, title bars, chips | Web QA pass (W9) | Body text is white on the field, or the button is blue |
| CL-03 | A role colour is a mark: a word, a dot, or a diagram swatch. It does not fill a page, a card, or a button. | The field is already the colour. Role fills would turn the screen into a legend. | Treasury, counterparty, program, Aqua, ENS, oracle, agent | Web QA pass (W9) | A card or a page is filled with a role colour |
| CL-04 | Bid, ask, success, warning, and danger keep their meaning colours, and each one is also a word. | Green and red still mean the price side or the outcome. | Prices, statuses, banners | Web QA pass (W9) | A bid is pink, or a status is colour alone |
| CL-05 | Overlays use the paper body and the one shadow from UI-11. | A dialog has to sit above the field. | O1, O2, O3 | Web QA pass (W9) | An overlay is a pink or sky field |

## Fields and chrome

| Token | Hex | Use |
| --- | --- | --- |
| `--field-pink` | #FFC0D6 | Landing, "No desk is open", "No fills yet" |
| `--field-sky` | #B7E4F8 | Desk, wizard, trade, and the other working screens |
| `--ink` | #111111 | Text on a field, title bars, the filled button |
| `--on-ink` | #FFFFFF | Type on ink |
| `--paper` | #F3F3F3 | Terminal body, overlay body |
| `--chip` | #FFFFFF | Navigation chips |
| `--rule` | #111111 | Borders, crop marks, the left rule |

`--bg` is the field of the current screen. `--text` is `--ink`. `--surface` is `--paper`. `--border` is `--rule`. `--focus` is `--ink`, and `--on-focus` is `--on-ink`.

## Marks

Role colours stay the pairs in look and feel: treasury, counterparty (`--mm`), program, aqua, ens, oracle, agent. Semantic colours stay bid, ask, success, warning, and danger. They are used as type or as a 8 px dot beside a word.

<details>
<summary>Change log</summary>

- 2026-09-26: Pink and sky fields replace the white page and the gray card surface.

</details>
