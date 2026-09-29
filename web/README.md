# watermark web

Sepolia testnet · not audited · Powered by SwapVM — © Degensoft Ltd 2025 · Built on 1inch Aqua and ENSv2 (not affiliated)

`VITE_` values are public build settings, not secrets. Contract addresses live in `config/sepolia.json`.

```bash
cp web/.env.example web/.env.local
pnpm -C web dev --host 127.0.0.1 --port 5173
```

```bash
pnpm -C web build
pnpm -C web preview --host 127.0.0.1 --port 4173
```

Die Grotesk C is a licensed Klim font and is not in this repo. `dev` and `build` run `scripts/fetch-fonts.mjs` first, which copies it from the private `sdh2222/fonts` repo when `FONTS_TOKEN` is set (a GitHub token that can read that repo). Locally you can instead put `die-grotesk-c-regular.woff2` and `die-grotesk-c-medium.woff2` in `web/public/fonts/die-grotesk/`. Without either, the page falls back to `system-ui`.

`VITE_DESK_MODE=live`, the default in `.env.example`, reads the Sepolia desk through the client in `ts/src/lib` (aliased in `vite.config.ts`). `VITE_DESK_MODE=fixture` serves seeded data; `VITE_FIXTURE` picks the `qa` or `demo` seed.
