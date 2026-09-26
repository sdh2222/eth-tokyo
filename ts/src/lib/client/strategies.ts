import { decodeEventLog, type Hex } from "viem";

import type { DeskCtx, StrategyInfo } from "./ctx.js";
import { decodeProgram } from "./program.js";

const aquaEvents = [
  {
    type: "event",
    name: "Shipped",
    inputs: [
      { name: "maker", type: "address", indexed: false },
      { name: "app", type: "address", indexed: false },
      { name: "strategyHash", type: "bytes32", indexed: false },
      { name: "strategy", type: "bytes", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Docked",
    inputs: [
      { name: "maker", type: "address", indexed: false },
      { name: "app", type: "address", indexed: false },
      { name: "strategyHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

const rawBalancesAbi = [
  {
    type: "function",
    name: "rawBalances",
    stateMutability: "view",
    inputs: [
      { name: "maker", type: "address" },
      { name: "app", type: "address" },
      { name: "strategyHash", type: "bytes32" },
      { name: "token", type: "address" },
    ],
    outputs: [
      { name: "balance", type: "uint248" },
      { name: "tokensCount", type: "uint8" },
    ],
  },
] as const;

export async function findStrategies(ctx: DeskCtx): Promise<StrategyInfo[]> {
  const latest = await ctx.client.getBlockNumber();
  const from = BigInt(ctx.cfg.deployBlock);
  const chunk = BigInt(ctx.cfg.logChunk);
  const logs = [];
  for (let start = from; start <= latest; start += chunk) {
    const end = start + chunk - 1n > latest ? latest : start + chunk - 1n;
    const page = await ctx.client.getLogs({
      address: ctx.cfg.aqua,
      fromBlock: start,
      toBlock: end,
    });
    logs.push(...page);
  }
  const byHash = new Map<Hex, StrategyInfo>();
  for (const log of logs) {
    const decoded = decodeAqua(log);
    if (!decoded) continue;
    if (decoded.maker.toLowerCase() !== ctx.cfg.safe.toLowerCase()) continue;
    if (decoded.app.toLowerCase() !== String(ctx.cfg.router).toLowerCase())
      continue;
    if (decoded.kind === "Shipped" && decoded.strategy && decoded.program) {
      byHash.set(decoded.strategyHash, {
        strategyHash: decoded.strategyHash,
        order: decoded.strategy,
        program: decoded.program,
        decoded: decodeProgram(decoded.program),
        shippedAt: {
          block: log.blockNumber ?? 0n,
          tx: log.transactionHash ?? "0x",
        },
        live: false,
      });
    }
    if (decoded.kind === "Docked") {
      const existing = byHash.get(decoded.strategyHash);
      if (existing)
        existing.dockedAt = {
          block: log.blockNumber ?? 0n,
          tx: log.transactionHash ?? "0x",
        };
    }
  }
  const weth = ctx.cfg.tokens.weth;
  for (const info of byHash.values()) {
    if (weth === "" || ctx.cfg.router === "") continue;
    const [balance, tokensCount] = await ctx.client.readContract({
      address: ctx.cfg.aqua,
      abi: rawBalancesAbi,
      functionName: "rawBalances",
      args: [ctx.cfg.safe as Hex, ctx.cfg.router, info.strategyHash, weth],
    });
    info.live = tokensCount !== 0 && tokensCount !== 0xff && balance >= 0n;
  }
  return [...byHash.values()];
}

export async function findLiveStrategy(
  ctx: DeskCtx,
): Promise<StrategyInfo | null> {
  const live = (await findStrategies(ctx)).filter((s) => s.live);
  if (live.length === 0) return null;
  const newest = live[live.length - 1];
  if (live.length > 1) newest.warning = "MULTIPLE_LIVE";
  return newest;
}

function decodeAqua(log: { data: Hex; topics: readonly Hex[] }):
  | {
      kind: "Shipped" | "Docked";
      maker: string;
      app: string;
      strategyHash: Hex;
      strategy?: Hex;
      program?: Hex;
    }
  | undefined {
  try {
    const shipped = decodeEventLog({
      abi: aquaEvents,
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
    });
    if (shipped.eventName === "Shipped") {
      const strategy = shipped.args.strategy;
      return {
        kind: "Shipped",
        maker: shipped.args.maker,
        app: shipped.args.app,
        strategyHash: shipped.args.strategyHash,
        strategy,
        program: programFromStrategy(strategy),
      };
    }
    if (shipped.eventName === "Docked") {
      return {
        kind: "Docked",
        maker: shipped.args.maker,
        app: shipped.args.app,
        strategyHash: shipped.args.strategyHash,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function programFromStrategy(strategy: Hex): Hex {
  const marker = "0d05";
  const body = strategy.slice(2);
  const at = body.indexOf(marker);
  if (at < 0) return "0x";
  return `0x${body.slice(at)}`;
}
