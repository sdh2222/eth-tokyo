import { verifyFill as verifyDeskFill } from "@desk/verify";
import sepoliaConfig from "@config";
import type { DeskConfig, FillCheck, FillRecord } from "./types";

// Recompute a fill with ts/src/lib/client/verify.ts (the desk.5 rule: oracle mid and the width
// paid). The fill record carries the width it paid, so it stands for both widths: verifyFill
// uses the sell width when the counterparty bought ETH, else the buy width.
export function recomputeFill(fill: FillRecord): FillCheck {
  const cfg = sepoliaConfig as DeskConfig;
  const check = verifyDeskFill(
    {
      amountIn: fill.amountIn,
      amountOut: fill.amountOut,
      midWad: fill.midWad,
      sSellBps: fill.spreadBps,
      sBuyBps: fill.spreadBps,
      wBeforeWad: fill.wBeforeWad,
      tokenIn: fill.tokenIn,
      base: cfg.tokens.weth,
    },
    cfg,
  );
  return {
    matches: check.matches,
    steps: check.steps.map((step) => ({ label: step.label, formula: step.formula, value: step.value.toString() })),
  };
}
