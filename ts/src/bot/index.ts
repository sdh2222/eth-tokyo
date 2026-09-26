import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

import { formatRefusal } from "./format.js";
import { legRule } from "./commands.js";
import { deskRpc, loadDeskConfig, sendFill, type FillRequest } from "./fill.js";
import { runKeeper } from "./watch.js";
import {
  decodeDeskError,
  findLiveStrategy,
  quoteFor,
  type DeskCtx,
} from "../lib/client/index.js";
import { loadEnv } from "../scripts/_common/env.js";
import { accountForLabel } from "../scripts/_common/wallet.js";

function request(): FillRequest {
  const command = process.argv[2];
  if (command !== "quote" && command !== "fill") {
    throw new Error("bot command is quote, fill, or watch");
  }
  const mmFlag = process.argv.indexOf("--mm");
  const mm = mmFlag >= 0 ? process.argv[mmFlag + 1] : "";
  if (mm !== "mm-a" && mm !== "mm-b") throw new Error("--mm is mm-a or mm-b");
  const sideFlag = process.argv.indexOf("--side");
  const side = sideFlag >= 0 ? process.argv[sideFlag + 1] : "";
  if (side !== "buy" && side !== "sell")
    throw new Error("--side is buy or sell");
  const weth = process.argv.includes("--weth")
    ? process.argv[process.argv.indexOf("--weth") + 1]
    : undefined;
  const usdc = process.argv.includes("--usdc")
    ? process.argv[process.argv.indexOf("--usdc") + 1]
    : undefined;
  const rpcFlag = process.argv.indexOf("--rpc");
  return {
    rpc: deskRpc(rpcFlag >= 0 ? process.argv[rpcFlag + 1] : undefined),
    mm,
    side,
    weth,
    usdc,
  };
}

async function preview(req: FillRequest): Promise<void> {
  const cfg = loadDeskConfig();
  const account = accountForLabel(req.mm);
  const named = cfg.mms.find((mm) => mm.name.startsWith(`${req.mm}.`));
  if (!named || named.address === "")
    throw new Error(`${req.mm} is missing from config`);
  const client = createPublicClient({
    chain: sepolia,
    transport: http(req.rpc),
  });
  const ctx: DeskCtx = { client, cfg };
  const live = await findLiveStrategy(ctx);
  if (!live) throw new Error("no live strategy");
  const leg = legRule({ side: req.side, weth: req.weth, usdc: req.usdc });
  const quote = await quoteFor(ctx, live, {
    mm: { name: named.name, address: account.address },
    side: req.side,
    leg: leg.token,
    amount: leg.amount,
  });
  if (!quote.ok) {
    console.log(formatRefusal(quote.error.title, quote.error.hint));
    process.exit(1);
  }
  console.log(`quote in ${quote.amountIn} out ${quote.amountOut}`);
}

async function main(): Promise<void> {
  loadEnv();
  const command = process.argv[2];
  if (command === "watch") {
    const rpcFlag = process.argv.indexOf("--rpc");
    const rpc = deskRpc(rpcFlag >= 0 ? process.argv[rpcFlag + 1] : undefined);
    await runKeeper(rpc);
  }
  const req = request();
  if (command === "quote") {
    await preview(req);
    return;
  }
  const done = await sendFill(req);
  console.log(
    `fill ${done.hash} in ${done.amountIn} out ${done.amountOut} sell ${done.sellBps} buy ${done.buyBps}`,
  );
}

const isMain = process.argv[1]?.endsWith("index.ts");
if (isMain) {
  main().catch((err: unknown) => {
    const decoded = decodeDeskError(err);
    if (decoded.code !== "UNKNOWN") {
      console.log(formatRefusal(decoded.title, decoded.hint));
    } else {
      console.log(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  });
}
