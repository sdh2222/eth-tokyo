// Types for ts/src/lib/client/verify.ts (main), aliased as @desk/verify in vite.config.ts.
// It recomputes a fill with the desk.5 rule (oracle mid and the width paid, no inventory
// scale) and imports only types, so the browser can run it.
declare module "@desk/verify" {
  export function verifyFill(
    f: {
      amountIn: bigint;
      amountOut: bigint;
      midWad: bigint;
      sSellBps: number;
      sBuyBps: number;
      wBeforeWad: bigint;
      tokenIn: `0x${string}`;
      base: string;
    },
    cfg: unknown,
  ): { steps: { label: string; formula: string; value: bigint }[]; matches: boolean };
}
