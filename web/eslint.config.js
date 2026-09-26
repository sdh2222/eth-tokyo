import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // The theme build writes watermark.css/.js/.d.ts/.variants.d.ts; only watermark.ts is source.
  { ignores: ["dist", "src/themes/watermark.js", "src/themes/watermark.d.ts", "src/themes/watermark.variants.d.ts"] },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
