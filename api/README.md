# Desk API

Reads a SQLite file written by the indexer. It does not price quotes and it does not build wallet transactions.

```bash
node api/src/ingest.js events.json
node api/src/server.js
```

`GET /v1/desk` `/v1/fills` `/v1/fills/:tx` `/v1/counterparties` `/v1/agent` `/v1/program`

`POST /v1/quote` returns `QUOTE_NOT_ON_CHAIN` until a contract call is wired. Amounts are strings.
