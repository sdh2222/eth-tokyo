---
title: Components
domain: Brand & Design
type: Rules
status: Draft
page_code: CP
as_of: 2026-09-26
---

# Components

This page covers the size of each component, and where that size is used.
The component list is still look and feel UI-14. This page wins on size. Gaps and padding use the scale in [Spacing](spacing.md). Type sizes are the rows in [Type](type.md).

A size that was measured on TypeSafe is marked. The rest are choices for the 1280 frame.

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| CP-01 | One filled button per screen, padding 12 px by 16 px, type 16 px, square. | TypeSafe has one black control. The height stays readable on the projector. | Primary actions | Web QA pass (W9) | The button is a pill, or a second filled button appears |
| CP-02 | A secondary action is an underlined 16 px word. It has no fill and no border. | TypeSafe's other actions are underlined words. | Links beside a primary | Web QA pass (W9) | A secondary action is a second button |
| CP-03 | A navigation chip is white, padding 8 px by 12 px, type 16 px, square. The current chip is ink with white type. | TypeSafe's menu is a row of chips, with one black chip. | Header navigation | Web QA pass (W9) | Navigation is 14 px, or chips are pills |
| CP-04 | A terminal window has a 32 px title bar and a body padded 16 px by 12 px. Rows inside gap by 4 px. On the landing, a stacked window is 304 px wide. In a column, the window fills that column. | TypeSafe's stacked windows are about 304 px. Proof windows follow the column. | ASC-01 windows | Web QA pass (W9) | A landing window is a full-width card, or the title bar wraps |
| CP-05 | Inputs and selects are 16 px type, padding 12 px, square, 1 px ink border, paper fill. | Form controls match the window chrome. | Wizard, trade, filters | Web QA pass (W9) | An input is 14 px or a rounded gray box |
| CP-06 | A status badge is a pill, 12 px type, padding 4 px by 8 px, and it always contains a word. | Badges are the only type below 16 px (UI-18). | StatusBadge, SourceBadge | Web QA pass (W9) | A badge has no word, or body text is 12 px |
| CP-07 | Crop marks are 16 px legs of a 1 px ink stroke, set outside the type. The left rule is a 1 px ink stroke with a 16 px label. | TypeSafe's ornaments are that size of mark, not a frame around a card. | Field sections | Web QA pass (W9) | The rule becomes a card border |

## Where each component is used

| Component | Where | Size |
| --- | --- | --- |
| Headline | Landing only | 96 px, from the Type scale |
| Section title | A field section under the landing | 64 px |
| Page title | Every screen except the landing | 32 px |
| Terminal window | Quote board, fills, program raw, verify, signing hash, landing proof | Title 16 px, body 16 px. Landing width 304 px (measured on TypeSafe). Elsewhere, the column |
| StatTile | Dashboard glance, not the landing hero | Label 16 px, value 24 px mono. No gray card |
| ShareBar | Dashboard inventory | The column height follows the label and the 8 px bar |
| Primary button | One per screen. On Controls this is Change | 12 × 16 px padding |
| Danger outline | Stop the desk | Same padding as the primary, 1 px danger border, no fill |
| Banner | At most two, under the header | 16 px type, padding 16 px |
| Signing overlay | O1 and O2 | 640 px wide |
| Demo drawer | O3 | 400 px wide |
| Toast | O4 | Padding 16 px, 5 seconds |

<details>
<summary>Change log</summary>

- 2026-09-26: Sizes by use. The 304 px window width is the TypeSafe measurement. The other sizes are the 1280 frame.

</details>
