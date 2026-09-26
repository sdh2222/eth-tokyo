import { verifyFill as verifyDeskFill } from "@desk/verify";
import sepoliaConfig from "@config";
import {
  decodeDeskError,
  decodeProgram,
  describeProgram,
  findLiveStrategy,
  findStrategies,
  readDeskState,
  readFills,
} from "@desk/browser";
import { ERRORS } from "../../copy/errors";
import type { DeskPort } from "../port";
import type { Address, DeskConfig, DeskError, DeskState, FillRecord, Hex, StrategyInfo } from "../types";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const HASH = `0x${"00".repeat(32)}` as Hex;

function tradeNotOpen(): DeskError {
  return {
    code: "NO_LIVE_STRATEGY",
    args: {},
    title: "The desk is not open for a trade yet",
    hint: "Balances and the oracle are live. A quote is not.",
    severity: "user",
  };
}

function unavailable(): DeskError {
  const copy = ERRORS.NO_LIVE_STRATEGY ?? ERRORS.UNKNOWN;
  return {
    code: "NO_LIVE_STRATEGY",
    args: {},
    title: copy?.title ?? "No desk is open",
    hint: copy?.hint ?? "",
    severity: copy?.severity ?? "user",
  };
}

function tx(label: string) {
  return { to: ZERO, data: "0x" as Hex, value: 0n as const, label };
}

function filled(address: string | undefined): boolean {
  return typeof address === "string" && /^0x[0-9a-fA-F]{40}$/.test(address) && !/^0x0{40}$/i.test(address);
}

export function chainReady(cfg: DeskConfig): boolean {
  return filled(cfg.router) && filled(cfg.oracle) && filled(cfg.safe) && filled(cfg.tokens.weth) && filled(cfg.tokens.usdc);
}

function dnsNameToString(dnsName: Hex): string {
  const bytes = dnsName.slice(2);
  const labels: string[] = [];
  let i = 0;
  while (i * 2 + 2 <= bytes.length) {
    const n = Number.parseInt(bytes.slice(i * 2, i * 2 + 2), 16);
    if (n === 0) break;
    const start = (i + 1) * 2;
    const end = start + n * 2;
    if (end > bytes.length) return dnsName;
    labels.push(new TextDecoder().decode(hexBytes(bytes.slice(start, end))));
    i += 1 + n;
  }
  return labels.length > 0 ? labels.join(".") : dnsName;
}

function hexBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function toState(
  raw: Awaited<ReturnType<typeof readDeskState>>,
  cfg: DeskConfig,
  deadline: bigint,
): DeskState {
  return {
    live: raw.live,
    balances: raw.balances,
    safeWallet: raw.safeWallet,
    allowances: raw.allowances,
    pWad: raw.pWad,
    oracleUpdatedAt: Number(raw.oracleUpdatedAt),
    oracleStale: raw.oracleStale,
    wWad: raw.wWad,
    targetWad: raw.targetWad,
    rWad: raw.rWad,
    deadline: Number(deadline),
    maxStaleness: cfg.desk.maxStaleness ?? (cfg.desk.maxBlocks ?? 3) * 12,
    mms: raw.mms.map((mm) => ({
      name: mm.name,
      address: mm.address === "" ? ZERO : mm.address,
      expiry: Number(mm.expiry),
      expired: mm.expired,
      resolverOk: mm.resolverOk,
      sPolicy: mm.sPolicy,
      askWad: mm.askWad,
      bidWad: mm.bidWad,
      status: mm.status,
    })),
  };
}

// The DeskFill event carries both widths (sSellBps, sBuyBps). spreadBps is the width this
// fill paid: the sell width when the counterparty bought ETH, else the buy width.
function toFill(raw: Awaited<ReturnType<typeof readFills>>[number], weth: string, blockTime: number): FillRecord {
  const name = dnsNameToString(raw.dnsName);
  const boughtEth = raw.tokenOut.toLowerCase() === weth.toLowerCase();
  return {
    tx: raw.transactionHash,
    blockNumber: raw.blockNumber,
    blockTime,
    orderHash: raw.orderHash,
    nameHash: raw.nameHash,
    taker: raw.taker,
    dnsName: name,
    name,
    tokenIn: raw.tokenIn,
    tokenOut: raw.tokenOut,
    amountIn: raw.amountIn,
    amountOut: raw.amountOut,
    midWad: raw.midWad,
    spreadBps: boughtEth ? raw.sSellBps : raw.sBuyBps,
    spreadSource: 0,
    wBeforeWad: raw.wBeforeWad,
  };
}

