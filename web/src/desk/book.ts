import type { Address } from "./types";

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
  names: { name: string; addr: Address; expiry: bigint; live: boolean }[];
};

const WAD = 10n ** 18n;

// The fixture book: the worked example in docs/agent-design.md. Mid 4,000; terms sell 3 bp,
// buy 10 bp, cap 50 ETH; a live agent spread of sell 2 bp, buy 8 bp, so the quote asks
// 4,000.8 and bids 3,996.8.
export function fixtureBook(now: number): DeskBook {
  const mid = 4000n * WAD;
  return {
    name: "dao-treasury-a.eth",
    oracle: { answer: 4000n * 10n ** 8n, updatedAt: BigInt(now - 12), ageBlocks: 1, fresh: true },
    inventory: { wBps: 9000, wStarBps: 7000 },
    terms: { sellBps: 3, buyBps: 10, cap: 50n * WAD },
    spread: { sellBps: 2, buyBps: 8, validUntil: BigInt(now + 3600), live: true },
    policy:
      "Keep the book near 70% ETH. Quote tighter when counterparties buy ETH and we hold more than the target; widen toward the terms when the book nears 70%.",
    quote: { ask: (mid * 10002n) / 10000n, bid: (mid * 9992n) / 10000n, source: "spread" },
    agent: { name: "risk.agents.dao-treasury-a.eth", addr: "0xcCf3e2aD56Af881C13CCEb19Ab6cEbFbDD739899" },
    names: [
      { name: "mm-a.clients.dao-treasury-a.eth", addr: "0x36e2658f69b83f97C4c965Cc8B6eE7486bdF9630", expiry: 1792936164n, live: true },
      { name: "mm-b.clients.dao-treasury-a.eth", addr: "0x32737088c3116eF4A4f030991f26E9f958D80D71", expiry: 1792936164n, live: true },
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
