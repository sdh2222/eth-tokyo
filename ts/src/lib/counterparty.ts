import { agentSpreadFits, type AgentSpread, type AgentTerms } from "./agent.js";

/** One desk.spread at a time. The tier is chosen for the counterparty about to trade. */
export type Tier = "tight" | "standard" | "fence";

export type CounterpartyFacts = {
  name: string;
  live: boolean;
  expirySeconds: bigint;
  priorFills: number;
  side: "buy" | "sell";
  sizeWeth: bigint;
  capWeth: bigint;
  wBps: number;
  policy: string;
};

export type JevTier = { tier: Tier; confidence: number };

const ONE = 10n ** 18n;
const TEN = 10n * ONE;

/** Live and at most 1 ETH is tight. Live and at most 10 ETH is standard. Otherwise the posted fence. */
export function localTier(facts: Pick<CounterpartyFacts, "live" | "sizeWeth">): Tier {
  if (!facts.live) return "fence";
  if (facts.sizeWeth <= ONE) return "tight";
  if (facts.sizeWeth <= TEN) return "standard";
  return "fence";
}

export function widthsFor(tier: Tier): { sellBps: number; buyBps: number } {
  switch (tier) {
    case "tight":
      return { sellBps: 1, buyBps: 4 };
    case "standard":
      return { sellBps: 2, buyBps: 8 };
    case "fence":
      return { sellBps: 3, buyBps: 10 };
    default: {
      const neverTier: never = tier;
      return neverTier;
    }
  }
}

/** Jev wins only at confidence 0.6 or higher. A missing answer keeps the local tier. */
export function chooseTier(local: Tier, jev: JevTier | null): Tier {
  if (!jev || jev.confidence < 0.6) return local;
  return jev.tier;
}

/** Widths for `tier`, refused when they sit outside the Safe's terms. */
export function spreadFor(
  tier: Tier,
  terms: AgentTerms,
  validUntil: bigint,
): AgentSpread {
  const widths = widthsFor(tier);
  const spread = { ...widths, validUntil };
  if (!agentSpreadFits(spread, terms)) {
    throw new Error("agent spread is outside the Safe's widths");
  }
  return spread;
}

/** Text sent to Jev. It carries no key and no width formula based on inventory. */
export function counterpartyState(facts: CounterpartyFacts): string {
  return [
    `name ${facts.name}`,
    `live ${facts.live}`,
    `expirySeconds ${facts.expirySeconds}`,
    `priorFills ${facts.priorFills}`,
    `side ${facts.side}`,
    `sizeWeth ${facts.sizeWeth}`,
    `capWeth ${facts.capWeth}`,
    `wBps ${facts.wBps}`,
    `policy ${facts.policy}`,
  ].join("\n");
}

/** A 5 bp pool fee on the same mid. These mock tokens have no Uniswap pool. */
export function poolAsk(midWad: bigint): bigint {
  return (midWad * 10_005n) / 10_000n;
}

export function poolBid(midWad: bigint): bigint {
  return (midWad * 9_995n) / 10_000n;
}
