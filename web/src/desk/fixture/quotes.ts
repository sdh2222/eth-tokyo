// Fixture quotes for the two live client names (mm-a, mm-b).
import type { Address, QuoteOk } from "../types";
import { fixtureAgentWrite } from "./agent";

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

// Main's rule (PR #34), the same one fixtureBook shows: each name is priced from its own
// agent spread, ask = mid * (10000 + sell) / 10000 and bid = mid * (10000 - buy) / 10000, with
// mid 4000; each name's widths are the agent write derived in agent.ts. Any amount quotes;
// the 50 WETH cap is checked in state.ts.
const MID_WAD = 4000n * WETH;
const WRITE_A = fixtureAgentWrite("mm-a");
const WRITE_B = fixtureAgentWrite("mm-b");
const WIDTHS: Record<string, { sell: number; buy: number }> = {
  [MM_A]: { sell: WRITE_A.sellBps, buy: WRITE_A.buyBps },
  [MM_B]: { sell: WRITE_B.sellBps, buy: WRITE_B.buyBps },
};
const USDC_TO_WAD = 1000000000000n;
export const FILL_CAP_WETH = 50n * WETH;

function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

export function lookupQuote(mm: Address, side: "buy" | "sell", leg: "weth" | "usdc", amount: bigint): QuoteOk | null {
  const widths = WIDTHS[mm.toLowerCase()];
  if (!widths || amount <= 0n) return null;
  const ASK_WAD = (MID_WAD * BigInt(10000 + widths.sell)) / 10000n;
  const BID_WAD = (MID_WAD * BigInt(10000 - widths.buy)) / 10000n;
  const SELL_BPS = widths.sell;
  const BUY_BPS = widths.buy;
  if (side === "buy") {
    // The counterparty buys ETH at the ask: USDC in, WETH out.
    if (leg === "weth") return row(ceilDiv(amount * ASK_WAD, WETH * USDC_TO_WAD), amount, ASK_WAD, SELL_BPS, 1);
    return row(amount, (amount * USDC_TO_WAD * WETH) / ASK_WAD, ASK_WAD, SELL_BPS, 1);
  }
  // The counterparty sells ETH at the bid: WETH in, USDC out.
  if (leg === "weth") return row(amount, (amount * BID_WAD) / (WETH * USDC_TO_WAD), BID_WAD, BUY_BPS, 1);
  return row(ceilDiv(amount * USDC_TO_WAD * WETH, BID_WAD), amount, BID_WAD, BUY_BPS, 1);
}

export const CAP_MM_A = 100000000000n;
