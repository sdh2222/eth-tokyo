// ESLint 10 flat config: every core rule marked "recommended" (the same set as @eslint/js
// recommended). Parsing TypeScript type syntax needs a TypeScript parser, which is still open
// (T0 BLOCKED 3: no typescript-eslint release accepts TypeScript 7.0.2).
import { builtinModules } from "node:module";

import { defineConfig, globalIgnores } from "eslint/config";
import { builtinRules } from "eslint/use-at-your-own-risk";

const recommended = Object.fromEntries(
  [...builtinRules]
    .filter(([, rule]) => rule.meta?.docs?.recommended)
    .map(([name]) => [name, "error"]),
);

// src/lib is browser code (T0 BLOCKED 3, team decision 09-25). Only src/scripts, src/bot and
// src/dev may use Node.
const browserOnly =
  "src/lib is browser code: no Node builtins, node: imports or Node globals. Only src/scripts, src/bot and src/dev may use Node.";
const nodeBuiltins = builtinModules.filter((name) => !name.startsWith("node:"));
const nodeGlobals = [
  "process",
  "Buffer",
  "global",
  "require",
  "module",
  "exports",
  "__dirname",
  "__filename",
  "setImmediate",
  "clearImmediate",
];

export default defineConfig([
  globalIgnores(["dist/"]),
  {
    files: ["**/*.{js,mjs,ts}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    rules: recommended,
  },
  {
    // TypeScript already reports undefined names; Node globals are allowed outside src/lib.
    files: ["**/*.ts"],
    rules: { "no-undef": "off" },
  },
  {
    files: ["src/lib/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: nodeBuiltins.map((name) => ({ name, message: browserOnly })),
          patterns: [{ regex: "^node:", message: browserOnly }],
        },
      ],
      "no-restricted-globals": [
        "error",
        ...nodeGlobals.map((name) => ({ name, message: browserOnly })),
      ],
    },
  },
]);
