---
title: ASCII
domain: Brand & Design
type: Rules
status: Draft
page_code: ASC
as_of: 2026-09-26
---

# ASCII

This page covers characters used as the image, and the terminal window that holds raw values.
It goes with [Dither](dither.md) and [Type](type.md). The references are the files in `ref/ascii/`, including Aino Agency, the Finic letter creatures, and the TypeSafe terminal windows.

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| ASC-01 | Prices, addresses, hashes, and raw bytes sit in a terminal window: a title bar, then a mono body. | TypeSafe shows proof as a window, not as a badge. | Quote board, fills, program, signing overlay | Web QA pass (W9) | Raw values sit in the grotesque with no window |
| ASC-02 | One surface on the landing page may be letters that form a picture. No other page uses a letter mosaic. | Finic and Aino use the mosaic once, as the picture. | Landing only | Web QA pass (W9) | Letter mosaics appear on dashboard or trade |
| ASC-03 | "Show raw" reveals the terminal body. The surrounding text stays in the UI face. | Plain English and the raw record stay distinct. | Every "Show raw" control | Web QA pass (W9) | The whole card switches to mono |
| ASC-04 | Terminal body text is 14 px or 16 px. | The window must stay readable on the projector. | Every terminal window | Projector check (W9) | Terminal text is below 14 px |

<details>
<summary>Change log</summary>

No entries while Draft.

</details>
