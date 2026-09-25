import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    passWithNoTests: true,
    server: {
      deps: {
        inline: [/@1inch\//],
      },
    },
  },
});
