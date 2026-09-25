import { readFileSync } from "node:fs";
import { openDb } from "./db.js";
import { applyEvents } from "./indexer.js";

const file = process.argv[2];
if (!file) {
  console.error("usage: node src/ingest.js events.json");
  process.exit(1);
}
const db = openDb(process.env.DESK_DB ?? "data/desk.sqlite");
applyEvents(db, JSON.parse(readFileSync(file, "utf8")));
