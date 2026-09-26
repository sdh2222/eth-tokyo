import { createServer } from "node:http";
import { openDb } from "./db.js";
import { quoteRequest } from "./quote.js";
import { readAgent, readCounterparties, readFill, readFills, readProgram } from "./read.js";
import { readView } from "./view.js";

const db = openDb(process.env.DESK_DB ?? "data/desk.sqlite");

function send(res, status, body) {
  const raw = JSON.stringify(body, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(raw);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true });
  if (req.method === "GET" && url.pathname === "/v1/desk") return send(res, 200, readView(db));
  if (req.method === "GET" && url.pathname === "/v1/fills") {
    return send(res, 200, readFills(db, {
      mm: url.searchParams.get("mm") ?? "",
      side: url.searchParams.get("side") ?? "",
      page: Number(url.searchParams.get("page") ?? "1"),
    }).map(presentFill));
  }
  if (req.method === "GET" && url.pathname.startsWith("/v1/fills/")) {
    const tx = decodeURIComponent(url.pathname.slice("/v1/fills/".length));
    const fill = readFill(db, tx);
    if (!fill) return send(res, 404, { matches: false, steps: [] });
    return send(res, 200, fill);
  }
  if (req.method === "GET" && url.pathname === "/v1/counterparties") return send(res, 200, readCounterparties(db));
  if (req.method === "GET" && url.pathname === "/v1/agent") return send(res, 200, readAgent(db));
  if (req.method === "GET" && url.pathname === "/v1/program") return send(res, 200, readProgram(db));
  if (req.method === "POST" && url.pathname === "/v1/quote") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      let body = {};
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        body = raw ? JSON.parse(raw) : {};
      } catch {
        return send(res, 400, {
          ok: false,
          error: {
            code: "BAD_QUOTE",
            title: "Quote is read from the contract",
            hint: "Send a JSON object.",
            severity: "user",
          },
        });
      }
      quoteRequest(body).then((result) => send(res, result.status, result.body));
    });
    return;
  }
  send(res, 404, { title: "Not found" });
});

function presentFill(row) {
  return {
    tx: row.tx,
    blockNumber: row.blockNumber,
    blockTime: row.blockTime,
    orderHash: row.strategyHash,
    nameHash: `0x${"00".repeat(32)}`,
    taker: row.taker,
    dnsName: "0x",
    name: row.name,
    tokenIn: row.tokenIn,
    tokenOut: row.tokenOut,
    amountIn: row.amountIn,
    amountOut: row.amountOut,
    midWad: row.midWad,
    spreadBps: row.spreadBps,
    spreadSource: row.spreadSource,
    wBeforeWad: row.wBeforeWad,
  };
}

const port = Number(process.env.PORT ?? 8787);
server.listen(port, "0.0.0.0");
if (process.env.DESK_WATCH === "1") {
  const { main } = await import("./watch.js");
  main();
}
