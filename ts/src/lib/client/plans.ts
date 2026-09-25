import { encodeFunctionData, maxUint256, type Address, type Hex } from "viem";

import { encodeTerms, dnsEncode } from "../encode.js";
import {
  buildOrder,
  buildProgram,
  strategyBytes,
  strategyHash,
} from "../program.js";
import { buildTakerData } from "../taker.js";
import type { DeskCtx, PlannedTx, PriceArgs } from "./ctx.js";
import { decodeDeskError } from "./errors.js";

const erc20 = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
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

const aquaAbi = [
  {
    type: "function",
    name: "ship",
    stateMutability: "nonpayable",
    inputs: [
      { name: "app", type: "address" },
      { name: "strategy", type: "bytes" },
      { name: "tokens", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "dock",
    stateMutability: "nonpayable",
    inputs: [
      { name: "app", type: "address" },
      { name: "strategyHash", type: "bytes32" },
      { name: "tokens", type: "address[]" },
    ],
    outputs: [],
  },
] as const;

const resolverAbi = [
  {
    type: "function",
    name: "setData",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes" },
      { name: "key", type: "string" },
      { name: "value", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const routerAbi = [
  {
    type: "function",
    name: "swap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "order", type: "bytes" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "takerData", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const multiSend = "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D" as Address;

export function planDock(ctx: DeskCtx, hash: Hex): PlannedTx {
  return {
    to: ctx.cfg.aqua,
    value: 0n,
    label: "dock",
    data: encodeFunctionData({
      abi: aquaAbi,
      functionName: "dock",
      args: [need(ctx.cfg.router, "router"), hash, tokens(ctx)],
    }),
  };
}

export function planSetTerms(
  ctx: DeskCtx,
  name: string,
  tierBps: number,
  cap: bigint,
): PlannedTx {
  if (tierBps > 0xffff || cap <= 0n) {
    throw decodeDeskError({ code: "INVALID_POLICY" });
  }
  return termsTx(ctx, name, encodeTerms(tierBps, cap), "set terms");
}

export function planCutOff(ctx: DeskCtx, name: string, tierBps = 0): PlannedTx {
  return termsTx(ctx, name, encodeTerms(tierBps, 0n), "cut off");
}

export function planMultiSend(txs: PlannedTx[]): PlannedTx {
  const packed = txs
    .map((tx) => {
      const data = tx.data.slice(2);
      const len = (data.length / 2).toString(16).padStart(64, "0");
      return `00${tx.to.slice(2)}${tx.value.toString(16).padStart(64, "0")}${len}${data}`;
    })
    .join("");
  return {
    to: multiSend,
    value: 0n,
    label: "multisend",
    data: `0x8d80ff0a${packed}` as Hex,
  };
}

export async function planMmApprovals(
  ctx: DeskCtx,
  mm: Address,
): Promise<PlannedTx[]> {
  const router = need(ctx.cfg.router, "router");
  const txs: PlannedTx[] = [];
  for (const token of [ctx.cfg.tokens.weth, ctx.cfg.tokens.usdc]) {
    if (token === "") continue;
    const allowance = await ctx.client.readContract({
      address: token,
      abi: erc20,
      functionName: "allowance",
      args: [mm, router],
    });
    if (allowance < maxUint256) {
      txs.push(approve(token, router, "approve router"));
    }
  }
  return txs;
}

export function buildSwapTx(
  ctx: DeskCtx,
  orderBytes: Hex,
  q: {
    ok: true;
    amountIn: bigint;
    amountOut: bigint;
    name: string;
    exactIn: boolean;
  },
  p: { slippageBps: number; deadlineSec: number; now?: bigint },
): PlannedTx {
  const now = p.now ?? BigInt(Math.floor(Date.now() / 1000));
  const threshold = q.exactIn
    ? (q.amountOut * BigInt(10_000 - p.slippageBps)) / 10_000n
    : (q.amountIn * BigInt(10_000 + p.slippageBps)) / 10_000n;
  return {
    to: need(ctx.cfg.router, "router"),
    value: 0n,
    label: "swap",
    data: encodeFunctionData({
      abi: routerAbi,
      functionName: "swap",
      args: [
        orderBytes,
        q.exactIn
          ? need(ctx.cfg.tokens.usdc, "usdc")
          : need(ctx.cfg.tokens.weth, "weth"),
        q.exactIn
          ? need(ctx.cfg.tokens.weth, "weth")
          : need(ctx.cfg.tokens.usdc, "usdc"),
        q.exactIn ? q.amountIn : q.amountOut,
        buildTakerData({
          name: q.name,
          exactIn: q.exactIn,
          threshold,
          deadline: now + BigInt(p.deadlineSec),
        }),
      ],
    }),
  };
}

export async function planShip(
  ctx: DeskCtx,
  p: {
    salt: bigint;
    ttlDays: number;
    wethAmt: bigint;
    usdcAmt: bigint;
    policy?: Partial<PriceArgs>;
  },
): Promise<{ txs: PlannedTx[]; strategyHash: Hex; program: Hex }> {
  const desk = { ...ctx.cfg.desk, ...spreadPolicy(p.policy) };
  if (
    desk.sMinBps > desk.sMaxBps ||
    desk.wStarBps > 10_000 ||
    desk.kappaBps >= 10_000
  ) {
    throw decodeDeskError({ code: "INVALID_POLICY" });
  }
  const deadline = BigInt(
    Math.floor(Date.now() / 1000) + p.ttlDays * 24 * 60 * 60,
  );
  const cfg = {
    ...ctx.cfg,
    desk: { ...ctx.cfg.desk, ...desk },
  };
  const program = buildProgram(cfg, { deadline, salt: p.salt });
  const order = buildOrder(need(ctx.cfg.safe, "safe"), program);
  const hash = strategyHash(order);
  const txs: PlannedTx[] = [];
  const safe = need(ctx.cfg.safe, "safe");
  for (const [token, amt] of [
    [ctx.cfg.tokens.weth, p.wethAmt],
    [ctx.cfg.tokens.usdc, p.usdcAmt],
  ] as const) {
    if (token === "" || amt === 0n) continue;
    const allowance = await ctx.client.readContract({
      address: token,
      abi: erc20,
      functionName: "allowance",
      args: [safe, ctx.cfg.aqua],
    });
    if (allowance < maxUint256)
      txs.push(approve(token, ctx.cfg.aqua, "approve aqua"));
  }
  txs.push({
    to: ctx.cfg.aqua,
    value: 0n,
    label: "ship",
    data: encodeFunctionData({
      abi: aquaAbi,
      functionName: "ship",
      args: [
        need(ctx.cfg.router, "router"),
        strategyBytes(order),
        tokens(ctx),
        [p.wethAmt, p.usdcAmt],
      ],
    }),
  });
  return { txs, strategyHash: hash, program: program.toString() as Hex };
}

function spreadPolicy(
  policy: Partial<PriceArgs> | undefined,
): Partial<DeskCtx["cfg"]["desk"]> {
  if (!policy) return {};
  const out: Partial<DeskCtx["cfg"]["desk"]> = {};
  if (policy.wStarBps !== undefined) out.wStarBps = policy.wStarBps;
  if (policy.kappaBps !== undefined) out.kappaBps = policy.kappaBps;
  if (policy.sMinBps !== undefined) out.sMinBps = policy.sMinBps;
  if (policy.sMaxBps !== undefined) out.sMaxBps = policy.sMaxBps;
  if (policy.maxStaleness !== undefined) out.maxStaleness = policy.maxStaleness;
  return out;
}

function termsTx(
  ctx: DeskCtx,
  name: string,
  value: Hex,
  label: string,
): PlannedTx {
  return {
    to: need(ctx.cfg.ens.resolver, "resolver"),
    value: 0n,
    label,
    data: encodeFunctionData({
      abi: resolverAbi,
      functionName: "setData",
      args: [dnsEncode(name), "desk.terms", value],
    }),
  };
}

function approve(token: Address, spender: Address, label: string): PlannedTx {
  return {
    to: token,
    value: 0n,
    label,
    data: encodeFunctionData({
      abi: erc20,
      functionName: "approve",
      args: [spender, maxUint256],
    }),
  };
}

function tokens(ctx: DeskCtx): Address[] {
  return [need(ctx.cfg.tokens.weth, "weth"), need(ctx.cfg.tokens.usdc, "usdc")];
}

function need(value: Address | "", label: string): Address {
  if (value === "") throw new Error(`${label} is unset`);
  return value;
}
