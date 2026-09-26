import { agentSpreadFits, type AgentSpread, type AgentTerms } from "./agent.js";

/** One desk.spread per counterparty. The tier is chosen from the fill that just landed. */
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
  markoutBps: number;
  blocksSincePrior: number | null;
  sizeUp: boolean;
};

export type JevTier = { tier: Tier; confidence: number };

const ONE = 10n ** 18n;
const TEN = 10n * ONE;

/** Live and at most 1 ETH is tight. Live and at most 10 ETH is standard. Otherwise the posted fence. */
export function localTier(
  facts: Pick<CounterpartyFacts, "live" | "sizeWeth">,
): Tier {
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

export type WidthStep = { sell: number; buy: number };

export type InventoryStep = { above: WidthStep; below: WidthStep };

/** The two sentences in `desk.policy` that tell the agent how inventory moves widths. */
export function inventoryStep(policy: string): InventoryStep | null {
  const above =
    /70%보다 높으면[\s\S]*?매도 폭에서 (\d+) bp를 빼고[\s\S]*?매수 폭에 (\d+) bp를 더한다/.exec(
      policy,
    );
  const below =
    /70%보다 낮으면[\s\S]*?매도 폭에 (\d+) bp를 더하고[\s\S]*?매수 폭에서 (\d+) bp를 뺀다/.exec(
      policy,
    );
  if (!above?.[1] || !above[2] || !below?.[1] || !below[2]) return null;
  return {
    above: { sell: Number(above[1]), buy: Number(above[2]) },
    below: { sell: Number(below[1]), buy: Number(below[2]) },
  };
}

/**
 * Width shift from `desk.policy`. A policy without those sentences leaves the tier widths.
 * The oracle mid is not an input.
 */
export function applyInventoryPolicy(
  widths: { sellBps: number; buyBps: number },
  wBps: number,
  wStarBps: number,
  terms: AgentTerms,
  step: InventoryStep | null,
): { sellBps: number; buyBps: number } {
  let sell = widths.sellBps;
  let buy = widths.buyBps;
  if (step && wBps > wStarBps) {
    sell = Math.max(1, sell - step.above.sell);
    buy = Math.min(terms.buyBps, buy + step.above.buy);
  } else if (step && wBps < wStarBps) {
    sell = Math.min(terms.sellBps, sell + step.below.sell);
    buy = Math.max(1, buy - step.below.buy);
  }
  if (buy > terms.buyBps) buy = terms.buyBps;
  if (sell > terms.sellBps) sell = terms.sellBps;
  if (sell < 1) sell = 1;
  if (sell >= buy) buy = Math.min(terms.buyBps, sell + 1);
  return { sellBps: sell, buyBps: buy };
}

export type ObservedFill = {
  block: bigint;
  side: "buy" | "sell";
  sizeWeth: bigint;
  midWad: bigint;
};

export type FillSigns = {
  markoutBps: number;
  blocksSincePrior: number | null;
  sizeUp: boolean;
};

export type SuspicionRule = {
  markoutBps: number;
  withinBlocks: number;
  cutBps: number;
};

/**
 * Signs on the newest fill. Markout is how far the oracle has moved in that
 * taker's favor since the fill. The first fill has no repeat and no size step.
 */
export function observeSigns(
  fills: ObservedFill[],
  nowMidWad: bigint,
): FillSigns {
  const latest = fills[fills.length - 1];
  const prior = fills.length >= 2 ? fills[fills.length - 2] : undefined;
  let markoutBps = 0;
  if (latest && latest.midWad > 0n) {
    const delta =
      latest.side === "buy"
        ? nowMidWad - latest.midWad
        : latest.midWad - nowMidWad;
    if (delta > 0n) markoutBps = Number((delta * 10_000n) / latest.midWad);
  }
  return {
    markoutBps,
    blocksSincePrior:
      latest && prior ? Number(latest.block - prior.block) : null,
    sizeUp: Boolean(latest && prior && latest.sizeWeth > prior.sizeWeth),
  };
}

/** The suspicion sentence in `desk.policy`. Absent means the tier widths stay. */
export function suspicionStep(policy: string): SuspicionRule | null {
  const matched =
    /체결 뒤에[\s\S]*?오라클이 그 이름에 유리하게 (\d+) bp 이상 움직이거나[\s\S]*?같은 이름이 (\d+)블록 안에 다시 오거나[\s\S]*?이번 크기가 직전보다 크면 의심해서 고른 폭을 (\d+) bp 깎는다/.exec(
      policy,
    );
  if (!matched?.[1] || !matched[2] || !matched[3]) return null;
  return {
    markoutBps: Number(matched[1]),
    withinBlocks: Number(matched[2]),
    cutBps: Number(matched[3]),
  };
}

/** Basis points to add when the policy's suspicion sentence matches. Otherwise 0. */
export function suspicionCut(policy: string, signs: FillSigns): number {
  const rule = suspicionStep(policy);
  if (!rule || !signsSuspicious(signs, rule)) return 0;
  return rule.cutBps;
}

/** True when any sign in the policy sentence has already shown up. */
export function signsSuspicious(
  signs: FillSigns,
  rule: SuspicionRule,
): boolean {
  if (signs.markoutBps >= rule.markoutBps) return true;
  if (
    signs.blocksSincePrior !== null &&
    signs.blocksSincePrior <= rule.withinBlocks
  ) {
    return true;
  }
  return signs.sizeUp;
}

/** Add `cutBps` to both widths. The result stays inside that name's terms. */
export function applySuspicionCut(
  widths: { sellBps: number; buyBps: number },
  terms: AgentTerms,
  cutBps: number,
): { sellBps: number; buyBps: number } {
  if (cutBps <= 0) return widths;
  const sell = Math.min(terms.sellBps, Math.max(1, widths.sellBps + cutBps));
  let buy = Math.min(terms.buyBps, widths.buyBps + cutBps);
  if (sell >= buy) buy = Math.min(terms.buyBps, sell + 1);
  return { sellBps: sell, buyBps: buy };
}

export function signNote(signs: FillSigns, cutBps: number): string {
  const repeat =
    signs.blocksSincePrior === null ? "none" : String(signs.blocksSincePrior);
  return `markout ${signs.markoutBps}bp repeat ${repeat} sizeUp ${signs.sizeUp} cut ${cutBps}`;
}

/** Widths for `tier`, then inventory, then a suspicion cut, refused outside the Safe's terms. */
export function spreadFor(
  tier: Tier,
  terms: AgentTerms,
  validUntil: bigint,
  inventory: { wBps: number; wStarBps: number; step: InventoryStep | null } = {
    wBps: 7000,
    wStarBps: 7000,
    step: null,
  },
  cutBps = 0,
): AgentSpread {
  const widths = applySuspicionCut(
    applyInventoryPolicy(
      widthsFor(tier),
      inventory.wBps,
      inventory.wStarBps,
      terms,
      inventory.step,
    ),
    terms,
    cutBps,
  );
  const spread = { ...widths, validUntil };
  if (!agentSpreadFits(spread, terms)) {
    throw new Error("agent spread is outside the Safe's widths");
  }
  return spread;
}

/** Text sent to Jev. It carries no key. The agent applies inventory to the widths after the tier. */
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
    `markoutBps ${facts.markoutBps}`,
    `blocksSincePrior ${facts.blocksSincePrior ?? "none"}`,
    `sizeUp ${facts.sizeUp}`,
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
