---
title: Type
domain: Brand & Design
type: Rules
status: Draft
page_code: TY
as_of: 2026-09-26
---

# Type

This page covers the two faces, the sizes, and the letter-spacing.
Measured on 26 Sep 2026. TypeSafe sets headlines in Die Grotesk C, weights 400 and 500. At a 1064 px viewport the headline is 94 px with a 75.2 px line (0.8 of the size) and weight 500. At a forced 1440 px width the same headline is 150 px on a 120 px line, the same 0.8 ratio. Navigation is 18 px with 0.54 px of tracking. Terminal copy is 14–16 px in LisaTerminal Paper. Devin's display tracking, measured at 625 px, is −0.96 px on 32 px type (−0.03 em). Devin's 14 px navigation is too small for this demo.

This app does not ship Die Grotesk, LisaTerminal, NB International Pro, Geist Mono, or IBM Plex Mono. It ships Pretendard Variable for UI text, because that face covers Latin and Korean at the same two weights, and JetBrains Mono for the terminal. JetBrains Mono is already on the TypeSafe page and mostly unused there. The sizes below are for the 1280 frame, taken from the 94 px measurement rather than the 150 px one.

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| TY-01 | UI text is Pretendard Variable, weights 400 and 500 only. | One grotesque, two weights, as TypeSafe uses Die Grotesk. | All UI text outside terminal windows | Web QA pass (W9) | A third weight, or a second UI family, appears |
| TY-02 | Terminal windows and columns of numbers use JetBrains Mono, with `font-variant-numeric: tabular-nums`. | The terminal face is separate from the UI face. | Terminal windows, prices, addresses, hashes | Web QA pass (W9) | Numbers use Pretendard, or a third mono appears |
| TY-03 | A headline's line height is 0.8 of its size. Body line height is 1.5. | TypeSafe's measured headline ratio is 75.2 / 94 and 120 / 150. | Headlines and body | Web QA pass (W9) | Headline leading is loose, or body leading is tight |
| TY-04 | Navigation and body text on a demo screen are at least 16 px. | Devin's 14 px navigation is too small for the projector. | Demo screens | Projector check (W9) | Demo text is below 16 px |
| TY-05 | Display tracking is −0.03 em. UI body tracking is 0. A kicker may use 0.03 em, and nothing wider. | Devin's display tracking is −0.03 em. TypeSafe's navigation tracking is 0.54 px on 18 px, which is the wide end. | All text | Web QA pass (W9) | A headline is tracked outward, or a kicker is wider than 0.03 em |
| TY-06 | The size comes from the table below. A headline does not reuse the body size, and a form does not reuse the headline size. | The landing is a picture. The wizard is a form. | Every text role | Web QA pass (W9) | The landing headline is 48 px, or a form label is display size |

TY-01 replaces look and feel UI-05 for weights: headings are 500, not 600. TY-04 restates UI-18 for navigation as well as body. TY-03 replaces the 0.9 ratio that was written from the same 0.8 measurement.

## Sizes

| Role | Where | Size / line | Weight | Tracking | Face |
| --- | --- | --- | --- | --- | --- |
| Display | Landing headline only | 96 / 77 | 500 | −0.03 em | Pretendard |
| Section | A field section under the landing | 64 / 51 | 500 | −0.03 em | Pretendard |
| Page title | Every screen except the landing | 32 / 26 | 500 | −0.03 em | Pretendard |
| Field body | Landing subcopy and field sections | 24 / 36 | 400 | 0 | Pretendard |
| UI body | Forms, tables, banners, buttons | 16 / 24 | 400, controls 500 | 0 | Pretendard |
| Kicker | The line above a headline | 16 / 24 | 500 | 0.03 em | Pretendard |
| Terminal | Title bar and body | 16 / 24 | 500 title, 400 body | 0 | JetBrains Mono |
| Value | A glance number that is not inside a terminal | 24 / 36 | 500 | 0 | JetBrains Mono |
| Badge | Status pills only | 12 / 16 | 500 | 0 | Pretendard |

The 96 px display is the 94 px TypeSafe headline, set for this 1280 frame. The 64 px section size and the 24 px field body were not measured on TypeSafe. They are one step apart so the field does not drop straight to form size.

<details>
<summary>Change log</summary>

- 2026-09-26: Headline ratio set to the measured 0.8. Tracking split into display, body, and kicker. Size table added.

</details>
