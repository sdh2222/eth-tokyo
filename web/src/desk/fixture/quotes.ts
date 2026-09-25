// 00 §6 qa 1 WETH. These constants are the only quote numbers the fixture returns.
// mm-a s=20 ask 3991968000000000000000 buy in 3991968000 out 1000000000000000000
// mm-a s=20 bid 3976032000000000000000 sell out 3976032000
// mm-b s=25 ask 3993960000000000000000 buy in 3993960000
// mm-b s=25 bid 3974040000000000000000 sell out 3974040000
import type { Address, QuoteOk } from "../types";

const WETH = 1000000000000000000n;
const MM_A = "0x0000000000000000000000000000000000000005";
const MM_B = "0x0000000000000000000000000000000000000006";

function row(
  amountIn: bigint,
  amountOut: bigint,
  priceWad: bigint,
  spreadBps: number,
  spreadSource: 0 | 1,
): QuoteOk {
  return {
    ok: true,
    amountIn,
    amountOut,
    priceWad,
    spreadBps,
    spreadSource,
    mirror: { amountIn, amountOut },
    mirrorMatches: true,
  };
}

const TABLE: Record<string, QuoteOk> = {
  [`${MM_A}|buy|weth|${WETH}`]: row(3991968000n, WETH, 3991968000000000000000n, 20, 1),
  [`${MM_A}|sell|weth|${WETH}`]: row(WETH, 3976032000n, 3976032000000000000000n, 20, 1),
  [`${MM_B}|buy|weth|${WETH}`]: row(3993960000n, WETH, 3993960000000000000000n, 25, 0),
  [`${MM_B}|sell|weth|${WETH}`]: row(WETH, 3974040000n, 3974040000000000000000n, 25, 0),
};

export function lookupQuote(mm: Address, side: "buy" | "sell", leg: "weth" | "usdc", amount: bigint): QuoteOk | null {
  return TABLE[`${mm.toLowerCase()}|${side}|${leg}|${amount}`] ?? null;
}

export const CAP_MM_A = 100000000000n;
