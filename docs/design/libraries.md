---
title: Libraries
domain: Brand & Design
type: Rules
status: Draft
page_code: LB
as_of: 2026-09-26
---

# Libraries

This page covers what the treasury web app depends on for UI.
Measured on 26 Sep 2026. TypeSafe is a Framer site. The animation runtime on the page is Motion: a preload of `motion` next to React, with tween transitions on opacity and scale. GSAP and ScrollTrigger are not on the page. The hero picture is a PNG, not a shader. A Vimeo module and a Unicorn Studio embed exist further down the marketing page. PostHog loads after the page. Devin's marketing site is Next.js and also loads Google Tag Manager, LinkedIn, and a Reddit pixel.

The app uses the library that does the work on the reference, and skips the ones that only slow the first screen.

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| LB-01 | Appearance and layout motion go through the `motion` package. The Framer site builder, GSAP, Unicorn Studio, and Vimeo are not dependencies. | TypeSafe's motion is that package. The other runtimes are marketing embeds. | Web app package | Dependency check in the web QA pass (W9) | GSAP, a Framer site runtime, or a WebGL embed is required to render a screen |
| LB-02 | Fonts are self-hosted, each with a fallback face. | Both sites paint text before the real font file arrives. | Die Grotesk C, LisaTerminal Paper | Web QA pass (W9) | A font is loaded from a third-party host, or text jumps when the file arrives |
| LB-03 | `motion` is the only motion library. It may animate opacity and transform of a window or a section. It does not animate numbers. | One library, and live figures stay readable (UI-13, ST-06). | Appear transitions, hovers, panels | Web QA pass (W9) | A second animation library runs, or a number tweens |
| LB-04 | Analytics and third-party pixels are not on the demo path. | Devin's full load waits on those scripts. TypeSafe's PostHog is the same kind of wait. | Demo build | Network check in the web QA pass (W9) | A tag manager or pixel request runs before the first screen is usable |
| LB-05 | A dither field is an image, preloaded. It is not a shader and not a CSS noise filter. | TypeSafe's pink field is a baked PNG. A shader is the lag the first screen does not need. | Landing field, empty states | Web QA pass (W9) | The first screen waits on a WebGL canvas |

<details>
<summary>Change log</summary>

- 2026-09-26: Motion is a dependency. GSAP, the Framer site builder, Unicorn Studio, and Vimeo stay out. Dither stays an image.

</details>
