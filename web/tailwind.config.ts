import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      bg: "var(--bg)",
      surface: "var(--surface)",
      border: "var(--border)",
      text: "var(--text)",
      muted: "var(--text-muted)",
      focus: "var(--focus)",
      treasury: {
        DEFAULT: "var(--treasury)",
        tint: "var(--treasury-tint)",
      },
      mm: {
        DEFAULT: "var(--mm)",
        tint: "var(--mm-tint)",
      },
      program: {
        DEFAULT: "var(--program)",
        tint: "var(--program-tint)",
      },
      aqua: {
        DEFAULT: "var(--aqua)",
        tint: "var(--aqua-tint)",
      },
      ens: {
        DEFAULT: "var(--ens)",
        tint: "var(--ens-tint)",
      },
      oracle: {
        DEFAULT: "var(--oracle)",
        tint: "var(--oracle-tint)",
      },
      agent: {
        DEFAULT: "var(--agent)",
        tint: "var(--agent-tint)",
      },
      bid: "var(--bid)",
      ask: "var(--ask)",
      success: "var(--success)",
      warning: "var(--warning)",
      danger: "var(--danger)",
    },
    spacing: {
      1: "var(--space-1)",
      2: "var(--space-2)",
      3: "var(--space-3)",
      4: "var(--space-4)",
      5: "var(--space-5)",
      6: "var(--space-6)",
      7: "var(--space-7)",
      8: "var(--space-8)",
    },
    fontFamily: {
      ui: "var(--font-ui)",
      mono: "var(--font-mono)",
    },
    fontSize: {
      display: ["var(--text-display-size)", { lineHeight: "var(--text-display-leading)" }],
      h1: ["var(--text-h1-size)", { lineHeight: "var(--text-h1-leading)" }],
      h2: ["var(--text-h2-size)", { lineHeight: "var(--text-h2-leading)" }],
      h3: ["var(--text-h3-size)", { lineHeight: "var(--text-h3-leading)" }],
      body: ["var(--text-body-size)", { lineHeight: "var(--text-body-leading)" }],
      small: ["var(--text-small-size)", { lineHeight: "var(--text-small-leading)" }],
      micro: ["var(--text-micro-size)", { lineHeight: "var(--text-micro-leading)" }],
    },
    borderRadius: {
      card: "var(--radius-card)",
      control: "var(--radius-control)",
      pill: "var(--radius-pill)",
    },
    boxShadow: {
      overlay: "var(--shadow-overlay)",
    },
  },
  plugins: [],
} satisfies Config;
