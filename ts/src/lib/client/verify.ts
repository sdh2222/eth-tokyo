import type { DeskConfig } from "../config.js";
import type { DeskFillEvent } from "../events.js";
import { skewedMid } from "../price.js";

const WAD = 10n ** 18n;

export type FillCheck = {
  steps: { label: string; formula: string; value: bigint }[];
  matches: boolean;
};

export function verifyFill(
  f: Pick<
    DeskFillEvent,
    | "amountIn"
    | "amountOut"
    | "midWad"
    | "sSellBps"
    | "sBuyBps"
    | "wBeforeWad"
    | "tokenIn"
  > & {
    base: string;
  },
  cfg: DeskConfig,
): FillCheck {
  const d = cfg.desk;
  const baseIsIn = f.tokenIn.toLowerCase() === f.base.toLowerCase();
  const wStar = BigInt(d.wStarBps) * 10n ** 14n;
  const rWad = skewedMid(f.midWad, f.wBeforeWad, wStar);
  const price = baseIsIn
    ? (rWad * BigInt(10_000 - f.sBuyBps)) / 10_000n
    : (rWad * BigInt(10_000 + f.sSellBps)) / 10_000n;
  const baseScale = 10n ** BigInt(18 - d.baseDecimals);
  const quoteScale = 10n ** BigInt(18 - d.quoteDecimals);
  const amountOut = baseIsIn
    ? (f.amountIn * baseScale * price) / WAD / quoteScale
    : (f.amountIn * quoteScale * WAD) / price / baseScale;
  const steps = [
    { label: "mid", formula: "oracle mid", value: f.midWad },
    { label: "price", formula: baseIsIn ? "bid" : "ask", value: price },
    { label: "amountOut", formula: "integer fill", value: amountOut },
  ];
  return { steps, matches: amountOut === f.amountOut };
}
