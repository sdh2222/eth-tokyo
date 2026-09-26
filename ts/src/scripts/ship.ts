import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createPublicClient, http, type Hex } from "viem";
import { sepolia } from "viem/chains";

import {
  findLiveStrategy,
  findStrategies,
  planDock,
  planMultiSend,
  planShip,
  type DeskCtx,
  type PlannedTx,
  type StrategyInfo,
} from "../lib/client/index.js";
import { loadConfig } from "../lib/config.js";
import { loadEnv, repoRoot } from "./_common/env.js";
import { executeSafeCalls } from "./_common/safe-send.js";
import { keyForLabel } from "./_common/wallet.js";

export type ShipFlags = {
  salt?: bigint;
  dock: boolean;
  noShip: boolean;
  printOnly: boolean;
  replay: boolean;
};

export function decide(
  live: { strategyHash: Hex } | null,
  flags: ShipFlags,
): {
  code: number;
  message?: string;
  action: "refuse" | "nothing" | "replay" | "ship" | "dock";
} {
  if (live && !flags.dock && !flags.replay) {
    return {
      code: 1,
      action: "refuse",
      message: `a strategy is live (${live.strategyHash}); pass --dock to replace it`,
    };
  }
  if (flags.replay) return { code: 0, action: "replay" };
  if (flags.noShip) {
    if (!live)
      return { code: 0, action: "nothing", message: "nothing to dock" };
    return { code: 0, action: "dock" };
  }
  return { code: 0, action: "ship" };
}

export function formatPlan(safe: string, txs: PlannedTx[]): string {
  const packed = planMultiSend(txs);
  const lines = [
    `safe ${safe}`,
    `multisend ${packed.to}`,
    `calldata ${packed.data}`,
    ...txs.map((tx, i) => `${i + 1}. ${tx.label}`),
  ];
  return lines.join("\n");
}

export function parseArgs(
  argv: string[],
): ShipFlags & { rpc?: string; config: string } {
  const flags: ShipFlags & { rpc?: string; config: string } = {
    dock: false,
    noShip: false,
    printOnly: false,
    replay: false,
    config: "config/sepolia.json",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dock") flags.dock = true;
    else if (arg === "--no-ship") flags.noShip = true;
    else if (arg === "--print-only") flags.printOnly = true;
    else if (arg === "--replay") flags.replay = true;
    else if (arg === "--salt") flags.salt = BigInt(argv[++i] ?? "0");
    else if (arg === "--rpc") flags.rpc = argv[++i];
    else if (arg === "--config") flags.config = argv[++i] ?? flags.config;
  }
  return flags;
}

export async function plannedTxs(
  ctx: DeskCtx,
  live: StrategyInfo | null,
  flags: ShipFlags,
): Promise<PlannedTx[]> {
  const choice = decide(live, flags);
  if (choice.action === "nothing" || choice.action === "refuse") return [];
  if (choice.action === "dock")
    return live ? [planDock(ctx, live.strategyHash)] : [];
  if (choice.action === "replay")
    return live ? [planDock(ctx, live.strategyHash)] : [];
  const plan = await planShip(ctx, {
    salt: flags.salt ?? BigInt(Date.now()),
    ttlDays: ctx.cfg.desk.strategyTtlDays,
    wethAmt: BigInt(ctx.cfg.desk.shipWeth),
    usdcAmt: BigInt(ctx.cfg.desk.shipUsdc),
  });
  return flags.dock && live
    ? [planDock(ctx, live.strategyHash), ...plan.txs]
    : plan.txs;
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));
  loadEnv();
  const cfg = loadConfig(
    JSON.parse(readFileSync(join(repoRoot, flags.config), "utf8")),
  );
  const fromEnv = process.env.SEPOLIA_RPC_URL?.trim();
  const rpc =
    flags.rpc ??
    (fromEnv ? fromEnv : "https://ethereum-sepolia-rpc.publicnode.com");
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const ctx: DeskCtx = { client, cfg };
  const live = await findLiveStrategy(ctx);
  const choice = decide(live, flags);
  if (choice.message) console.log(choice.message);
  if (choice.code !== 0 || choice.action === "nothing") {
    process.exit(choice.code);
  }
  const txs = await plannedTxs(ctx, live, flags);
  if (flags.printOnly) {
    console.log(formatPlan(cfg.safe === "" ? "unset" : cfg.safe, txs));
    process.exit(0);
  }
  if (cfg.safe === "") throw new Error("safe is unset");
  const hash = await executeSafeCalls({
    rpc,
    safe: cfg.safe,
    calls: txs,
    ownerKeys: [keyForLabel("safe-owner-1"), keyForLabel("safe-owner-2")],
    executorKey: keyForLabel("risk-agent"),
  });
  console.log(`safe tx ${hash}`);
  const found = await findStrategies(ctx);
  writeFileSync(
    join(repoRoot, `config/strategy.${cfg.chainId}.json`),
    JSON.stringify(found, null, 2),
  );
}

const isMain = process.argv[1]?.endsWith("ship.ts");
if (isMain) {
  main().catch((err: unknown) => {
    console.log(err instanceof Error ? err.message : String(err));
    process.exit(2);
  });
}
