import assert from "node:assert/strict";

const format = await import("../src/lib/format.ts");
const time = await import("../src/lib/time.ts");

const now = 1_700_000_000;

assert.equal(format.formatUsdc(400000000000n), "400,000.00 USDC");
assert.equal(format.formatWeth(900000000000000000000n), "900.0000 WETH");
assert.equal(format.formatPrice(3987984000000000000000n), "3,987.98");
assert.equal(format.formatUsd(4000000000000000000000n), "$4,000.00");
assert.equal(format.formatShare(900000000000000000n), "90.0%");
assert.equal(
  format.formatSkewBps(200, 900000000000000000n, 700000000000000000n),
  "40 bps",
);
assert.equal(
  format.formatVsMidBps(3987984000000000000000n, 4000000000000000000000n),
  -30n,
);
assert.equal(
  format.formatAddr("0x1bd29e26f09b4c68c623141673e5f0a5d02709f6"),
  "0x1bd2…09f6",
);
assert.equal(time.formatWhen(now + 5 * 3600 + 12 * 60, now), "in 5 h 12 m");

assert.throws(() => format.formatVsMidBps(1n, 0n));
