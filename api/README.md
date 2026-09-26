# Desk API

Reads a SQLite file written by the indexer. It does not price quotes and it does not build wallet transactions.

```bash
node api/src/ingest.js events.json
node api/src/watch.js
node api/src/server.js
```

`watch` polls Sepolia every 15 seconds (`DESK_POLL_MS`). It writes ENS terms immediately. Fills, the oracle, and vault balances are read only after `router`, `oracle`, `tokens.weth`, and `tokens.usdc` are set in `config/sepolia.json`. Share (`w_wad`) is left empty. The watcher does not price quotes. `DESK_WATCH_ONCE=1` runs a single pass. `DESK_RPC_URL` overrides the Sepolia RPC.

`GET /v1/desk` `/v1/fills` `/v1/fills/:tx` `/v1/counterparties` `/v1/agent` `/v1/program`

`POST /v1/quote` returns `QUOTE_NOT_ON_CHAIN` until a contract call is wired. Amounts are strings.
