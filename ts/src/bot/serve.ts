import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

import { bookToJson, readBook } from "../lib/book.js";
import { findLiveStrategy, type DeskCtx } from "../lib/client/index.js";
import { loadEnv } from "../scripts/_common/env.js";
import { deskRpc, loadDeskConfig } from "./fill.js";
import { fillByTx, latestSpreads, listFills, openDeskDb } from "./store.js";
import { syncFills } from "./sync.js";

const PORT = 8787;

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  });
  res.end(json);
}

function page(fills: ReturnType<typeof listFills>): string {
  const rows = fills
    .map(
      (fill) =>
        `<tr><td>${fill.block}</td><td>${fill.name}</td><td>${fill.side}</td><td>${fill.sizeWeth}</td><td>${fill.sellBps}/${fill.buyBps}</td><td><a href="/v1/fills/${fill.tx}">${fill.tx.slice(0, 10)}</a></td></tr>`,
    )
    .join("");
  return `<!doctype html><meta charset="utf-8"><title>mul desk</title>
  <body style="font-family:sans-serif;margin:2rem">
  <h1>mul desk</h1>
  <p>Indexed DeskFill events. Quote and names are live reads.</p>
  <p><a href="/v1/desks/dao-treasury-a">desk</a> · <a href="/v1/fills">fills</a> · <a href="/v1/counterparties">counterparties</a> · <a href="/v1/agent">agent</a> · <a href="/v1/quote">quote</a> · <a href="/v1/program">program</a></p>
  <table><thead><tr><th>block</th><th>name</th><th>side</th><th>weth</th><th>widths</th><th>tx</th></tr></thead><tbody>${rows}</tbody></table>
  </body>`;
}

async function main(): Promise<void> {
  loadEnv();
  const rpc = deskRpc(undefined);
  const db = openDeskDb();
  const added = await syncFills(rpc, db);
  console.log(`indexed ${added} new fills`);
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    void route(req, res, rpc, db).catch((err: unknown) => {
      send(res, 500, {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  });
  server.listen(PORT, () => {
    console.log(`desk index http://127.0.0.1:${PORT}`);
  });
}

async function route(
  req: IncomingMessage,
  res: ServerResponse,
  rpc: string,
  db: ReturnType<typeof openDeskDb>,
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  if (req.method === "GET" && path === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(page(listFills(db)));
    return;
  }
  if (req.method === "GET" && path === "/v1/fills") {
    send(res, 200, listFills(db));
    return;
  }
  if (req.method === "GET" && path.startsWith("/v1/fills/")) {
    const tx = path.slice("/v1/fills/".length);
    const fill = fillByTx(db, tx);
    if (!fill) {
      send(res, 404, { error: "no fill" });
      return;
    }
    send(res, 200, fill);
    return;
  }
  const cfg = loadDeskConfig();
  if (path === "/v1/program" && req.method === "GET") {
    const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
    const ctx: DeskCtx = { client, cfg };
    const live = await findLiveStrategy(ctx);
    send(res, 200, {
      router: cfg.router,
      strategyHash: live?.strategyHash ?? null,
    });
    return;
  }
  if (!path.startsWith("/v1/")) {
    send(res, 404, { error: "not found" });
    return;
  }
  const book = bookToJson(await readBook(cfg, rpc));
  if (path === "/v1/desks/dao-treasury-a") {
    send(res, 200, { ...book, indexedSpreads: latestSpreads(db) });
    return;
  }
  if (path === "/v1/counterparties") {
    send(res, 200, book.names);
    return;
  }
  if (path === "/v1/agent") {
    send(res, 200, {
      agent: book.agent,
      policy: book.policy,
      indexedSpreads: latestSpreads(db),
    });
    return;
  }
  if (path === "/v1/quote") {
    send(res, 200, {
      quote: book.quote,
      oracle: book.oracle,
      inventory: book.inventory,
    });
    return;
  }
  send(res, 404, { error: "not found" });
}

const isMain = process.argv[1]?.endsWith("serve.ts");
if (isMain) {
  main().catch((err: unknown) => {
    console.log(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
