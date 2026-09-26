# Desk web

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

Live mode (`VITE_DESK_MODE=live`) waits for `@desk/lib`. Until that client is in the repo, keep `VITE_DESK_MODE=fixture`.
