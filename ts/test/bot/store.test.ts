import { describe, expect, it } from "vitest";

import {
  fillByTx,
  latestSpreads,
  listFills,
  openDeskDb,
  rememberFill,
  rememberSpread,
} from "../../src/bot/store.js";

describe("desk index", () => {
  it("keeps a fill once and the latest spread per name", () => {
    const db = openDeskDb(":memory:");
    const fill = {
      tx: "0xabc",
      block: "10",
      name: "mm-a.clients.dao-treasury-a.eth",
      taker: "0x36e2658f69b83f97c4c965cc8b6ee7486bdf9630",
      side: "buy" as const,
      sizeWeth: "1000000000000000000",
      amountIn: "1",
      amountOut: "2",
      midWad: "3",
      sellBps: 3,
      buyBps: 10,
      wBeforeWad: "4",
    };
    rememberFill(db, fill);
    rememberFill(db, fill);
    rememberSpread(db, {
      name: fill.name,
      sellBps: 1,
      buyBps: 5,
      validUntil: "100",
      writtenAt: "90",
      fillTx: fill.tx,
      tier: "tight",
      note: "cut 0",
    });
    rememberSpread(db, {
      name: fill.name,
      sellBps: 2,
      buyBps: 8,
      validUntil: "200",
      writtenAt: "190",
      fillTx: fill.tx,
      tier: "standard",
      note: "cut 1",
    });
    expect(listFills(db)).toHaveLength(1);
    expect(fillByTx(db, "0xABC")?.name).toBe(fill.name);
    expect(latestSpreads(db)).toEqual([
      {
        name: fill.name,
        sellBps: 2,
        buyBps: 8,
        validUntil: "200",
        writtenAt: "190",
        fillTx: "0xabc",
        tier: "standard",
        note: "cut 1",
      },
    ]);
    db.close();
  });
});
