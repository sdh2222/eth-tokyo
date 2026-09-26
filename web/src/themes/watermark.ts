import { defineTheme } from "@astryxdesign/core/theme";

// The watermark theme. Built with `pnpm astryx theme build src/themes/watermark.ts`,
// which writes watermark.css, watermark.js and watermark.d.ts next to this file.
//
// Colours: the approved shell (design/desk /dev/shell). White ground and surfaces, paper
// cards, ink text, sky accent with ink on it (ink on sky is 14:1).
//
// Type: docs/design/type.md and the size table in web/src/styles/tokens.css. Die Grotesk C
// at 400 and 500 only (TY-01), nothing under 16 px on demo screens (TY-04), headings at
// -0.03em (TY-05). Astryx has no tracking token, so that one is a Heading override.
//
// No `extends` and no `radius`: the theme starts from the Astryx defaults and keeps the
// default radius scale. The palette is neutral-only; the accent pair is set here.
export const watermarkTheme = defineTheme({
  name: "watermark",
  color: { neutralStyle: "neutral", contrast: "standard" },
  typography: {
    body: { family: "Die Grotesk C", fallbacks: "system-ui, sans-serif" },
  },
  tokens: {
    "--color-accent": "#CEE1E8",
    "--color-on-accent": "#011A25",
    // Links and accent text stay ink: sky text on white or paper is unreadable (1.4:1).
    "--color-text-accent": "#111111",
    "--color-icon-accent": "#111111",
    "--color-background-body": "#FFFFFF",
    "--color-background-surface": "#FFFFFF",
    "--color-background-card": "#F3F3F3",
    "--color-background-popover": "#FFFFFF",
    "--color-text-primary": "#111111",
    "--color-icon-primary": "#111111",

    // TY-01: Die Grotesk C ships 400 and 500 only, so the heavier weights map to 500.
    "--font-weight-semibold": "500",
    "--font-weight-bold": "500",

    // Page title 32/26, then the h2 (24/36) and h3 (20/24) rows of tokens.css.
    "--text-heading-1-size": "32px",
    "--text-heading-1-leading": "0.8125",
    "--text-heading-2-size": "24px",
    "--text-heading-2-leading": "1.5",
    "--text-heading-3-size": "20px",
    "--text-heading-3-leading": "1.2",
    "--text-heading-4-size": "16px",
    "--text-heading-4-leading": "1.5",
    // UI body 16/24. Label and supporting stay at 16 (TY-04).
    "--text-body-size": "16px",
    "--text-body-leading": "1.5",
    "--text-large-size": "20px",
    "--text-large-leading": "1.2",
    "--text-label-size": "16px",
    "--text-label-leading": "1.5",
    "--text-supporting-size": "16px",
    "--text-supporting-leading": "1.5",
    "--text-code-size": "16px",
    // Display 96/77, Section 64/51, Field body 24/36.
    "--text-display-1-size": "96px",
    "--text-display-1-leading": "0.8",
    "--text-display-2-size": "64px",
    "--text-display-2-leading": "0.8",
    "--text-display-3-size": "24px",
    "--text-display-3-leading": "1.5",
  },
  components: {
    heading: {
      base: { letterSpacing: "-0.03em" },
    },
  },
});
