import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { sepolia } from "viem/chains";

import {
  planAgentWrites,
  type AgentSpread,
  type AgentTerms,
} from "../lib/agent.js";
import { readBook } from "../lib/book.js";
import { readFills, type FillRecord } from "../lib/client/fills.js";
import type { DeskCtx } from "../lib/client/ctx.js";
import type { DeskConfig } from "../lib/config.js";
import {
  chooseTier,
  counterpartyState,
  inventoryStep,
  localTier,
  observeSigns,
  signNote,
  spreadFor,
  suspicionCut,
  suspicionStep,
  type ObservedFill,
  type Tier,
} from "../lib/counterparty.js";
import { dnsDecode } from "../lib/encode.js";
import { filledWeth } from "../lib/events.js";
import { askJev } from "../lib/jev.js";
import { loadEnv } from "../scripts/_common/env.js";
import { accountForLabel } from "../scripts/_common/wallet.js";
import { loadDeskConfig } from "./fill.js";
import {
  fillsForName,
  latestSpreads,
  openDeskDb,
  rememberFill,
  rememberSpread,
  type StoredFill,
} from "./store.js";

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

/** Read the fill that just landed, ask Jev, and write that client's tier onto that client's desk.spread. */
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
  const name = dnsDecode(fill.dnsName);
  if (name === "") throw new Error("fill has no client name");
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const ctx: DeskCtx = { client, cfg };
  const priorFills = (await readFills(ctx)).filter(
    (rowFill) => rowFill.taker.toLowerCase() === fill.taker.toLowerCase(),
  ).length;
  const terms = row?.terms ??
    book.terms ?? { sellBps: 3, buyBps: 10, cap: CAP };
  const db = openDeskDb();
  const history = fillsForName(db, name).filter(
    (rowFill) => rowFill.tx !== fill.transactionHash.toLowerCase(),
  );
  const signs = observeSigns(
    [
      ...history.map(asObserved),
      {
        block: fill.blockNumber,
        side: leg.side,
        sizeWeth: leg.sizeWeth,
        midWad: fill.midWad,
      },
    ],
    oracleMid(book.oracle.answer, cfg),
  );
  const cutBps = suspicionCut(book.policy, signs);
  const note = signNote(signs, cutBps);
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
    markoutBps: signs.markoutBps,
    blocksSincePrior: signs.blocksSincePrior,
    sizeUp: signs.sizeUp,
  };
  const local = localTier(facts);
  const jev = await askJev(
    process.env.JEV_API_KEY ?? "",
    counterpartyState(facts),
  );
  const tier = chooseTier(local, jev);
  const block = await client.getBlock();
  const spread = spreadFor(
    tier,
    terms,
    block.timestamp + WINDOW,
    {
      wBps: book.inventory.wBps,
      wStarBps: book.inventory.wStarBps,
      step: inventoryStep(book.policy),
    },
    cutBps,
  );
  try {
    await publishSpread(rpc, cfg, name, spread, terms, block.timestamp, note);
    rememberFill(db, {
      tx: fill.transactionHash,
      block: fill.blockNumber.toString(),
      name,
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
    rememberSpread(db, {
      name,
      sellBps: spread.sellBps,
      buyBps: spread.buyBps,
      validUntil: spread.validUntil.toString(),
      writtenAt: block.timestamp.toString(),
      fillTx: fill.transactionHash,
      tier,
      note,
    });
    const jevText = jev ? `${jev.tier} ${jev.confidence}` : "none";
    console.log(
      `DeskFill ${fill.transactionHash} ${name} ${leg.side} ${leg.sizeWeth} tier ${tier} local ${local} jev ${jevText} sell ${spread.sellBps} buy ${spread.buyBps} ${note}`,
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
  } finally {
    db.close();
  }
}

/** After a fill, rewrite that name's widths once the policy's signs show up. */
export async function reviewSigns(rpc: string): Promise<void> {
  const cfg = loadDeskConfig();
  if (cfg.ens.resolver === "") return;
  const book = await readBook(cfg, rpc);
  if (!suspicionStep(book.policy)) return;
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const block = await client.getBlock();
  const nowMid = oracleMid(book.oracle.answer, cfg);
  const db = openDeskDb();
  try {
    const stored = latestSpreads(db);
    for (const name of book.names) {
      const fills = fillsForName(db, name.name);
      if (fills.length === 0 || !name.terms || !name.spread) continue;
      if (name.spread.validUntil <= block.timestamp) continue;
      const signs = observeSigns(fills.map(asObserved), nowMid);
      const cutBps = suspicionCut(book.policy, signs);
      if (cutBps === 0) continue;
      const row = stored.find((item) => item.name === name.name);
      const tier =
        knownTier(row?.tier) ??
        localTier({
          live: name.live,
          sizeWeth: BigInt(fills[fills.length - 1]?.sizeWeth ?? "0"),
        });
      const spread = spreadFor(
        tier,
        name.terms,
        name.spread.validUntil,
        {
          wBps: book.inventory.wBps,
          wStarBps: book.inventory.wStarBps,
          step: inventoryStep(book.policy),
        },
        cutBps,
      );
      if (
        spread.sellBps === name.spread.sellBps &&
        spread.buyBps === name.spread.buyBps
      ) {
        continue;
      }
      const note = signNote(signs, cutBps);
      await publishSpread(
        rpc,
        cfg,
        name.name,
        spread,
        name.terms,
        block.timestamp,
        note,
      );
      rememberSpread(db, {
        name: name.name,
        sellBps: spread.sellBps,
        buyBps: spread.buyBps,
        validUntil: spread.validUntil.toString(),
        writtenAt: block.timestamp.toString(),
        fillTx: fills[fills.length - 1]?.tx ?? "",
        tier,
        note,
      });
      console.log(
        `signs ${name.name} sell ${spread.sellBps} buy ${spread.buyBps} ${note}`,
      );
    }
  } finally {
    db.close();
  }
}

function asObserved(fill: StoredFill): ObservedFill {
  return {
    block: BigInt(fill.block),
    side: fill.side,
    sizeWeth: BigInt(fill.sizeWeth),
    midWad: BigInt(fill.midWad),
  };
}

function oracleMid(answer: bigint, cfg: DeskConfig): bigint {
  if (answer <= 0n) return 0n;
  return answer * 10n ** BigInt(18 - cfg.desk.oracleDecimals);
}

function knownTier(value: string | undefined): Tier | null {
  if (value === "tight" || value === "standard" || value === "fence")
    return value;
  return null;
}

async function publishSpread(
  rpc: string,
  cfg: DeskConfig,
  name: string,
  spread: AgentSpread,
  terms: AgentTerms,
  writtenAt: bigint,
  note: string,
): Promise<void> {
  const writes = planAgentWrites({
    resolver: cfg.ens.resolver,
    name,
    spread,
    terms,
    writtenAt,
    note,
  });
  const agent = accountForLabel("risk-agent");
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
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
}
