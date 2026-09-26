import { describe, expect, it } from "vitest";

import { decide, formatPlan, parseArgs } from "../../src/scripts/ship.js";

describe("ship cli", () => {
  it("refuses a live strategy without --dock", () => {
    const result = decide(
      { strategyHash: "0xabc" },
      { dock: false, noShip: false, printOnly: false, replay: false },
    );
    expect(result.code).toBe(1);
    expect(result.message).toBe(
      "a strategy is live (0xabc); pass --dock to replace it",
    );
  });

  it("prints a plan without sending", () => {
    const text = formatPlan("0x0000000000000000000000000000000000000001", [
      {
        to: "0x0000000000000000000000000000000000000002",
        data: "0x1234",
        value: 0n,
        label: "ship",
      },
    ]);
    expect(text).toContain("safe 0x0000000000000000000000000000000000000001");
    expect(text).toContain("1. ship");
    expect(parseArgs(["--print-only", "--dock", "--salt", "2"]).printOnly).toBe(
      true,
    );
  });

  it("has nothing to dock", () => {
    const result = decide(null, {
      dock: true,
      noShip: true,
      printOnly: false,
      replay: false,
    });
    expect(result.code).toBe(0);
    expect(result.message).toBe("nothing to dock");
  });
});
