import { defineTheme } from "@astryxdesign/core/theme";

// The watermark theme. Built with `pnpm astryx theme build src/themes/watermark.ts`,
// which writes watermark.css, watermark.js and watermark.d.ts next to this file.
// Colours are the token sheet in docs/design/color.md: sky ground, paper surface,
// chip-white cards, ink text. The one filled button is ink with white type (CL-02).
// An ink seed gives the HCT generator no hue (it produced a green accent), so the
// palette is neutral-only and the accent pair is set here. Setting the accent means
// owning its on-colour: white on ink is 18.9:1.
// No `extends` and no `radius`: the theme starts from the Astryx defaults and keeps
// the default radius scale.
export const watermarkTheme = defineTheme({
  name: "watermark",
  color: { neutralStyle: "neutral", contrast: "standard" },
  typography: {
    // TY-04: demo text is at least 16 px.
    scale: { base: 16, ratio: 1.2 },
    // Die Grotesk C is loaded by src/styles/fonts.css (test cut until the retail files).
    body: { family: "Die Grotesk C", fallbacks: "system-ui, sans-serif" },
  },
  tokens: {
    "--color-accent": "#111111",
    "--color-on-accent": "#FFFFFF",
    "--color-background-body": "#B7E4F8",
    "--color-background-surface": "#F3F3F3",
    "--color-background-card": "#FFFFFF",
    "--color-background-popover": "#FFFFFF",
    "--color-text-primary": "#111111",
    "--color-icon-primary": "#111111",
    // TY-01: Die Grotesk C ships 400 and 500 only, so the heavier weights map to 500.
    "--font-weight-semibold": "500",
    "--font-weight-bold": "500",
  },
});
