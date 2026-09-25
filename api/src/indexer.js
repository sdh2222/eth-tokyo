export function applyEvent(db, event) {
  switch (event.type) {
    case "desk.shipped":
      db.prepare(
        `INSERT INTO desks (strategy_hash, program, deadline, shipped_block, shipped_tx, live, lines)
         VALUES (?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(strategy_hash) DO UPDATE SET
           program = excluded.program,
           deadline = excluded.deadline,
           live = 1,
           lines = excluded.lines`,
      ).run(
        event.strategyHash,
        event.program,
        event.deadline,
        event.block,
        event.tx,
        JSON.stringify(event.lines ?? []),
      );
      return;
    case "desk.docked":
      db.prepare(
        `UPDATE desks SET live = 0, docked_block = ?, docked_tx = ? WHERE strategy_hash = ?`,
      ).run(event.block, event.tx, event.strategyHash);
      return;
    case "fill":
      db.prepare(
        `INSERT INTO fills (
           tx, block_number, block_time, name, taker, token_in, token_out,
           amount_in, amount_out, mid_wad, spread_bps, spread_source, w_before_wad,
           strategy_hash, side, steps
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tx) DO NOTHING`,
      ).run(
        event.tx,
        event.block,
        event.blockTime,
        event.name,
        event.taker,
        event.tokenIn,
        event.tokenOut,
        event.amountIn,
        event.amountOut,
        event.midWad,
        event.spreadBps,
        event.spreadSource,
        event.wBeforeWad,
        event.strategyHash,
        event.side,
        JSON.stringify(event.steps ?? []),
      );
      return;
    case "oracle":
      db.prepare(
        `INSERT INTO oracle_ticks (block_number, answer, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(block_number) DO UPDATE SET answer = excluded.answer, updated_at = excluded.updated_at`,
      ).run(event.block, event.answer, event.updatedAt);
      return;
    case "vault":
      db.prepare(
        `INSERT INTO vault_snapshots (block_number, weth, usdc, w_wad, target_wad) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(block_number) DO UPDATE SET
           weth = excluded.weth, usdc = excluded.usdc, w_wad = excluded.w_wad, target_wad = excluded.target_wad`,
      ).run(event.block, event.weth, event.usdc, event.wWad, event.targetWad);
      return;
    case "terms":
      db.prepare(
        `INSERT INTO terms (name, address, expiry, tier_bps, cap, spread_bps, spread_until, cut_off_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(name) DO UPDATE SET
           address = excluded.address,
           expiry = excluded.expiry,
           tier_bps = excluded.tier_bps,
           cap = excluded.cap,
           spread_bps = excluded.spread_bps,
           spread_until = excluded.spread_until,
           cut_off_at = excluded.cut_off_at`,
      ).run(
        event.name,
        event.address,
        event.expiry ?? null,
        event.tierBps ?? null,
        event.cap ?? null,
        event.spreadBps ?? null,
        event.spreadUntil ?? null,
        event.cutOffAt ?? null,
      );
      return;
    default:
      throw new Error(`unknown event ${event.type}`);
  }
}

export function applyEvents(db, events) {
  for (const event of events) applyEvent(db, event);
}
