import type { Address } from "viem";

import { priceMirror } from "../price.js";
import { buildTakerData } from "../taker.js";
import type { DeskCtx, DeskError, StrategyInfo } from "./ctx.js";
import { decodeDeskError } from "./errors.js";
import { readSafeBook } from "./state.js";

const quoteAbi = [
  {
    type: "function",
    name: "quote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "order", type: "bytes" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "takerData", type: "bytes" },
    ],
    outputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOut", type: "uint256" },
      { name: "orderHash", type: "bytes32" },
    ],
  },
] as const;

export type QuoteResult =
  | {
      ok: true;
      amountIn: bigint;
      amountOut: bigint;
      priceWad: bigint;
      sSellBps: number;
      sBuyBps: number;
      mirror: ReturnType<typeof priceMirror>;
      mirrorMatches: boolean;
    }
  | { ok: false; error: DeskError };

export async function quoteFor(
  ctx: DeskCtx,
  s: StrategyInfo,
  q: {
    mm: { name: string; address: Address };
    side: "buy" | "sell";
    leg: "weth" | "usdc";
    amount: bigint;
  },
): Promise<QuoteResult> {
  const exactIn = q.leg === "usdc" ? q.side === "buy" : q.side === "sell";
  const tokenIn = exactIn
    ? q.side === "buy"
      ? ctx.cfg.tokens.usdc
      : ctx.cfg.tokens.weth
    : q.side === "buy"
      ? ctx.cfg.tokens.usdc
      : ctx.cfg.tokens.weth;
  const tokenOut =
    tokenIn === ctx.cfg.tokens.usdc ? ctx.cfg.tokens.weth : ctx.cfg.tokens.usdc;
  try {
    const simulated = await ctx.client.simulateContract({
      address: ctx.cfg.router as Address,
      abi: quoteAbi,
      functionName: "quote",
      account: q.mm.address,
      args: [
        s.order as `0x${string}`,
        tokenIn as Address,
        tokenOut as Address,
        q.amount,
        buildTakerData({ name: q.mm.name, exactIn }),
      ],
    });
    const book = await readSafeBook(ctx);
    const mirror = priceMirror({
      baseBal: book.weth,
      quoteBal: book.usdc,
      answer: book.answer,
      sSellBps: ctx.cfg.desk.sSellBps,
      sBuyBps: ctx.cfg.desk.sBuyBps,
      cfg: ctx.cfg,
      side: q.side,
      exactIn,
      amount: q.amount,
    });
    return {
      ok: true,
      amountIn: simulated.result[0],
      amountOut: simulated.result[1],
      priceWad: mirror.rWad,
      sSellBps: mirror.sSellBps,
      sBuyBps: mirror.sBuyBps,
      mirror,
      mirrorMatches:
        mirror.amountIn === simulated.result[0] &&
        mirror.amountOut === simulated.result[1],
    };
  } catch (e) {
    if (e instanceof Error && e.message === "empty book") {
      return { ok: false, error: decodeDeskError({ code: "UNKNOWN" }) };
    }
    return { ok: false, error: decodeDeskError(e) };
  }
}
