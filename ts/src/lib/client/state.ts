import type { Address } from "viem";

import { priceMirror } from "../price.js";
import type { DeskCtx, StrategyInfo } from "./ctx.js";

export type MmState = {
  name: string;
  address: Address | "";
  expiry: bigint;
  expired: boolean;
  resolverOk: boolean;
  sPolicy: number;
  askWad: bigint;
  bidWad: bigint;
  status: "ok" | "expired" | "no-terms" | "wrong-resolver" | "no-addr";
};

export type DeskState = {
  live: boolean;
  balances: { weth: bigint; usdc: bigint };
  safeWallet: { weth: bigint; usdc: bigint };
  allowances: { weth: bigint; usdc: bigint };
  pWad: bigint;
  oracleUpdatedAt: bigint;
  oracleStale: boolean;
  wWad: bigint;
  targetWad: bigint;
  rWad: bigint;
  mms: MmState[];
};

const balanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

const oracleAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { type: "uint80" },
      { name: "answer", type: "int256" },
      { type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { type: "uint80" },
    ],
  },
] as const;

export async function readDeskState(
  ctx: DeskCtx,
  s: StrategyInfo,
): Promise<DeskState> {
  const safe = ctx.cfg.safe as Address;
  const weth = ctx.cfg.tokens.weth as Address;
  const usdc = ctx.cfg.tokens.usdc as Address;
  const calls = await ctx.client.multicall({
    contracts: [
      {
        address: weth,
        abi: balanceAbi,
        functionName: "balanceOf",
        args: [safe],
      },
      {
        address: usdc,
        abi: balanceAbi,
        functionName: "balanceOf",
        args: [safe],
      },
      {
        address: weth,
        abi: balanceAbi,
        functionName: "allowance",
        args: [safe, ctx.cfg.aqua],
      },
      {
        address: usdc,
        abi: balanceAbi,
        functionName: "allowance",
        args: [safe, ctx.cfg.aqua],
      },
      {
        address: ctx.cfg.oracle as Address,
        abi: oracleAbi,
        functionName: "latestRoundData",
      },
    ],
  });
  const walletWeth = calls[0].status === "success" ? calls[0].result : 0n;
  const walletUsdc = calls[1].status === "success" ? calls[1].result : 0n;
  const allowWeth = calls[2].status === "success" ? calls[2].result : 0n;
  const allowUsdc = calls[3].status === "success" ? calls[3].result : 0n;
  const round =
    calls[4].status === "success" ? calls[4].result : [0n, 0n, 0n, 0n, 0n];
  const answer = round[1] < 0n ? 0n : round[1];
  const updatedAt = round[3];
  const now = BigInt(Math.floor(Date.now() / 1000));
  const mirror = priceMirror({
    baseBal: 1n,
    quoteBal: 1n,
    answer,
    s: ctx.cfg.desk.sMinBps,
    cfg: ctx.cfg,
    side: "buy",
    exactIn: true,
    amount: 1n,
  });
  const mms: MmState[] = ctx.cfg.mms.map((mm) => ({
    name: mm.name,
    address: mm.address,
    expiry: 0n,
    expired: mm.address === "",
    resolverOk: mm.address !== "",
    sPolicy: ctx.cfg.desk.sMinBps,
    askWad: mirror.askWad,
    bidWad: mirror.bidWad,
    status: mm.address === "" ? "no-addr" : "ok",
  }));
  return {
    live: s.live,
    balances: { weth: 0n, usdc: 0n },
    safeWallet: { weth: walletWeth, usdc: walletUsdc },
    allowances: { weth: allowWeth, usdc: allowUsdc },
    pWad: answer * 10n ** BigInt(18 - ctx.cfg.desk.oracleDecimals),
    oracleUpdatedAt: updatedAt,
    oracleStale: now - updatedAt > BigInt(ctx.cfg.desk.maxStaleness),
    wWad: mirror.wWad,
    targetWad: BigInt(ctx.cfg.desk.wStarBps) * 10n ** 14n,
    rWad: mirror.rWad,
    mms,
  };
}
