import type { Address } from "./types";
import { POLICY_TEMPLATE } from "./policy";

// The desk book from docs/agent-design.md ("Book"), as ts/src/lib/agent.ts types it.
// Widths are basis points; `wBps` is the ETH share of the Safe book.
export type DeskBook = {
  name: string;
  oracle: { answer: bigint; updatedAt: bigint; ageBlocks: number; fresh: boolean };
  inventory: { wBps: number; wStarBps: number };
  terms: { sellBps: number; buyBps: number; cap: bigint } | null;
  spread: { sellBps: number; buyBps: number; validUntil: bigint; live: boolean } | null;
  policy: string;
  quote: { ask: bigint; bid: bigint; source: "router" | "spread" | "terms" } | null;
  agent: { name: string; addr: Address };
  names: {
    name: string;
    addr: Address;
    expiry: bigint;
    live: boolean;
    // Each client name carries its own terms and its own agent spread (main, PR #34): the
    // router prices a fill from the taker's own desk.spread, else from its terms.
    terms: { sellBps: number; buyBps: number; cap: bigint } | null;
    spread: { sellBps: number; buyBps: number; validUntil: bigint; live: boolean } | null;
  }[];
};

// The agent's last write on one client name: desk.stats on ENS, or the keeper's index
// (GET /v1/agent indexedSpreads). The note carries the signs, e.g. "markout 2bp repeat 12
// sizeUp true cut 1".
export type AgentWrite = {
  name: string;
  sellBps: number;
  buyBps: number;
  validUntil: number;
  writtenAt: number;
  fillTx?: string;
  tier?: string;
  note?: string;
};

export type NameQuote = { sellBps: number; buyBps: number; ask: bigint; bid: bigint; source: "agent" | "terms" };

// The price one name gets: its own live spread, else its terms (DeskPrice.sol on desk.7).
export function nameQuote(book: DeskBook, name: DeskBook["names"][number]): NameQuote | null {
  const mid = book.oracle.answer * 10n ** 10n;
  const widths = name.spread?.live ? name.spread : name.terms;
  if (!widths) return null;
  return {
    sellBps: widths.sellBps,
    buyBps: widths.buyBps,
    ask: (mid * BigInt(10000 + widths.sellBps)) / 10000n,
    bid: (mid * BigInt(10000 - widths.buyBps)) / 10000n,
    source: name.spread?.live ? "agent" : "terms",
  };
}

// The short label of a name ("mm-a" from "mm-a.clients.dao-treasury-a.eth").
export function shortName(name: string): string {
  return name.split(".")[0] ?? name;
}

const WAD = 10n ** 18n;

// The fixture book on main's model (PR #34): mid 4,000; terms sell 3 bp, buy 10 bp, cap
// 50 ETH on both names; the desk quote is the terms quote (4,001.2 / 3,996.0); each name has
// its own agent spread: mm-a 1 / 9 bp, mm-b 2 / 8 bp.
export function fixtureBook(now: number): DeskBook {
  const mid = 4000n * WAD;
  return {
    name: "dao-treasury-a.eth",
    oracle: { answer: 4000n * 10n ** 8n, updatedAt: BigInt(now - 12), ageBlocks: 1, fresh: true },
    inventory: { wBps: 9000, wStarBps: 7000 },
    terms: { sellBps: 3, buyBps: 10, cap: 50n * WAD },
    spread: null,
    policy: POLICY_TEMPLATE,
    quote: { ask: (mid * 10003n) / 10000n, bid: (mid * 9990n) / 10000n, source: "terms" },
    agent: { name: "risk.agents.dao-treasury-a.eth", addr: "0xcCf3e2aD56Af881C13CCEb19Ab6cEbFbDD739899" },
    names: [
      {
        name: "mm-a.clients.dao-treasury-a.eth",
        addr: "0x36e2658f69b83f97C4c965Cc8B6eE7486bdF9630",
        expiry: 1792936164n,
        live: true,
        terms: { sellBps: 3, buyBps: 10, cap: 50n * WAD },
        spread: { sellBps: 1, buyBps: 9, validUntil: BigInt(now + 540), live: true },
      },
      {
        name: "mm-b.clients.dao-treasury-a.eth",
        addr: "0x32737088c3116eF4A4f030991f26E9f958D80D71",
        expiry: 1792936164n,
        live: true,
        terms: { sellBps: 3, buyBps: 10, cap: 50n * WAD },
        spread: { sellBps: 2, buyBps: 8, validUntil: BigInt(now + 420), live: true },
      },
    ],
  };
}

// A wad (18-decimal) price as a USD string with two decimals, e.g. 4000.8 -> "4,000.80".
export function formatWadUsd(wad: bigint): string {
  const cents = (wad * 100n) / WAD;
  const whole = cents / 100n;
  const frac = String(cents % 100n).padStart(2, "0");
  return `${whole.toLocaleString("en-US")}.${frac}`;
}

// Basis points as a percentage string, e.g. 7000 -> "70.0%".
export function formatBpsShare(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

export function formatEth(wei: bigint): string {
  return `${(Number(wei / 10n ** 14n) / 10_000).toLocaleString("en-US")} ETH`;
}

// The agent's last writes in the fixture, one per name, as the keeper records them.
export function fixtureWrites(now: number): AgentWrite[] {
  return [
    {
      name: "mm-a.clients.dao-treasury-a.eth",
      sellBps: 1,
      buyBps: 9,
      validUntil: now + 540,
      writtenAt: now - 60,
      tier: "standard",
      note: "markout 0bp repeat none sizeUp false cut 0",
    },
    {
      name: "mm-b.clients.dao-treasury-a.eth",
      sellBps: 2,
      buyBps: 8,
      validUntil: now + 420,
      writtenAt: now - 180,
      tier: "tight",
      note: "markout 2bp repeat 12 sizeUp true cut 1",
    },
  ];
}
