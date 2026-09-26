import {
  createPublicClient,
  decodeAbiParameters,
  encodeFunctionData,
  http,
  namehash,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { sepolia } from "viem/chains";

import {
  agentSpreadFits,
  type AgentSpread,
  type AgentTerms,
  type DeskBook,
  type DeskQuote,
} from "./agent.js";
import type { DeskConfig } from "./config.js";
import { dnsEncode } from "./encode.js";

const MAX_AGE = 600n;
const WAD = 10n ** 18n;
const BPS = 10_000n;
const LIVE_SELL = 3;
const LIVE_BUY = 10;
const LIVE_CAP = 50n * 10n ** 18n;

const resolverAbi = [
  {
    type: "function",
    name: "resolve",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "bytes" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes" }],
  },
] as const;

const profileAbi = [
  {
    type: "function",
    name: "multicall",
    stateMutability: "view",
    inputs: [{ name: "data", type: "bytes[]" }],
    outputs: [{ type: "bytes[]" }],
  },
  {
    type: "function",
    name: "addr",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "data",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ type: "bytes" }],
  },
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ type: "string" }],
  },
] as const;

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const oracleAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { type: "uint80" },
      { type: "int256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint80" },
    ],
  },
] as const;

/** `{name}` on GET /v1/desks/{name}. Anything else is refused before a read. */
export function acceptDeskName(argv: readonly string[]): string | null {
  if (argv.includes("--write")) return null;
  const i = argv.indexOf("--name");
  if (i < 0 || argv[i + 1] !== "dao-treasury-a") return null;
  return "dao-treasury-a";
}

