import { describe, expect, it } from "vitest";

import {
  CEILING,
  FLOOR,
  STEP,
  nextAnswer,
  parseArgs,
} from "../../src/scripts/walk-oracle.js";

describe("oracle walker", () => {
  it("steps one dollar and turns at the bounds", () => {
    expect(nextAnswer(FLOOR, -1n)).toEqual({
      answer: FLOOR + STEP,
      direction: 1n,
    });
    expect(nextAnswer(FLOOR + STEP, 1n)).toEqual({
      answer: FLOOR + 2n * STEP,
      direction: 1n,
    });
    expect(nextAnswer(CEILING - STEP, 1n)).toEqual({
      answer: CEILING,
      direction: 1n,
    });
    expect(nextAnswer(CEILING, 1n)).toEqual({
      answer: CEILING - STEP,
      direction: -1n,
    });
    expect(nextAnswer(CEILING - STEP, -1n)).toEqual({
      answer: CEILING - 2n * STEP,
      direction: -1n,
    });
    expect(nextAnswer(FLOOR + STEP, -1n)).toEqual({
      answer: FLOOR,
      direction: -1n,
    });
  });

  it("parses a two-step proof", () => {
    expect(parseArgs(["--", "--steps", "2", "--close"])).toEqual({
      steps: 2,
      close: true,
      config: "config/sepolia.json",
    });
  });
});
