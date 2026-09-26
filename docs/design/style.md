---
title: Style
domain: Brand & Design
type: Rules
status: Draft
page_code: ST
as_of: 2026-09-26
---

# Style

This page covers how a screen is built.
Measured on 26 Sep 2026: TypeSafe paints a full-bleed field, sets one huge headline, and puts proof in square terminal windows. The pink is the picture. The controls are black and white. Devin is the spacing reference, not the picture. Numbers are in [Type](type.md), [Spacing](spacing.md), [Color](color.md), and [Components](components.md).

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| ST-01 | The ground is a full-bleed field. Content sits on the field. | TypeSafe does not build the page out of gray cards. | Every screen | Web QA pass (W9) | The page is a grid of rounded gray cards |
| ST-02 | Chrome is black and white: ink text, one filled black button, white chips, and an underlined secondary link. | TypeSafe has one black control. The rest are words. | Buttons, links, navigation | Web QA pass (W9) | A screen has two filled buttons, or a blue primary |
| ST-03 | A window is square: a 1 px ink border, a black title bar, and a paper body. No shadow and no radius. | TypeSafe's windows are the chrome. Depth is reserved for overlays (UI-11). | Terminal windows | Web QA pass (W9) | A proof block is a rounded card, or a window has a shadow |
| ST-04 | The landing is a field, a headline, and terminal windows. The dither is the field. | The hero is a picture plus type, not a dashboard. | P0 | Web QA pass (W9) | The landing hero is stat tiles |
| ST-05 | The only ornaments are a 1 px crop mark and a 1 px rule with a small label. | TypeSafe marks a section with a corner and a left rule. | Field sections | Web QA pass (W9) | A section uses a shadow, a glow, or a hover lift |
| ST-06 | Motion enters a window or a section. It does not move a number. | TypeSafe's runtime is Motion. Live figures stay still (UI-13). | Appear transitions, live numbers | Web QA pass (W9) | A price tweens, or a second animation library runs |

<details>
<summary>Change log</summary>

- 2026-09-26: First draft, from the TypeSafe field and the Devin spacing pass.

</details>
