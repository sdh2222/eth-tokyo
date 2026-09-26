import { describe, expect, it } from "vitest";

import { noteFill, type KeeperCursor } from "../../src/bot/watch.js";

const cursor: KeeperCursor = {
  router: "0xB4e89F4D45bE2419Be4fe55F82a4C23D133f0c22",
  block: 10n,
  done: [],
};

describe("keeper cursor", () => {
  it("remembers a fill and stays on the newest scanned block", () => {
    const next = noteFill(cursor, "0xABC", 12n);
    expect(next.done).toEqual(["0xabc"]);
    expect(next.block).toBe(12n);
    const again = noteFill(next, "0xabc", 11n);
    expect(again.done).toEqual(["0xabc"]);
    expect(again.block).toBe(12n);
  });

  it("keeps the latest 100 fills", () => {
    let current = cursor;
    for (let i = 0; i < 105; i++) current = noteFill(current, `0x${i}`, 20n);
    expect(current.done).toHaveLength(100);
    expect(current.done[0]).toBe("0x5");
    expect(current.done[99]).toBe("0x104");
  });
});