function canDescribe(decoded: StrategyInfo["decoded"]): decoded is StrategyInfo["decoded"] & {
  gate: { suffix: string };
  price: {
    wStarBps: number;
    kappaBps: number;
    sMinBps: number;
    sMaxBps: number;
    maxStaleness: number;
  };
} {
  if (!("price" in decoded) || !("gate" in decoded)) return false;
  const price = decoded.price;
  const gate = decoded.gate;
  if (typeof price !== "object" || price === null || typeof gate !== "object" || gate === null) return false;
  return "suffix" in gate && "wStarBps" in price;
}

export function createLivePort(): DeskPort {
  return {
    async findStrategies(ctx) {
      if (!chainReady(ctx.cfg)) return [];
      return findStrategies(ctx);
    },
    async findLiveStrategy(ctx) {
      if (!chainReady(ctx.cfg)) return null;
      return findLiveStrategy(ctx);
    },
    decodeProgram(program) {
      return decodeProgram(program);
    },
    describeProgram(decoded, cfg) {
      if (!canDescribe(decoded)) return [];
      return describeProgram(decoded, cfg);
    },
    async planShip() {
      return { txs: [], order: null, strategyHash: HASH, program: "0x" };
    },
    planDock() {
      return tx("Close the current desk (dock)");
    },
    planMultiSend(txs) {
      return txs[0] ?? tx("Safe transaction");
    },
    async readDeskState(ctx, strategy) {
      if (!chainReady(ctx.cfg)) throw unavailable();
      const raw = await readDeskState(ctx, strategy as StrategyInfo);
      return toState(raw, ctx.cfg, strategy.decoded.deadline);
    },
    async quoteFor(_ctx, _strategy, q) {
      try {
        const response = await fetch("https://desk-api-latest.onrender.com/v1/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mm: q.mm,
            side: q.side,
            leg: q.leg,
            amount: q.amount.toString(),
          }),
        });
        const body = (await response.json()) as {
          ok?: boolean;
          amountIn?: string;
          amountOut?: string;
          priceWad?: string;
          spreadBps?: number;
          spreadSource?: 0 | 1 | 2;
        };
        if (!response.ok || !body.ok || body.amountIn === undefined || body.amountOut === undefined || body.priceWad === undefined) {
          const err = (body as { error?: { title?: string; hint?: string; code?: string } }).error;
          return {
            ok: false as const,
            error: {
              code: err?.code ?? "QUOTE_FAILED",
              args: {},
              title: err?.title ?? "Quote is read from the contract",
              hint: err?.hint ?? "The router did not return a price.",
              severity: "user",
            },
          };
        }
        const amountIn = BigInt(body.amountIn);
        const amountOut = BigInt(body.amountOut);
        return {
          ok: true as const,
          amountIn,
          amountOut,
          priceWad: BigInt(body.priceWad),
          spreadBps: body.spreadBps ?? 0,
          spreadSource: body.spreadSource ?? 0,
          mirror: { amountIn, amountOut },
          mirrorMatches: true as const,
        };
      } catch {
        return { ok: false as const, error: tradeNotOpen() };
      }
    },
    buildSwapTx() {
      return tx("Fill");
    },
    async planMmApprovals() {
      return [];
    },
    async readFills(ctx, strategy, fromBlock) {
      if (!chainReady(ctx.cfg)) return [];
      const rows = await readFills(ctx, strategy, fromBlock);
      const client = ctx.client as { getBlock(args: { blockNumber: bigint }): Promise<{ timestamp: bigint }> };
      const blocks = [...new Set(rows.map((row) => row.blockNumber))];
      const times = new Map<bigint, number>();
      await Promise.all(
        blocks.map(async (blockNumber) => {
          const block = await client.getBlock({ blockNumber });
          times.set(blockNumber, Number(block.timestamp));
        }),
      );
      return rows.map((row) => toFill(row, ctx.cfg.tokens.weth, times.get(row.blockNumber) ?? 0));
    },
    // The fill record carries the width it paid, so it stands for both widths here:
    // verifyFill uses the sell width when the counterparty bought ETH, else the buy width.
    verifyFill(fill) {
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
    },
    decodeDeskError(error) {
      return decodeDeskError(error);
    },
    priceMirror() {
      return {
        amountIn: 0n,
        amountOut: 0n,
        wWad: 0n,
        rWad: 0n,
        askWad: 0n,
        bidWad: 0n,
        sFinal: 0,
        spreadSource: 0,
      };
    },
    previewCurve() {
      return [];
    },
  };
}
