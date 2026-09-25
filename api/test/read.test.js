import assert from "node:assert/strict";
import test from "node:test";
import { openDb } from "../src/db.js";
import { applyEvents } from "../src/indexer.js";
import { readDesk, readFill, readFills } from "../src/read.js";

test("shipped desk and one fill are readable", () => {
  const db = openDb();
  applyEvents(db, [
    {
      type: "desk.shipped",
      strategyHash: "0xabc",
      program: "0x01",
      deadline: "1792926000",
      block: "10",
      tx: "0xship",
      lines: ["Open until 20261025 2000 JST"],
    },
    {
      type: "vault",
      block: "10",
      weth: "900000000000000000000",
      usdc: "400000000000",
      wWad: "900000000000000000",
      targetWad: "700000000000000000",
    },
    {
      type: "fill",
      tx: "0xfill",
      block: "11",
      blockTime: 1790337600,
      name: "mm-a",
      taker: "0x5",
      tokenIn: "0xusdc",
      tokenOut: "0xweth",
      amountIn: "1",
      amountOut: "1",
      midWad: "1",
      spreadBps: 20,
      spreadSource: 1,
      wBeforeWad: "1",
      strategyHash: "0xabc",
      side: "bought ETH",
      steps: [{ label: "Mid", formula: "Mid", value: "1" }],
    },
  ]);
  const desk = readDesk(db);
  assert.equal(desk.strategy.strategyHash, "0xabc");
  assert.equal(desk.state.balances.weth, "900000000000000000000");
  assert.equal(readFills(db, { mm: "mm-a", side: "bought ETH" }).length, 1);
  assert.equal(readFills(db, { side: "sold ETH" }).length, 0);
  assert.equal(readFill(db, "0xfill").matches, true);
  assert.equal(readFill(db, "0xfill").steps[0].label, "Mid");
});

test("two live desks warn", () => {
  const db = openDb();
  applyEvents(db, [
    { type: "desk.shipped", strategyHash: "0x1", program: "0x", deadline: "1", block: "1", tx: "0xa" },
    { type: "desk.shipped", strategyHash: "0x2", program: "0x", deadline: "1", block: "2", tx: "0xb" },
  ]);
  assert.equal(readDesk(db).strategy.warning, "MULTIPLE_LIVE");
});
