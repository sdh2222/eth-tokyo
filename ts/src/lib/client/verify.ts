import type { DeskConfig } from "../config.js";
import type { DeskFillEvent } from "../events.js";

const WAD = 10n ** 18n;

export type FillCheck = {
  steps: { label: string; formula: string; value: bigint }[];
  matches: boolean;
};

export function verifyFill(
  f: Pick<
    DeskFillEvent,
    "amountIn" | "amountOut" | "midWad" | "spreadBps" | "wBeforeWad" | "tokenIn"
  > & {
    base: string;
  },
  cfg: DeskConfig,
): FillCheck {
  const d = cfg.desk;
  const wStar = BigInt(d.wStarBps) * 10n ** 14n;
  const delta = f.wBeforeWad - wStar;
  const skew = (BigInt(d.kappaBps) * delta) / 10n ** 4n;
  const rWad = (f.midWad * (WAD - skew)) / WAD;
  const baseIsIn = f.tokenIn.toLowerCase() === f.base.toLowerCase();
  const s = BigInt(f.spreadBps);
  const price = baseIsIn
    ? (rWad * (10_000n - s)) / 10_000n
    : (rWad * (10_000n + s)) / 10_000n;
  const baseScale = 10n ** BigInt(18 - d.baseDecimals);
  const quoteScale = 10n ** BigInt(18 - d.quoteDecimals);
  const amountOut = baseIsIn
    ? (f.amountIn * baseScale * price) / WAD / quoteScale
    : (f.amountIn * quoteScale * WAD) / price / baseScale;
  const steps = [
    { label: "rWad", formula: "mid * (WAD - skew) / WAD", value: rWad },
    { label: "price", formula: baseIsIn ? "bid" : "ask", value: price },
    { label: "amountOut", formula: "integer fill", value: amountOut },
  ];
  return { steps, matches: amountOut === f.amountOut };
}
