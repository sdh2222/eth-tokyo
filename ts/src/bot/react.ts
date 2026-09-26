import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { sepolia } from "viem/chains";

import { planAgentWrites } from "../lib/agent.js";
import { readBook } from "../lib/book.js";
import { readFills, type FillRecord } from "../lib/client/fills.js";
import type { DeskCtx } from "../lib/client/ctx.js";
import {
  chooseTier,
  counterpartyState,
  localTier,
  spreadFor,
  type Tier,
} from "../lib/counterparty.js";
import { dnsDecode } from "../lib/encode.js";
import { filledWeth } from "../lib/events.js";
import { askJev } from "../lib/jev.js";
import { loadEnv } from "../scripts/_common/env.js";
import { accountForLabel } from "../scripts/_common/wallet.js";
import { loadDeskConfig } from "./fill.js";

const CAP = 50n * 10n ** 18n;
const WINDOW = 600n;

export type RecordedFill = {
  hash: Hex;
  name: string;
  side: "buy" | "sell";
  sizeWeth: bigint;
  tier: Tier;
  sellBps: number;
  buyBps: number;
};

/** Read the fill that just landed, ask Jev, and write that client's tier onto desk.spread. */
export async function recordFill(
  rpc: string,
  fill: FillRecord,
): Promise<RecordedFill> {
  loadEnv();
  const cfg = loadDeskConfig();
  if (cfg.tokens.weth === "" || cfg.ens.resolver === "") {
    throw new Error("config is missing an address");
  }
  const book = await readBook(cfg, rpc);
  const leg = filledWeth(fill, cfg.tokens.weth);
  const row = book.names.find(
    (name) => name.addr.toLowerCase() === fill.taker.toLowerCase(),
  );
  const name = row?.name ?? dnsDecode(fill.dnsName);
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const ctx: DeskCtx = { client, cfg };
  const priorFills = (await readFills(ctx)).filter(
    (rowFill) => rowFill.taker.toLowerCase() === fill.taker.toLowerCase(),
  ).length;
  const terms = book.terms ?? { sellBps: 3, buyBps: 10, cap: CAP };
  const facts = {
    name,
    live: row?.live ?? false,
    expirySeconds: row?.expiry ?? 0n,
    priorFills,
    side: leg.side,
    sizeWeth: leg.sizeWeth,
    capWeth: terms.cap,
    wBps: book.inventory.wBps,
    policy: book.policy,
  };
  const local = localTier(facts);
  const jev = await askJev(
    process.env.JEV_API_KEY ?? "",
    counterpartyState(facts),
  );
  const tier = chooseTier(local, jev);
  const block = await client.getBlock();
  const spread = spreadFor(tier, terms, block.timestamp + WINDOW);
  const writes = planAgentWrites({
    resolver: cfg.ens.resolver,
    name: "dao-treasury-a.eth",
    spread,
    terms,
    writtenAt: block.timestamp,
  });
  const agent = accountForLabel("risk-agent");
  const wallet = createWalletClient({
    account: agent,
    chain: sepolia,
    transport: http(rpc),
  });
  for (const write of [writes.spread, writes.stats]) {
    const hash = await wallet.sendTransaction({
      to: write.to,
      data: write.data,
      gas: 400_000n,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error(`${write.label} failed: ${hash}`);
  }
  const jevText = jev ? `${jev.tier} ${jev.confidence}` : "none";
  console.log(
    `DeskFill ${fill.transactionHash} ${name} ${leg.side} ${leg.sizeWeth} tier ${tier} local ${local} jev ${jevText} sell ${spread.sellBps} buy ${spread.buyBps}`,
  );
  return {
    hash: fill.transactionHash,
    name,
    side: leg.side,
    sizeWeth: leg.sizeWeth,
    tier,
    sellBps: spread.sellBps,
    buyBps: spread.buyBps,
  };
}
