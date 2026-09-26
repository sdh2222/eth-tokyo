import {
  encodeAbiParameters,
  encodeFunctionData,
  type Address,
  type Hex,
} from "viem";

import { dnsEncode } from "./encode.js";

/** One agent per Safe. An Aqua order ships and docks without a new grant. */
export const AGENT_SCOPE = "safe" as const;

export type AgentSpread = {
  sellBps: number;
  buyBps: number;
  validUntil: bigint;
};

export type AgentTerms = { sellBps: number; buyBps: number; cap: bigint };

export type AgentStats = AgentSpread & { writtenAt: bigint };

export type QuoteSource = "router" | "spread" | "terms";

export type DeskQuote = {
  ask: bigint;
  bid: bigint;
  source: QuoteSource;
};

/** What GET /v1/desks/{name} returns. Widths are basis points. `wBps` is the ETH share. */
export type DeskBook = {
  name: string;
  oracle: {
    answer: bigint;
    updatedAt: bigint;
    ageBlocks: number;
    fresh: boolean;
  };
  inventory: { wBps: number; wStarBps: number };
  terms: AgentTerms | null;
  spread: (AgentSpread & { live: boolean }) | null;
  policy: string;
  quote: DeskQuote | null;
  agent: { name: string; addr: Address };
  names: { name: string; addr: Address; expiry: bigint; live: boolean }[];
};

export type AgentWrite = {
  to: Address;
  data: Hex;
  value: 0n;
  label: string;
};

const resolverAbi = [
  {
    type: "function",
    name: "setData",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "bytes" },
      { name: "key", type: "string" },
      { name: "value", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setText",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "bytes" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
  },
] as const;

/** abi.encode(uint8 version, uint16 sellBps, uint16 buyBps, uint64 validUntil). 128 bytes. */
export function encodeAgentSpread(s: AgentSpread): Hex {
  return encodeAbiParameters(
    [
      { type: "uint8" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint64" },
    ],
    [1, s.sellBps, s.buyBps, s.validUntil],
  );
}

/** Text for desk.stats. The screen reads this. The router does not. */
export function encodeAgentStats(s: AgentStats): string {
  return JSON.stringify({
    version: 1,
    sellBps: s.sellBps,
    buyBps: s.buyBps,
    validUntil: Number(s.validUntil),
    writtenAt: Number(s.writtenAt),
  });
}

/** The live widths stay inside the Safe's widths, and the sell stays tighter than the buy. */
export function agentSpreadFits(live: AgentSpread, terms: AgentTerms): boolean {
  return (
    live.sellBps > 0 &&
    live.buyBps > live.sellBps &&
    live.buyBps < 10_000 &&
    live.sellBps <= terms.sellBps &&
    live.buyBps <= terms.buyBps
  );
}

/**
 * Unsigned resolver writes. The Safe's agent signs both. This function does not send them.
 * `name` is the desk name the records sit on.
 */
export function planAgentWrites(a: {
  resolver: Address;
  name: string;
  spread: AgentSpread;
  terms: AgentTerms;
  writtenAt: bigint;
}): { spread: AgentWrite; stats: AgentWrite } {
  if (!agentSpreadFits(a.spread, a.terms)) {
    throw new Error("agent spread is outside the Safe's widths");
  }
  if (a.spread.validUntil <= a.writtenAt) {
    throw new Error("agent spread is already expired");
  }
  const dns = dnsEncode(a.name);
  const stats = encodeAgentStats({ ...a.spread, writtenAt: a.writtenAt });
  return {
    spread: {
      to: a.resolver,
      value: 0n,
      label: "agent writes desk.spread",
      data: encodeFunctionData({
        abi: resolverAbi,
        functionName: "setData",
        args: [dns, "desk.spread", encodeAgentSpread(a.spread)],
      }),
    },
    stats: {
      to: a.resolver,
      value: 0n,
      label: "agent writes desk.stats",
      data: encodeFunctionData({
        abi: resolverAbi,
        functionName: "setText",
        args: [dns, "desk.stats", stats],
      }),
    },
  };
}

export { acceptDeskName, quoteFromRecords, readBook } from "./book.js";
