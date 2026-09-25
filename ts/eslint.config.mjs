// ESLint 10 flat config. T0 Spec requirement 6 pins eslint 10.11.0 and lists no parser or plugin,
// so this config uses eslint alone: every core rule marked "recommended" (the same set as
// @eslint/js recommended). Core ESLint cannot parse TypeScript type syntax; adding a TypeScript
// parser needs a new dependency, which is an open question raised in the T0 pull request.
import { defineConfig, globalIgnores } from "eslint/config";
import { builtinRules } from "eslint/use-at-your-own-risk";

const recommended = Object.fromEntries(
  [...builtinRules]
    .filter(([, rule]) => rule.meta?.docs?.recommended)
    .map(([name]) => [name, "error"]),
);

export default defineConfig([
  globalIgnores(["dist/"]),
  {
    files: ["**/*.{js,mjs,ts}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    rules: recommended,
  },
]);
