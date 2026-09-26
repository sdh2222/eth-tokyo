---
title: First paint
domain: Brand & Design
type: Rules
status: Draft
page_code: LD
as_of: 2026-09-26
---

# First paint

This page covers what the visitor sees before the first screen is ready.
Measured on 26 Sep 2026: TypeSafe shows a terminal window ("TypeSafeAI 1.1 / Loading…") while the page is already in the document, and preloads its Framer runtime. Devin shows the headline immediately, preloads the first images and scripts, and uses a named font fallback. Devin's full load is slower because analytics scripts run on the same page.

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| LD-01 | The first paint is the page, or one terminal window while that page is already in the document. | TypeSafe's boot window is a frame, not a gate. Devin paints the hero itself. | First load of every route | Web QA pass (W9) | A blank screen or a spinner is the only thing painted |
| LD-02 | The waiting frame is the terminal window from [ASCII](ascii.md). It is not a spinner. | The wait uses the same chrome as the raw data. | The waiting frame, when one is shown | Web QA pass (W9) | The wait is a circular spinner |
| LD-03 | The first UI font file and the first dither image are preloaded. | Both sites preload the assets of the first screen. | Document head | Web QA pass (W9) | The headline or the hero dither arrives after the frame |
| LD-04 | The waiting frame is gone when the document is interactive. It does not wait on analytics. | Devin's load event waits on pixels the visitor never sees. | Demo build | Network check in the web QA pass (W9) | The frame stays up until a third-party script finishes |

<details>
<summary>Change log</summary>

No entries while Draft.

</details>
