import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS desks (
  strategy_hash TEXT PRIMARY KEY,
  program TEXT NOT NULL,
  deadline TEXT NOT NULL,
  shipped_block TEXT NOT NULL,
  shipped_tx TEXT NOT NULL,
  docked_block TEXT,
  docked_tx TEXT,
  live INTEGER NOT NULL,
  lines TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS fills (
  tx TEXT PRIMARY KEY,
  block_number TEXT NOT NULL,
  block_time INTEGER NOT NULL,
  name TEXT NOT NULL,
  taker TEXT NOT NULL,
  token_in TEXT NOT NULL,
  token_out TEXT NOT NULL,
  amount_in TEXT NOT NULL,
  amount_out TEXT NOT NULL,
  mid_wad TEXT NOT NULL,
  spread_bps INTEGER NOT NULL,
  spread_source INTEGER NOT NULL,
  w_before_wad TEXT NOT NULL,
  strategy_hash TEXT NOT NULL,
  side TEXT NOT NULL,
  steps TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS oracle_ticks (
  block_number TEXT PRIMARY KEY,
  answer TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS vault_snapshots (
  block_number TEXT PRIMARY KEY,
  weth TEXT NOT NULL,
  usdc TEXT NOT NULL,
  w_wad TEXT,
  target_wad TEXT
);
CREATE TABLE IF NOT EXISTS desk_view (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  strategy_json TEXT,
  state_json TEXT,
  written_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chain_cursor (
  stream TEXT PRIMARY KEY,
  block TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS terms (
  name TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  expiry INTEGER,
  tier_bps INTEGER,
  cap TEXT,
  spread_bps INTEGER,
  spread_until INTEGER,
  cut_off_at INTEGER
);
`;

export function openDb(path = ":memory:") {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}
