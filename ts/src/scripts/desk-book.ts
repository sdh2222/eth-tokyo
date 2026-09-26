// Prints GET /v1/desks/dao-treasury-a. It does not send a transaction.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { acceptDeskName, bookToJson, readBook } from "../lib/book.js";
import { loadConfig } from "../lib/config.js";
import { loadEnv, repoRoot } from "./_common/env.js";

const label = acceptDeskName(process.argv.slice(2));
if (label === null) {
  process.exit(1);
}

loadEnv();
const rpc =
  process.env.SEPOLIA_RPC_URL?.trim() ||
  "https://ethereum-sepolia-rpc.publicnode.com";
const cfg = loadConfig(
  JSON.parse(readFileSync(join(repoRoot, "config/sepolia.json"), "utf8")),
);
const book = await readBook(cfg, rpc);
process.stdout.write(`${JSON.stringify(bookToJson(book))}\n`);
