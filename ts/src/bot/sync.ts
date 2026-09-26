import { createPublicClient, http, type Address } from "viem";
import { sepolia } from "viem/chains";
import type { DatabaseSync } from "node:sqlite";

import { readFills } from "../lib/client/fills.js";
import type { DeskCtx } from "../lib/client/ctx.js";
import { dnsDecode } from "../lib/encode.js";
import { filledWeth } from "../lib/events.js";
import { loadDeskConfig } from "./fill.js";
import { rememberFill } from "./store.js";

/** Copy every DeskFill on the configured router into the local index. */
export async function syncFills(
  rpc: string,
  db: DatabaseSync,
): Promise<number> {
  const cfg = loadDeskConfig();
  if (cfg.router === "" || cfg.tokens.weth === "") return 0;
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const ctx: DeskCtx = { client, cfg };
  const fills = await readFills(ctx, undefined, BigInt(cfg.deployBlock));
  let added = 0;
  for (const fill of fills) {
    const before = db
      .prepare("select tx from fills where tx = ?")
      .get(fill.transactionHash.toLowerCase());
    if (before) continue;
    const leg = filledWeth(fill, cfg.tokens.weth as Address);
    rememberFill(db, {
      tx: fill.transactionHash,
      block: fill.blockNumber.toString(),
      name: dnsDecode(fill.dnsName),
      taker: fill.taker,
      side: leg.side,
      sizeWeth: leg.sizeWeth.toString(),
      amountIn: fill.amountIn.toString(),
      amountOut: fill.amountOut.toString(),
      midWad: fill.midWad.toString(),
      sellBps: fill.sSellBps,
      buyBps: fill.sBuyBps,
      wBeforeWad: fill.wBeforeWad.toString(),
    });
    added += 1;
  }
  return added;
}
