import type { DeskState, FillRecord, StrategyInfo } from "./types";

const API = "https://watermark-k4ub.onrender.com";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) {
    throw {
      code: "NO_CONFIG",
      args: {},
      title: "Desk API is not running",
      hint: "The desk API did not respond.",
      severity: "config" as const,
    };
  }
  return response.json() as Promise<T>;
}

function bi(value: string): bigint {
  return BigInt(value);
}

export async function fetchApiDesk(): Promise<{ strategy: StrategyInfo | null; state: DeskState | null }> {
  const body = await getJson<{
    strategy: {
      strategyHash: StrategyInfo["strategyHash"];
      program: StrategyInfo["program"];
      decoded: { deadline: string; salt: string };
      shippedAt: { block: string; tx: StrategyInfo["shippedAt"]["tx"] };
      live: boolean;
      warning: "MULTIPLE_LIVE" | null;
    } | null;
    state: {
      live: boolean;
      balances: { weth: string; usdc: string };
      safeWallet: { weth: string; usdc: string };
      allowances: { weth: string; usdc: string };
      pWad: string;
      oracleUpdatedAt: number;
      oracleStale: boolean;
      wWad: string;
      targetWad: string;
      rWad: string;
      deadline: number;
      maxStaleness: number;
      mms: {
        name: string;
        address: DeskState["mms"][number]["address"];
        expiry: number;
        expired: boolean;
        resolverOk: boolean;
        sPolicy: number;
        askWad: string;
        bidWad: string;
        status: DeskState["mms"][number]["status"];
      }[];
    } | null;
  }>("/v1/desk");
  if (!body.strategy || !body.state) return { strategy: null, state: null };
  return {
    strategy: {
      strategyHash: body.strategy.strategyHash,
      order: null,
      program: body.strategy.program,
      decoded: {
        deadline: bi(body.strategy.decoded.deadline),
        salt: bi(body.strategy.decoded.salt),
        unknown: [],
      },
      shippedAt: { block: bi(body.strategy.shippedAt.block), tx: body.strategy.shippedAt.tx },
      live: body.strategy.live,
      ...(body.strategy.warning ? { warning: body.strategy.warning } : {}),
    },
    state: {
      ...body.state,
      balances: { weth: bi(body.state.balances.weth), usdc: bi(body.state.balances.usdc) },
      safeWallet: { weth: bi(body.state.safeWallet.weth), usdc: bi(body.state.safeWallet.usdc) },
      allowances: { weth: bi(body.state.allowances.weth), usdc: bi(body.state.allowances.usdc) },
      pWad: bi(body.state.pWad),
      wWad: bi(body.state.wWad),
      targetWad: bi(body.state.targetWad),
      rWad: bi(body.state.rWad),
      mms: body.state.mms.map((mm) => ({
        ...mm,
        askWad: bi(mm.askWad),
        bidWad: bi(mm.bidWad),
      })),
    },
  };
}

export async function fetchApiFills(): Promise<FillRecord[]> {
  const rows = await getJson<
    {
      tx: FillRecord["tx"];
      blockNumber: string;
      blockTime: number;
      orderHash: FillRecord["orderHash"];
      nameHash: FillRecord["nameHash"];
      taker: FillRecord["taker"];
      dnsName: string;
      name: string;
      tokenIn: FillRecord["tokenIn"];
      tokenOut: FillRecord["tokenOut"];
      amountIn: string;
      amountOut: string;
      midWad: string;
      spreadBps: number;
      spreadSource: FillRecord["spreadSource"];
      wBeforeWad: string;
    }[]
  >("/v1/fills");
  return rows.map((row) => ({
    ...row,
    blockNumber: bi(row.blockNumber),
    amountIn: bi(row.amountIn),
    amountOut: bi(row.amountOut),
    midWad: bi(row.midWad),
    wBeforeWad: bi(row.wBeforeWad),
  }));
}
