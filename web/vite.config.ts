import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  envPrefix: "VITE_",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@config": fileURLToPath(new URL("../config/sepolia.json", import.meta.url)),
      "@desk/browser": fileURLToPath(new URL("../ts/src/lib/client/browser.ts", import.meta.url)),
      "@desk/book": fileURLToPath(new URL("../ts/src/lib/book.ts", import.meta.url)),
      "@desk/verify": fileURLToPath(new URL("../ts/src/lib/client/verify.ts", import.meta.url)),
    },
  },
});
