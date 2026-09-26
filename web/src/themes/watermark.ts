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
  localTokens: {
    // The approved header's brand blue, the "water" half of the wordmark. Logotype
    // colour only: white on it is 4.4:1, under the 4.5:1 text minimum.
    "--watermark-water": "#0080BC",
    // The same hue a step deeper for fills that carry white text: 4.9:1.
    "--watermark-water-strong": "#0077AF",
    // LisaTerminal Paper, only where the approved header uses it: the wordmark and banners.
    "--font-family-wordmark": '"LisaTerminal Paper", "Courier New", monospace',
  },
  components: {
    // The approved header: a white bar resting on the sky ground (AppShell variant wash).
    "app-shell-header": {
      "variant:wash": {
        backgroundColor: "var(--color-background-card)",
        margin: "var(--spacing-3) var(--spacing-4) 0",
        borderRadius: "var(--radius-container)",
      },
    },
    // The wordmark, "water" in the brand blue and "mark" in ink, set in LisaTerminal Paper.
    text: {
      "type:wordmark": {
        fontFamily: "var(--font-family-wordmark)",
        fontWeight: "var(--font-weight-normal)",
        color: "var(--color-text-primary)",
      },
      "type:wordmark-water": {
        fontFamily: "var(--font-family-wordmark)",
        fontWeight: "var(--font-weight-normal)",
        color: "var(--watermark-water)",
      },
    },
    // The approved wallet pill: white with a sky dot screen and an ink rule; filled blue once
    // a wallet is connected.
    button: {
      "variant:wallet": {
        backgroundColor: "var(--color-background-card)",
        backgroundImage: "radial-gradient(var(--color-background-body) 0.92px, transparent 1px)",
        backgroundSize: "2px 2px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "var(--color-text-primary)",
        borderRadius: "var(--radius-full)",
        color: "var(--color-text-primary)",
      },
      "variant:wallet-connected": {
        backgroundColor: "var(--watermark-water-strong)",
        borderRadius: "var(--radius-full)",
        color: "var(--color-on-accent)",
      },
    },
    // The approved banners: paper with LisaTerminal Paper text. The icon and the title
    // still carry the status.
    banner: {
      "container:section": {
        backgroundColor: "var(--color-background-surface)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-family-wordmark)",
      },
    },
  },
});
