import { describe, expect, it } from "vitest";

import { dnsDecode, dnsEncode } from "../../src/lib/encode.js";
import { filledWeth } from "../../src/lib/events.js";

const weth = "0x7Bd809623704F82eBaf04589220E57b174512ADB";
const usdc = "0xf9c632dc8A3de673B95FF8F0645024C541D54d42";

describe("fill event", () => {
  it("reads the taker's WETH size from the event", () => {
    expect(
      filledWeth(
        {
          tokenIn: usdc,
          tokenOut: weth,
          amountIn: 4_000n * 10n ** 6n,
          amountOut: 10n ** 18n,
        },
        weth,
      ),
    ).toEqual({ side: "buy", sizeWeth: 10n ** 18n });
    expect(
      filledWeth(
        {
          tokenIn: weth,
          tokenOut: usdc,
          amountIn: 20n * 10n ** 18n,
          amountOut: 80_000n * 10n ** 6n,
        },
        weth,
      ),
    ).toEqual({ side: "sell", sizeWeth: 20n * 10n ** 18n });
  });

  it("decodes the client name carried on DeskFill", () => {
    const name = "mm-a.clients.dao-treasury-a.eth";
    expect(dnsDecode(dnsEncode(name))).toBe(name);
  });
});
