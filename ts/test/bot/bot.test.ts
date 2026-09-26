import { encodeErrorResult } from "viem";
import { describe, expect, it } from "vitest";

import { keyName, legRule, legTokens } from "../../src/bot/commands.js";
import { formatRefusal, formatUsdc, formatWeth } from "../../src/bot/format.js";
import { decodeDeskError } from "../../src/lib/client/index.js";

describe("mm bot", () => {
  it("requires exactly one of weth and usdc", () => {
    expect(legRule({ side: "buy", usdc: "1000" }).exactIn).toBe(true);
    expect(legRule({ side: "sell", weth: "0.5" }).amount).toBe(5n * 10n ** 17n);
    expect(() => legRule({ side: "buy", weth: "1", usdc: "1" })).toThrow(
      /exactly one/,
    );
    expect(keyName("mm-a")).toBe("MM_A_PK");
    expect(keyName("mm-b")).toBe("MM_B_PK");
    expect(legTokens("weth", false)).toEqual({
      tokenIn: "usdc",
      tokenOut: "weth",
    });
    expect(legTokens("weth", true)).toEqual({
      tokenIn: "weth",
      tokenOut: "usdc",
    });
  });

  it("prints a taker mismatch from the desk client", () => {
    const data = encodeErrorResult({
      abi: [
        {
          type: "error",
          name: "EnsGateTakerMismatch",
          inputs: [
            { name: "expected", type: "address" },
            { name: "taker", type: "address" },
          ],
        },
      ],
      errorName: "EnsGateTakerMismatch",
      args: [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      ],
    });
    const decoded = decodeDeskError({ data });
    expect(formatRefusal(decoded.title, decoded.hint)).toContain(
      "✖ This wallet isn't on the desk's list",
    );
    expect(formatWeth(10n ** 18n)).toBe("1.0000");
    expect(formatUsdc(1_000n * 10n ** 6n)).toBe("1000.00");
  });
});
