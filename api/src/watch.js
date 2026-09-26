import { readFileSync } from "node:fs";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { filled, readFills, readOracle, readVault } from "./chain.js";
import { openDb } from "./db.js";
import { readTerms } from "./ens.js";
import { applyEvents } from "./indexer.js";

const DEFAULT_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

export function loadConfig(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function cursorBlock(db) {
  const row = db.prepare(`SELECT block FROM chain_cursor WHERE stream = 'fills'`).get();
  return row ? BigInt(row.block) : null;
}

function saveCursor(db, block) {
  db.prepare(
    `INSERT INTO chain_cursor (stream, block) VALUES ('fills', ?)
     ON CONFLICT(stream) DO UPDATE SET block = excluded.block`,
  ).run(block.toString());
}

export async function pollOnce(db, client, config) {
  const head = await client.getBlock();
  const saved = cursorBlock(db);
  const deploy = BigInt(config.deployBlock || 0);
  const fromBlock = saved != null ? saved + 1n : deploy > 0n ? deploy : head.number;
  const chunk = BigInt(config.logChunk || 50000);
  const events = [];

  try {
    for (let start = fromBlock; start <= head.number; start += chunk) {
      const end = start + chunk - 1n < head.number ? start + chunk - 1n : head.number;
      events.push(...(await readFills(client, config, start, end)));
    }
    saveCursor(db, head.number);
  } catch (error) {
    console.error(`fills ${error.shortMessage ?? error.message}`);
  }

  events.push(...(await readTerms(client, config)));
  const oracle = await readOracle(client, config.oracle);
  if (oracle) events.push(oracle);
  const vault = await readVault(client, config);
  if (vault) events.push(vault);

  applyEvents(db, events);
  if (filled(config.router) && filled(config.oracle) && filled(config.safe) && filled(config.tokens?.weth) && filled(config.tokens?.usdc)) {
    try {
      const { liveSnapshot } = await import("./live-desk.js");
      const { saveView } = await import("./view.js");
      saveView(db, await liveSnapshot());
    } catch (error) {
      console.error(`desk ${error.shortMessage ?? error.message}`);
    }
  }
  return { head: head.number.toString(), wrote: events.length };
}

function configPath() {
  return process.env.DESK_CONFIG ?? new URL("../../config/sepolia.json", import.meta.url);
}

export function makeClient(rpcUrl = process.env.DESK_RPC_URL || DEFAULT_RPC) {
  return createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
}

export async function main() {
  const db = openDb(process.env.DESK_DB ?? "data/desk.sqlite");
  const config = loadConfig(configPath());
  const client = makeClient();
  const once = process.env.DESK_WATCH_ONCE === "1";
  const wait = Number(process.env.DESK_POLL_MS ?? 15000);
  do {
    const result = await pollOnce(db, client, config);
    console.log(`head ${result.head} wrote ${result.wrote}`);
    if (once) return;
    await new Promise((resolve) => setTimeout(resolve, wait));
  } while (true);
}

if (process.argv[1]?.endsWith("watch.js")) {
  main();
}
