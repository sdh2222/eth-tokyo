export function saveView(db, snap) {
  if (!snap?.strategy || !snap?.state) return;
  db.prepare(
    `INSERT INTO desk_view (id, strategy_json, state_json, written_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       strategy_json = excluded.strategy_json,
       state_json = excluded.state_json,
       written_at = excluded.written_at`,
  ).run(JSON.stringify(snap.strategy), JSON.stringify(snap.state), Date.now());
}

export function readView(db) {
  const row = db.prepare(`SELECT strategy_json, state_json FROM desk_view WHERE id = 1`).get();
  if (!row?.strategy_json || !row?.state_json) return { strategy: null, state: null };
  return { strategy: JSON.parse(row.strategy_json), state: JSON.parse(row.state_json) };
}
