import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { dnsNameToString } from "./chain.js";
import { loadConfig } from "./watch.js";
import { fileURLToPath } from "node:url";

const RPC = process.env.DESK_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

function configPath() {
  return process.env.DESK_CONFIG ?? fileURLToPath(new URL("../../config/sepolia.json", import.meta.url));
}

function str(value) {
  return typeof value === "bigint" ? value.toString() : value;
}

export async function liveSnapshot() {
  const cfg = loadConfig(configPath());
  const client = createPublicClient({ chain: sepolia, transport: http(RPC) });
  const { findStrategies } = await import("../../ts/src/lib/client/strategies.ts");
  const { readDeskState } = await import("../../ts/src/lib/client/state.ts");
  const { readFills } = await import("../../ts/src/lib/client/fills.ts");
  const found = await findStrategies({ client, cfg });
  const strategy = found.filter((row) => row.live).at(-1) ?? found.at(-1) ?? null;
  if (!strategy) return { strategy: null, state: null, fills: [] };
  const state = await readDeskState({ client, cfg }, strategy);
  const fills = await readFills({ client, cfg }, strategy);
  const maxStaleness = Number(cfg.desk.maxBlocks ?? 3) * 12;
  return {
    strategy: {
      strategyHash: strategy.strategyHash,
      order: null,
      program: strategy.program,
      decoded: { deadline: str(strategy.decoded.deadline), salt: str(strategy.decoded.salt), unknown: [] },
      shippedAt: { block: str(strategy.shippedAt.block), tx: strategy.shippedAt.tx },
      live: strategy.live,
      warning: strategy.warning ?? null,
    },
    state: {
      live: state.live,
      balances: { weth: str(state.balances.weth), usdc: str(state.balances.usdc) },
      safeWallet: { weth: str(state.safeWallet.weth), usdc: str(state.safeWallet.usdc) },
      allowances: { weth: str(state.allowances.weth), usdc: str(state.allowances.usdc) },
      pWad: str(state.pWad),
      oracleUpdatedAt: Number(state.oracleUpdatedAt),
      oracleStale: state.oracleStale,
      wWad: str(state.wWad),
      targetWad: str(state.targetWad),
      rWad: str(state.rWad),
      deadline: Number(strategy.decoded.deadline),
      maxStaleness,
      mms: state.mms.map((mm) => ({
        name: mm.name,
        address: mm.address,
        expiry: Number(mm.expiry),
        expired: mm.expired,
        resolverOk: mm.resolverOk,
        sPolicy: mm.sPolicy,
        askWad: str(mm.askWad),
        bidWad: str(mm.bidWad),
        status: mm.status,
      })),
    },
    fills: fills.map((row) => ({
      tx: row.transactionHash,
      blockNumber: str(row.blockNumber),
      blockTime: 0,
      orderHash: row.orderHash,
      nameHash: row.nameHash,
      taker: row.taker,
      dnsName: row.dnsName,
      name: dnsNameToString(row.dnsName),
      tokenIn: row.tokenIn,
      tokenOut: row.tokenOut,
      amountIn: str(row.amountIn),
      amountOut: str(row.amountOut),
      midWad: str(row.midWad),
      spreadBps: row.spreadBps,
      spreadSource: row.spreadSource,
      wBeforeWad: str(row.wBeforeWad),
    })),
  };
}
