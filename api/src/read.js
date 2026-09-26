function liveDesks(db) {
  return db.prepare(`SELECT * FROM desks WHERE live = 1 ORDER BY shipped_block`).all();
}

export function readDesk(db) {
  const lives = liveDesks(db);
  const desk = lives.at(-1) ?? null;
  const oracle = db.prepare(`SELECT * FROM oracle_ticks ORDER BY block_number DESC LIMIT 1`).get();
  const vault = db.prepare(`SELECT * FROM vault_snapshots ORDER BY block_number DESC LIMIT 1`).get();
  const terms = db.prepare(`SELECT * FROM terms ORDER BY name`).all();
  if (!desk && !oracle && !vault && terms.length === 0) return { strategy: null, state: null };
  return {
    strategy: desk
      ? {
          strategyHash: desk.strategy_hash,
          program: desk.program,
          live: true,
          warning: lives.length > 1 ? "MULTIPLE_LIVE" : null,
          deadline: desk.deadline,
          shippedAt: { block: desk.shipped_block, tx: desk.shipped_tx },
        }
      : null,
    state: {
      live: Boolean(desk),
      balances: { weth: vault?.weth ?? null, usdc: vault?.usdc ?? null },
      pWad: oracle?.answer ?? null,
      oracleUpdatedAt: oracle?.updated_at ?? null,
      wWad: vault?.w_wad ?? null,
      targetWad: vault?.target_wad ?? null,
      deadline: desk ? Number(desk.deadline) : null,
      mms: terms.map(termRow),
    },
  };
}

function termRow(row) {
  const now = Math.floor(Date.now() / 1000);
  const expired = row.expiry != null && row.expiry < now;
  const cut = row.cut_off_at != null;
  let status = "ok";
  if (cut) status = "no-terms";
  else if (expired) status = "expired";
  else if (row.tier_bps == null) status = "no-terms";
  return {
    name: row.name,
    address: row.address,
    expiry: row.expiry,
    tierBps: row.tier_bps,
    cap: row.cap,
    spreadBps: row.spread_bps,
    spreadUntil: row.spread_until,
    status,
  };
}

export function readFills(db, { mm = "", side = "", page = 1 } = {}) {
  const rows = db.prepare(`SELECT * FROM fills ORDER BY block_number, tx`).all();
  const filtered = rows.filter((row) => {
    if (mm && row.name !== mm) return false;
    if (side && row.side !== side) return false;
    return true;
  });
  const start = (page - 1) * 25;
  return filtered.slice(start, start + 25).map(fillRow);
}

function fillRow(row) {
  return {
    tx: row.tx,
    blockNumber: row.block_number,
    blockTime: row.block_time,
    name: row.name,
    taker: row.taker,
    tokenIn: row.token_in,
    tokenOut: row.token_out,
    amountIn: row.amount_in,
    amountOut: row.amount_out,
    midWad: row.mid_wad,
    spreadBps: row.spread_bps,
    spreadSource: row.spread_source,
    wBeforeWad: row.w_before_wad,
    strategyHash: row.strategy_hash,
    side: row.side,
  };
}

export function readFill(db, tx) {
  const row = db.prepare(`SELECT * FROM fills WHERE tx = ?`).get(tx);
  if (!row) return null;
  const steps = JSON.parse(row.steps);
  return {
    ...fillRow(row),
    matches: steps.length > 0,
    steps,
  };
}

export function readProgram(db) {
  const lives = liveDesks(db);
  const desk = lives.at(-1);
  if (!desk) return { program: null, lines: [] };
  return { program: desk.program, lines: JSON.parse(desk.lines) };
}

export function readCounterparties(db) {
  return db.prepare(`SELECT * FROM terms ORDER BY name`).all().map(termRow);
}

export function readAgent(db) {
  const sMin = 5;
  const sMax = 200;
  return readCounterparties(db).map((row) => {
    const bps = row.spreadBps;
    const clamped = bps == null ? null : Math.min(sMax, Math.max(sMin, bps));
    return {
      name: row.name,
      spreadBps: bps,
      clamped,
      inForce: clamped != null && clamped === bps,
    };
  });
}
