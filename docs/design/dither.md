---
title: Dither
domain: Brand & Design
type: Rules
status: Draft
page_code: DIT
as_of: 2026-09-26
---

# Dither

This page covers how pictures are drawn: dots, stipple, and ordered pixels.
It goes with [ASCII](ascii.md) and [Treasury web app look and feel](look-and-feel.md). The references are the files in `ref/dither/`, including Dither Veil, the silver-grain reconstruction tool, the Arrayed frog, and the blue-and-paper stipple illustrations.

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| DIT-01 | A picture of a person, a proof, or an empty state is dither, stipple, or ordered pixels. | That is the picture language of the references. | Landing hero, empty states, proof images | Web QA pass (W9) | A smooth photo appears where a dither picture belongs |
| DIT-02 | One method per picture: Bayer, stipple, or ordered pixels. | Mixed methods read as a collage, not a system. | Every dither picture | Web QA pass (W9) | One picture mixes two dot methods |
| DIT-03 | The dither is the picture. It is not a noise layer on a smooth card. | The references put the dots in the subject. | Every dither picture | Web QA pass (W9) | A photo sits under a grain overlay |
| DIT-04 | Controls for a dither picture sit outside the picture. | Dither Veil keeps sliders off the portrait. | Any screen that adjusts a dither | Web QA pass (W9) | Labels or sliders cover the picture |
| DIT-05 | Dither ink is `--ink` on the pink or sky field. | The dots are the field, in the colours from [Color](color.md). | Every dither picture | Web QA pass (W9) | A dither introduces a colour that is not a field or ink |

<details>
<summary>Change log</summary>

- 2026-09-26: Dither ink follows the pink and sky fields.

</details>
