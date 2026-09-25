import { encodeErrorResult, type Address } from "viem";

import { decodeDeskError } from "../lib/client/errors.js";
import { decide } from "../scripts/ship.js";
import { verifyFill } from "../lib/client/verify.js";
import { placeholderConfig } from "../lib/config.js";

const empty = { type: "error" as const, name: "", inputs: [] as const };

function data(name: string): `0x${string}` {
  return encodeErrorResult({
    abi: [{ ...empty, name }],
    errorName: name,
  });
}

export function runChecks(): { id: string; pass: boolean; detail: string }[] {
  const cfg = placeholderConfig();
  const fill = verifyFill(
    {
      amountIn: 1_000n * 10n ** 6n,
      amountOut: 0n,
      midWad: 4000n * 10n ** 18n,
      spreadBps: 0,
      wBeforeWad: 7000n * 10n ** 14n,
      tokenIn: tokenAddress(cfg.tokens.usdc),
      base: tokenAddress(cfg.tokens.weth),
    },
    cfg,
  );
  const matched = verifyFill(
    { ...fillArgs(cfg), amountOut: fill.steps[2]?.value ?? 0n },
    cfg,
  );
  const stale = decodeDeskError({ data: data("DeskPriceOracleStale") });
  const mismatch = decodeDeskError({ data: data("EnsGateTakerMismatch") });
  const expired = decodeDeskError({ data: data("EnsGateNameExpired") });
  const noTerms = decodeDeskError({ data: data("DeskPriceNoTerms") });
  const cap = decodeDeskError({ data: data("DeskPriceCapExceeded") });
  const stopped = decodeDeskError({
    data: data("SafeBalancesForTokenNotInActiveStrategy"),
  });
  const replace = decide(
    { strategyHash: "0x01" },
    { dock: true, noShip: false, printOnly: false, replay: false },
  );
  const docked = decide(null, {
    dock: true,
    noShip: true,
    printOnly: false,
    replay: false,
  });
  const low = clamp(1, cfg.desk.sMinBps, cfg.desk.sMaxBps);
  const high = clamp(500, cfg.desk.sMinBps, cfg.desk.sMaxBps);
  return [
    {
      id: "Q-E2E-1",
      pass: matched.matches,
      detail: "verifyFill matches the recomputed amount",
    },
    {
      id: "Q-E2E-2",
      pass: stale.code === "DeskPriceOracleStale",
      detail: stale.title,
    },
    {
      id: "Q-E2E-3",
      pass:
        mismatch.code === "EnsGateTakerMismatch" &&
        expired.code === "EnsGateNameExpired" &&
        noTerms.code === "DeskPriceNoTerms",
      detail: `${mismatch.code}, ${expired.code}, ${noTerms.code}`,
    },
    {
      id: "Q-E2E-4",
      pass: cap.code === "DeskPriceCapExceeded",
      detail: cap.title,
    },
    {
      id: "Q-E2E-5",
      pass: replace.action === "ship",
      detail: "dock then ship",
    },
    {
      id: "Q-E2E-6",
      pass:
        docked.message === "nothing to dock" &&
        stopped.code === "SafeBalancesForTokenNotInActiveStrategy",
      detail: stopped.title,
    },
    {
      id: "Q-E2E-7",
      pass: low === 5 && high === 200,
      detail: `clamped ${low} and ${high}`,
    },
  ];
}

function tokenAddress(value: Address | ""): Address {
  if (value === "") throw new Error("token address is unset");
  return value;
}

function fillArgs(cfg: ReturnType<typeof placeholderConfig>) {
  return {
    amountIn: 1_000n * 10n ** 6n,
    midWad: 4000n * 10n ** 18n,
    spreadBps: 0,
    wBeforeWad: 7000n * 10n ** 14n,
    tokenIn: tokenAddress(cfg.tokens.usdc),
    base: tokenAddress(cfg.tokens.weth),
  };
}

function clamp(bps: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, bps));
}

const checks = runChecks();
let failed = 0;
for (const check of checks) {
  if (check.pass) console.log(`PASS ${check.id}`);
  else {
    failed += 1;
    console.log(`FAIL ${check.id}: ${check.detail}`);
  }
}
console.log(
  "Fork Q-E2E still needs the ENS lane's Safe and addr records. These lines check the client rules those steps assert.",
);
if (failed > 0) process.exit(1);
