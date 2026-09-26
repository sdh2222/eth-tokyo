export type Leg = { side: "buy" | "sell"; weth?: string; usdc?: string };

export function legRule(leg: Leg): {
  exactIn: boolean;
  amount: bigint;
  token: "weth" | "usdc";
} {
  const hasWeth = leg.weth !== undefined;
  const hasUsdc = leg.usdc !== undefined;
  if (hasWeth === hasUsdc)
    throw new Error("exactly one of --weth and --usdc is required");
  if (hasUsdc) {
    return {
      exactIn: leg.side === "buy",
      amount: parseUnits(leg.usdc ?? "0", 6),
      token: "usdc",
    };
  }
  return {
    exactIn: leg.side === "sell",
    amount: parseUnits(leg.weth ?? "0", 18),
    token: "weth",
  };
}

export function keyName(mm: string): string {
  const id = mm.replace("mm-", "").toUpperCase();
  return `MM_${id}_PK`;
}

function parseUnits(value: string, decimals: number): bigint {
  const [whole, frac = ""] = value.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
}
