import { createServer } from "node:http";
import { openDb } from "./db.js";
import { readAgent, readCounterparties, readDesk, readFill, readFills, readProgram } from "./read.js";

const db = openDb(process.env.DESK_DB ?? "data/desk.sqlite");

function send(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(raw);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (req.method === "GET" && url.pathname === "/v1/desk") return send(res, 200, readDesk(db));
  if (req.method === "GET" && url.pathname === "/v1/fills") {
    return send(res, 200, readFills(db, {
      mm: url.searchParams.get("mm") ?? "",
      side: url.searchParams.get("side") ?? "",
      page: Number(url.searchParams.get("page") ?? "1"),
    }));
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
    return send(res, 501, {
      ok: false,
      error: {
        code: "QUOTE_NOT_ON_CHAIN",
        title: "Quote is read from the contract",
        hint: "The indexer does not store quotes.",
        severity: "config",
      },
    });
  }
  send(res, 404, { title: "Not found" });
});

const port = Number(process.env.PORT ?? 8787);
server.listen(port, "127.0.0.1");
