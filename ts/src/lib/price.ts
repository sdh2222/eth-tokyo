import type { DeskConfig } from "./config.js";

const WAD = 10n ** 18n;

export type PriceMirrorInput = {
  baseBal: bigint;
  quoteBal: bigint;
  answer: bigint;
  s: number;
  spreadSource?: 0 | 1;
  cfg: DeskConfig;
  side: "buy" | "sell";
  exactIn: boolean;
  amount: bigint;
  cap?: bigint;
};

export type PriceMirrorResult = {
  amountIn: bigint;
  amountOut: bigint;
  wWad: bigint;
  rWad: bigint;
  askWad: bigint;
  bidWad: bigint;
  sFinal: number;
  spreadSource: 0 | 1 | 2;
  floorBps: number;
  overCap: boolean;
};

export function priceMirror(input: PriceMirrorInput): PriceMirrorResult {
  const d = input.cfg.desk;
  const pWad = input.answer * 10n ** BigInt(18 - d.oracleDecimals);
  const baseScale = 10n ** BigInt(18 - d.baseDecimals);
  const quoteScale = 10n ** BigInt(18 - d.quoteDecimals);
  const baseIsIn = input.side === "sell";
  const ethValue = (input.baseBal * baseScale * pWad) / WAD;
  const usdValue = input.quoteBal * quoteScale;
  const book = ethValue + usdValue;
  if (book === 0n) throw new Error("empty book");
  const wWad = (ethValue * WAD) / book;
  const knownIsBase =
    (input.exactIn && baseIsIn) || (!input.exactIn && !baseIsIn);
  const notionalEst = knownIsBase
    ? (input.amount * baseScale * pWad) / WAD
    : input.amount * quoteScale;
  const floorBps = Number(ceilDiv(BigInt(d.kappaBps) * notionalEst, 2n * book));
  const sFinal = Math.max(input.s, floorBps);
  const spreadSource: 0 | 1 | 2 =
    floorBps > input.s ? 2 : (input.spreadSource ?? 0);
  const dev = wWad - BigInt(d.wStarBps) * 10n ** 14n;
  const skew = (BigInt(d.kappaBps) * dev) / 10000n;
  const rWad = (pWad * (WAD - skew)) / WAD;
  const askWad = (rWad * BigInt(10000 + sFinal)) / 10000n;
  const bidWad = (rWad * BigInt(10000 - sFinal)) / 10000n;
  let amountIn: bigint;
  let amountOut: bigint;
  if (!baseIsIn && input.exactIn) {
    amountIn = input.amount;
    amountOut = (amountIn * quoteScale * WAD) / askWad / baseScale;
  } else if (!baseIsIn) {
    amountOut = input.amount;
    amountIn = ceilDiv(
      ceilDiv(amountOut * baseScale * askWad, WAD),
      quoteScale,
    );
  } else if (input.exactIn) {
    amountIn = input.amount;
    amountOut = (amountIn * baseScale * bidWad) / WAD / quoteScale;
  } else {
    amountOut = input.amount;
    amountIn = ceilDiv(
      ceilDiv(amountOut * quoteScale * WAD, bidWad),
      baseScale,
    );
  }
  const notional = baseIsIn ? amountOut : amountIn;
  return {
    amountIn,
    amountOut,
    wWad,
    rWad,
    askWad,
    bidWad,
    sFinal,
    spreadSource,
    floorBps,
    overCap: input.cap !== undefined && notional > input.cap,
  };
}

function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}
