import type { DeskConfig } from "./config.js";

const WAD = 10n ** 18n;

/** Ask and bid on the oracle. Inventory does not move the mid. */
export function widthQuotes(
  pWad: bigint,
  _wWad: bigint,
  _wStarWad: bigint,
  sSellBps: number,
  sBuyBps: number,
): { askWad: bigint; bidWad: bigint } {
  const sell = BigInt(sSellBps);
  const buy = BigInt(sBuyBps);
  return {
    askWad: (pWad * (10_000n + sell)) / 10_000n,
    bidWad: buy >= 10_000n ? 0n : (pWad * (10_000n - buy)) / 10_000n,
  };
}

export interface PriceInput {
  baseBal: bigint;
  quoteBal: bigint;
  amount: bigint;
  side: "buy" | "sell";
  exactIn: boolean;
  answer: bigint;
  sSellBps: number;
  sBuyBps: number;
  cap?: bigint;
  cfg: DeskConfig;
}

export interface PriceResult {
  amountIn: bigint;
  amountOut: bigint;
  wWad: bigint;
  rWad: bigint;
  askWad: bigint;
  bidWad: bigint;
  sSellBps: number;
  sBuyBps: number;
  overCap: boolean;
  sellStopped: boolean;
}

export function priceMirror(input: PriceInput): PriceResult {
  const d = input.cfg.desk;
  const pWad = input.answer * 10n ** BigInt(18 - d.oracleDecimals);
  const baseScale = 10n ** BigInt(18 - d.baseDecimals);
  const quoteScale = 10n ** BigInt(18 - d.quoteDecimals);
  const ethValue = (input.baseBal * baseScale * pWad) / WAD;
  const usdValue = input.quoteBal * quoteScale;
  const book = ethValue + usdValue;
  const wWad = book === 0n ? 0n : (ethValue * WAD) / book;
  const wStar = BigInt(d.wStarBps) * 10n ** 14n;
  const baseIsIn = input.side === "sell";
  const sellStopped = !baseIsIn && wWad <= wStar;
  const { askWad, bidWad } = widthQuotes(
    pWad,
    wWad,
    wStar,
    input.sSellBps,
    input.sBuyBps,
  );
  const rWad = pWad;
  const price = baseIsIn ? bidWad : askWad;
  let amountIn: bigint;
  let amountOut: bigint;
  if (input.exactIn && baseIsIn) {
    amountIn = input.amount;
    amountOut = (input.amount * baseScale * price) / WAD / quoteScale;
  } else if (input.exactIn && !baseIsIn) {
    amountIn = input.amount;
    amountOut = (input.amount * quoteScale * WAD) / price / baseScale;
  } else if (!input.exactIn && baseIsIn) {
    amountOut = input.amount;
    amountIn = ceilDiv(input.amount * quoteScale * WAD, price * baseScale);
  } else {
    amountOut = input.amount;
    amountIn = ceilDiv(input.amount * baseScale * price, WAD * quoteScale);
  }
  const wethAmt = baseIsIn ? amountIn : amountOut;
  const cap = input.cap ?? (1n << 128n) - 1n;
  return {
    amountIn,
    amountOut,
    wWad,
    rWad,
    askWad,
    bidWad,
    sSellBps: input.sSellBps,
    sBuyBps: input.sBuyBps,
    overCap: wethAmt > cap,
    sellStopped,
  };
}

function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}