export function parseLiveSpread(
  value: Hex | null,
  terms: AgentTerms | null,
  now: bigint,
): AgentSpread | null {
  if (value === null || terms === null) return null;
  if ((value.length - 2) / 2 !== 128) return null;
  const [version, sellBps, buyBps, validUntil] = decodeAbiParameters(
    [
      { type: "uint8" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint64" },
    ],
    value,
  );
  const spread = { sellBps, buyBps, validUntil };
  if (version !== 1 || validUntil <= now) return null;
  if (!agentSpreadFits(spread, terms)) return null;
  return spread;
}

/** Ask and bid on the oracle with no inventory scale. */
export function unscaledQuote(
  pWad: bigint,
  sellBps: number,
  buyBps: number,
): { ask: bigint; bid: bigint } {
  const sell = BigInt(sellBps);
  const buy = BigInt(buyBps);
  return {
    ask: (pWad * (BPS + sell)) / BPS,
    bid: buy >= BPS ? 0n : (pWad * (BPS - buy)) / BPS,
  };
}

export function quoteFromRecords(
  pWad: bigint,
  terms: AgentTerms | null,
  spread: Hex | null,
  now: bigint,
): DeskQuote | null {
  if (terms === null) return null;
  const live = parseLiveSpread(spread, terms, now);
  const sell = live ? live.sellBps : terms.sellBps;
  const buy = live ? live.buyBps : terms.buyBps;
  const priced = unscaledQuote(pWad, sell, buy);
  return {
    ask: priced.ask,
    bid: priced.bid,
    source: live ? "spread" : "terms",
  };
}

export function termsIfAgreed(
  left: AgentTerms | null,
  right: AgentTerms | null,
): AgentTerms | null {
  if (left === null || right === null) return null;
  if (
    left.sellBps !== LIVE_SELL ||
    left.buyBps !== LIVE_BUY ||
    left.cap !== LIVE_CAP
  ) {
    return null;
  }
  if (
    left.sellBps !== right.sellBps ||
    left.buyBps !== right.buyBps ||
    left.cap !== right.cap
  ) {
    return null;
  }
  return left;
}

export function bookToJson(book: DeskBook): Record<string, unknown> {
  return {
    name: book.name,
    oracle: {
      answer: book.oracle.answer.toString(),
      updatedAt: book.oracle.updatedAt.toString(),
      ageBlocks: book.oracle.ageBlocks,
      fresh: book.oracle.fresh,
    },
    inventory: book.inventory,
    terms:
      book.terms === null
        ? null
        : {
            sellBps: book.terms.sellBps,
            buyBps: book.terms.buyBps,
            cap: book.terms.cap.toString(),
          },
    spread:
      book.spread === null
        ? null
        : {
            sellBps: book.spread.sellBps,
            buyBps: book.spread.buyBps,
            validUntil: book.spread.validUntil.toString(),
            live: book.spread.live,
          },
    policy: book.policy,
    quote:
      book.quote === null
        ? null
        : {
            ask: book.quote.ask.toString(),
            bid: book.quote.bid.toString(),
            source: book.quote.source,
          },
    agent: book.agent,
    names: book.names.map((n) => ({
      name: n.name,
      addr: n.addr,
      expiry: n.expiry.toString(),
      live: n.live,
    })),
  };
}

function decodeTerms(value: Hex): AgentTerms | null {
  if ((value.length - 2) / 2 !== 128) return null;
  const [version, sellBps, buyBps, cap] = decodeAbiParameters(
    [
      { type: "uint8" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint128" },
    ],
    value,
  );
  if (version !== 1 || sellBps >= buyBps || buyBps >= 10_000 || cap === 0n) {
    return null;
  }
  return { sellBps, buyBps, cap };
}

async function resolveRecords(
  client: PublicClient,
  resolver: Address,
  fullName: string,
  keys: { data: string[]; text: string[] },
): Promise<{ data: Hex[]; text: string[]; addr: Address }> {
  const node = namehash(fullName);
  const calls = [
    encodeFunctionData({
      abi: profileAbi,
      functionName: "addr",
      args: [node],
    }),
    ...keys.data.map((key) =>
      encodeFunctionData({
        abi: profileAbi,
        functionName: "data",
        args: [node, key],
      }),
    ),
    ...keys.text.map((key) =>
      encodeFunctionData({
        abi: profileAbi,
        functionName: "text",
        args: [node, key],
      }),
    ),
  ];
  const raw = await client.readContract({
    address: resolver,
    abi: resolverAbi,
    functionName: "resolve",
    args: [
      dnsEncode(fullName),
      encodeFunctionData({
        abi: profileAbi,
        functionName: "multicall",
        args: [calls],
      }),
    ],
  });
  const [results] = decodeAbiParameters([{ type: "bytes[]" }], raw);
  const [addr] = decodeAbiParameters(
    [{ type: "address" }],
    results[0] as Hex,
  );
  const data = keys.data.map((_, i) => {
    const [inner] = decodeAbiParameters(
      [{ type: "bytes" }],
      results[i + 1] as Hex,
    );
    return inner;
  });
  const text = keys.text.map((_, i) => {
    const [inner] = decodeAbiParameters(
      [{ type: "string" }],
      results[i + 1 + keys.data.length] as Hex,
    );
    return inner;
  });
  return { data, text, addr };
}

/** Chain read of GET /v1/desks/dao-treasury-a. Does not send a transaction. */
export async function readBook(
  cfg: DeskConfig,
  rpc: string,
): Promise<DeskBook> {
  if (cfg.ens.resolver === "" || cfg.oracle === "" || cfg.safe === "") {
    throw new Error("config is missing an address");
  }
  if (cfg.tokens.weth === "" || cfg.tokens.usdc === "") {
    throw new Error("config is missing a token");
  }
  if (cfg.mms.length < 2 || cfg.mms[0].address === "" || cfg.mms[1].address === "") {
    throw new Error("config is missing both client names");
  }
  const resolver = cfg.ens.resolver;
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const deskName = "dao-treasury-a.eth";
  const [deskRec, mmA, mmB, block, round, wethBal, usdcBal] =
    await Promise.all([
      resolveRecords(client, resolver, deskName, {
        data: ["desk.spread"],
        text: ["desk.policy"],
      }),
      resolveRecords(client, resolver, cfg.mms[0].name, {
        data: ["desk.terms"],
        text: [],
      }),
      resolveRecords(client, resolver, cfg.mms[1].name, {
        data: ["desk.terms"],
        text: [],
      }),
      client.getBlock(),
      client.readContract({
        address: cfg.oracle,
        abi: oracleAbi,
        functionName: "latestRoundData",
      }),
      client.readContract({
        address: cfg.tokens.weth,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [cfg.safe],
      }),
      client.readContract({
        address: cfg.tokens.usdc,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [cfg.safe],
      }),
    ]);
  const now = block.timestamp;
  const answer = round[1];
  const updatedAt = round[3];
  const age =
    updatedAt > now ? 0n : (now - updatedAt) / 12n;
  const fresh = updatedAt <= now && now - updatedAt <= MAX_AGE;
  const pWad =
    answer > 0n ? answer * 10n ** BigInt(18 - cfg.desk.oracleDecimals) : 0n;
  const baseScale = 10n ** BigInt(18 - cfg.desk.baseDecimals);
  const quoteScale = 10n ** BigInt(18 - cfg.desk.quoteDecimals);
  const ethValue = (wethBal * baseScale * pWad) / WAD;
  const usdValue = usdcBal * quoteScale;
  const book = ethValue + usdValue;
  const wWad = book === 0n ? 0n : (ethValue * WAD) / book;
  const terms = termsIfAgreed(decodeTerms(mmA.data[0]), decodeTerms(mmB.data[0]));
  const live = parseLiveSpread(deskRec.data[0], terms, now);
  const quote = quoteFromRecords(pWad, terms, deskRec.data[0], now);
  return {
    name: deskName,
    oracle: {
      answer,
      updatedAt,
      ageBlocks: Number(age),
      fresh,
    },
    inventory: {
      wBps: Number((wWad * BPS) / WAD),
      wStarBps: cfg.desk.wStarBps,
    },
    terms,
    spread: live === null ? null : { ...live, live: true },
    policy: deskRec.text[0] ?? "",
    quote,
    agent: {
      name: "risk.agents.dao-treasury-a.eth",
      addr: "0xcCf3e2aD56Af881C13CCEb19Ab6cEbFbDD739899",
    },
    names: [mmA, mmB].map((rec, i) => {
      const mm = cfg.mms[i];
      const term = decodeTerms(rec.data[0]);
      return {
        name: mm.name,
        addr: rec.addr,
        expiry: 0n,
        live:
          rec.addr.toLowerCase() === mm.address.toLowerCase() &&
          term !== null,
      };
    }),
  };
}
