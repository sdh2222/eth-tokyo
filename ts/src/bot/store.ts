import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type StoredFill = {
  tx: string;
  block: string;
  name: string;
  taker: string;
  side: "buy" | "sell";
  sizeWeth: string;
  amountIn: string;
  amountOut: string;
  midWad: string;
  sellBps: number;
  buyBps: number;
  wBeforeWad: string;
};

export type StoredSpread = {
  name: string;
  sellBps: number;
  buyBps: number;
  validUntil: string;
  writtenAt: string;
  fillTx: string;
  tier: string;
  note: string;
};

/** Local index of DeskFill and the spread the agent wrote after each one. */
export function deskDbPath(): string {
  return join(homedir(), ".aqua-eth-tokyo", "desk.sqlite");
}

export function openDeskDb(path = deskDbPath()): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  if (path !== ":memory:") {
    db.exec("pragma busy_timeout = 5000");
    db.exec("pragma journal_mode = WAL");
  }
  db.exec(`
    create table if not exists fills (
      tx text primary key,
      block text not null,
      name text not null,
      taker text not null,
      side text not null,
      size_weth text not null,
      amount_in text not null,
      amount_out text not null,
      mid_wad text not null,
      sell_bps integer not null,
      buy_bps integer not null,
      w_before_wad text not null
    );
    create table if not exists spreads (
      id integer primary key,
      name text not null,
      sell_bps integer not null,
      buy_bps integer not null,
      valid_until text not null,
      written_at text not null,
      fill_tx text not null,
      tier text not null,
      note text not null default ''
    );
  `);
  const columns = db.prepare("pragma table_info(spreads)").all() as {
    name: string;
  }[];
  if (!columns.some((column) => column.name === "note")) {
    db.exec("alter table spreads add column note text not null default ''");
  }
  return db;
}

export function rememberFill(db: DatabaseSync, fill: StoredFill): void {
  db.prepare(
    `insert or ignore into fills (
      tx, block, name, taker, side, size_weth, amount_in, amount_out,
      mid_wad, sell_bps, buy_bps, w_before_wad
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    fill.tx.toLowerCase(),
    fill.block,
    fill.name,
    fill.taker.toLowerCase(),
    fill.side,
    fill.sizeWeth,
    fill.amountIn,
    fill.amountOut,
    fill.midWad,
    fill.sellBps,
    fill.buyBps,
    fill.wBeforeWad,
  );
}

export function rememberSpread(db: DatabaseSync, spread: StoredSpread): void {
  db.prepare(
    `insert into spreads (
      name, sell_bps, buy_bps, valid_until, written_at, fill_tx, tier, note
    ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    spread.name,
    spread.sellBps,
    spread.buyBps,
    spread.validUntil,
    spread.writtenAt,
    spread.fillTx.toLowerCase(),
    spread.tier,
    spread.note,
  );
}

type FillRow = {
  tx: string;
  block: string;
  name: string;
  taker: string;
  side: "buy" | "sell";
  size_weth: string;
  amount_in: string;
  amount_out: string;
  mid_wad: string;
  sell_bps: number;
  buy_bps: number;
  w_before_wad: string;
};

function asFill(row: FillRow): StoredFill {
  return {
    tx: row.tx,
    block: row.block,
    name: row.name,
    taker: row.taker,
    side: row.side,
    sizeWeth: row.size_weth,
    amountIn: row.amount_in,
    amountOut: row.amount_out,
    midWad: row.mid_wad,
    sellBps: row.sell_bps,
    buyBps: row.buy_bps,
    wBeforeWad: row.w_before_wad,
  };
}

export function listFills(db: DatabaseSync): StoredFill[] {
  const rows = db
    .prepare(
      "select * from fills order by cast(block as integer) desc, tx desc",
    )
    .all() as FillRow[];
  return rows.map(asFill);
}

export function fillByTx(db: DatabaseSync, tx: string): StoredFill | null {
  const row = db
    .prepare("select * from fills where tx = ?")
    .get(tx.toLowerCase()) as FillRow | undefined;
  return row ? asFill(row) : null;
}

export function fillsForName(db: DatabaseSync, name: string): StoredFill[] {
  const rows = db
    .prepare(
      "select * from fills where name = ? order by cast(block as integer) asc, tx asc",
    )
    .all(name) as FillRow[];
  return rows.map(asFill);
}

export function latestSpreads(db: DatabaseSync): StoredSpread[] {
  const rows = db
    .prepare(
      `select name, sell_bps, buy_bps, valid_until, written_at, fill_tx, tier, note
       from spreads
       where id in (select max(id) from spreads group by name)
       order by name`,
    )
    .all() as {
    name: string;
    sell_bps: number;
    buy_bps: number;
    valid_until: string;
    written_at: string;
    fill_tx: string;
    tier: string;
    note: string;
  }[];
  return rows.map((row) => ({
    name: row.name,
    sellBps: row.sell_bps,
    buyBps: row.buy_bps,
    validUntil: row.valid_until,
    writtenAt: row.written_at,
    fillTx: row.fill_tx,
    tier: row.tier,
    note: row.note,
  }));
}
