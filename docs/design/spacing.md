---
title: Spacing
domain: Brand & Design
type: Rules
status: Draft
page_code: SP
as_of: 2026-09-26
---

# Spacing

This page covers the gaps and the padding.
Measured on 26 Sep 2026: Devin uses 4, 8, 12, 16, then 20, 32, 40, and 48. TypeSafe, built in Framer, repeats 4, 10, 12, 16, 20, and 30. This page takes Devin's 4 px steps and drops the values that are not on that step. TypeSafe's 10 and 30, and Devin's 20 and 40, are not used. Component sizes are in [Components](components.md).

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| SP-01 | Gaps are 4, 8, 12, 16, 24, 32, or 48 px. | One scale, taken from Devin's live layout. | All layout | Web QA pass (W9) | A gap falls off the scale, including 10, 20, 30, or 40 |
| SP-02 | A nested group uses the next smaller gap than the group that contains it. | Space is how related things group. | Stacks inside windows and sections | Web QA pass (W9) | A child gap is wider than its parent |
| SP-03 | App page padding is 32 px. Field page padding is 48 px. Section gap on an app page is 32 px. Section gap on a field page is 48 px. | The field needs more air than a form. Both numbers are on the scale. | Every page | Web QA pass (W9) | A field page uses form padding, or a screen invents its own |
| SP-04 | Inside a terminal window the row gap is 4 px. | The window is denser than the page around it. | Terminal windows (ASC-01) | Web QA pass (W9) | A terminal window uses section padding between rows |
| SP-05 | Padding comes from the table below. | The same control is the same size on every screen. | Buttons, chips, inputs, windows, banners | Web QA pass (W9) | A button or a window uses padding off the table |

SP-01 replaces the spacing list in look and feel UI-09 for gaps. UI-09 still holds radius. SP-03 holds the page and section padding.

## Padding

| Piece | Padding | Gap to the next piece |
| --- | --- | --- |
| Filled button | 12 px 16 px | 24 px to an underlined link |
| Navigation chip | 8 px 12 px | 8 px |
| Input, select | 12 px | 8 px to its label, 16 px to the next field |
| Terminal title bar | 8 px 12 px | The body starts on the border |
| Terminal body | 16 px 12 px | 4 px between rows |
| Banner | 16 px | 16 px to the next banner |
| Overlay body | 24 px | 16 px between steps |
| Crop mark | 16 px outside the type | — |

The header is 64 px tall (SC-15). Gutters stay 24 px. The column count stays in [Screens](screens.md).

<details>
<summary>Change log</summary>

- 2026-09-26: Field pages use 48 px. Padding table added. 20 and 40 are called out as off the scale.

</details>
