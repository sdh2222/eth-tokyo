const Module = require("node:module");
const path = require("node:path");

const ts6 = path.dirname(require.resolve("typescript6/package.json"));
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "typescript") {
    return original.call(
      this,
      path.join(ts6, "lib/typescript.js"),
      parent,
      isMain,
      options,
    );
  }
  return original.call(this, request, parent, isMain, options);
};

const { defineConfig, globalIgnores } = require("eslint/config");
const tseslint = require("typescript-eslint");

module.exports = defineConfig([
  globalIgnores(["dist/"]),
  tseslint.configs.recommended,
  {
    files: ["eslint.config.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["src/lib/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["node:*"] }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name='process']",
          message: "ts/src/lib stays browser-safe",
        },
      ],
    },
  },
]);
