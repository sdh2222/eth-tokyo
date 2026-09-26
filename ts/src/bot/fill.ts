import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
  http,
  maxUint256,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";

import { legRule, legTokens } from "./commands.js";
import {
  buildSwapTx,
  decodeDeskError,
  findLiveStrategy,
  quoteFor,
  type DeskCtx,
} from "../lib/client/index.js";
import { loadConfig, type DeskConfig } from "../lib/config.js";
import { deskFillAbi } from "../lib/events.js";
import { repoRoot } from "../scripts/_common/env.js";
import { accountForLabel } from "../scripts/_common/wallet.js";

const erc20 = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function mint(address,uint256)",
]);

export type FillRequest = {
  rpc: string;
  mm: "mm-a" | "mm-b";
  side: "buy" | "sell";
  weth?: string;
  usdc?: string;
};

export type FillDone = {
  hash: Hex;
  amountIn: bigint;
  amountOut: bigint;
  midWad: bigint;
  sellBps: number;
  buyBps: number;
};

export function loadDeskConfig(): DeskConfig {
  return loadConfig(
    JSON.parse(readFileSync(join(repoRoot, "config/sepolia.json"), "utf8")),
  );
}

export function deskRpc(flag?: string): string {
  const fromEnv = process.env.SEPOLIA_RPC_URL?.trim();
  return flag ?? (fromEnv ? fromEnv : "https://ethereum-sepolia-rpc.publicnode.com");
}

/** Quote, mint any shortfall of the mock token, approve the router, and send the swap. */
export async function sendFill(req: FillRequest): Promise<FillDone> {
  const cfg = loadDeskConfig();
  const account = accountForLabel(req.mm);
  const named = cfg.mms.find((mm) => mm.name.startsWith(`${req.mm}.`));
  if (!named || named.address === "") throw new Error(`${req.mm} is missing from config`);
  if (named.address.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(`${req.mm} wallet does not match config`);
  }
  const client = createPublicClient({ chain: sepolia, transport: http(req.rpc) });
  const wallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(req.rpc),
  });
  const ctx: DeskCtx = { client, cfg };
  const live = await findLiveStrategy(ctx);
  if (!live) throw new Error("no live strategy");
  const leg = legRule({ side: req.side, weth: req.weth, usdc: req.usdc });
  const tokens = legTokens(leg.token, leg.exactIn);
  const weth = cfg.tokens.weth;
  const usdc = cfg.tokens.usdc;
  if (weth === "" || usdc === "" || cfg.router === "") {
    throw new Error("config is missing a token or the router");
  }
  const tokenIn = tokens.tokenIn === "weth" ? weth : usdc;
  const tokenOut = tokens.tokenOut === "weth" ? weth : usdc;
  const quote = await quoteFor(ctx, live, {
    mm: { name: named.name, address: account.address },
    side: req.side,
    leg: leg.token,
    amount: leg.amount,
  });
  if (!quote.ok) {
    throw Object.assign(new Error(quote.error.code), { code: quote.error.code });
  }
  await topUp(wallet, client, tokenIn, account.address, quote.amountIn);
  await approve(wallet, client, tokenIn, account.address, cfg.router, quote.amountIn);
  const swap = buildSwapTx(
    ctx,
    live.order as Hex,
    {
      ok: true,
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
      name: named.name,
      exactIn: leg.exactIn,
      tokenIn,
      tokenOut,
    },
    { slippageBps: 50, deadlineSec: 600 },
  );
  const hash = await wallet.sendTransaction({
    to: swap.to,
    data: swap.data,
    gas: 1_500_000n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`swap failed: ${hash}`);
  const fill = receipt.logs
    .map((log) => {
      try {
        return decodeEventLog({
          abi: deskFillAbi,
          data: log.data,
          topics: log.topics,
        });
      } catch {
        return null;
      }
    })
    .find((log) => log?.eventName === "DeskFill");
  if (!fill || fill.eventName !== "DeskFill") {
    throw new Error(`swap ${hash} did not emit DeskFill`);
  }
  return {
    hash,
    amountIn: fill.args.amountIn,
    amountOut: fill.args.amountOut,
    midWad: fill.args.midWad,
    sellBps: fill.args.sSellBps,
    buyBps: fill.args.sBuyBps,
  };
}

async function topUp(
  wallet: { sendTransaction: (tx: { to: Address; data: Hex; gas: bigint }) => Promise<Hex> },
  client: ReturnType<typeof createPublicClient>,
  token: Address,
  owner: Address,
  need: bigint,
): Promise<void> {
  const balance = await client.readContract({
    address: token,
    abi: erc20,
    functionName: "balanceOf",
    args: [owner],
  });
  if (balance >= need) return;
  const hash = await wallet.sendTransaction({
    to: token,
    data: encodeFunctionData({
      abi: erc20,
      functionName: "mint",
      args: [owner, need - balance],
    }),
    gas: 120_000n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`mint failed: ${hash}`);
}

async function approve(
  wallet: { sendTransaction: (tx: { to: Address; data: Hex; gas: bigint }) => Promise<Hex> },
  client: ReturnType<typeof createPublicClient>,
  token: Address,
  owner: Address,
  spender: Address,
  need: bigint,
): Promise<void> {
  const allowance = await client.readContract({
    address: token,
    abi: erc20,
    functionName: "allowance",
    args: [owner, spender],
  });
  if (allowance >= need) return;
  const hash = await wallet.sendTransaction({
    to: token,
    data: encodeFunctionData({
      abi: erc20,
      functionName: "approve",
      args: [spender, maxUint256],
    }),
    gas: 80_000n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`approve failed: ${hash}`);
}

export function refusalCode(err: unknown): string {
  return decodeDeskError(err).code;
}
