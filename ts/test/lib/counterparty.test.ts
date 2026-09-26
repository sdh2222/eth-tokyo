import { describe, expect, it } from "vitest";

import {
  chooseTier,
  counterpartyState,
  localTier,
  poolAsk,
  poolBid,
  spreadFor,
  type CounterpartyFacts,
} from "../../src/lib/counterparty.js";

const terms = { sellBps: 3, buyBps: 10, cap: 50n * 10n ** 18n };
const until = 1_700_000_000n;

function facts(over: Partial<CounterpartyFacts> = {}): CounterpartyFacts {
  return {
    name: "mm-a.clients.dao-treasury-a.eth",
    live: true,
    expirySeconds: 1000n,
    priorFills: 0,
    side: "buy",
    sizeWeth: 10n ** 18n,
    capWeth: 50n * 10n ** 18n,
    wBps: 9000,
    policy: "posted fence",
    ...over,
  };
}

describe("counterparty tiers", () => {
  it("picks tight, standard, and fence from size and liveness", () => {
    expect(localTier(facts())).toBe("tight");
    expect(localTier(facts({ sizeWeth: 10n * 10n ** 18n }))).toBe("standard");
    expect(localTier(facts({ sizeWeth: 10n * 10n ** 18n + 1n }))).toBe("fence");
    expect(localTier(facts({ live: false, sizeWeth: 1n }))).toBe("fence");
  });

  it("keeps the local tier unless Jev is at least 0.6 confident", () => {
    expect(chooseTier("tight", null)).toBe("tight");
    expect(chooseTier("tight", { tier: "fence", confidence: 0.59 })).toBe(
      "tight",
    );
    expect(chooseTier("tight", { tier: "fence", confidence: 0.6 })).toBe(
      "fence",
    );
  });

  it("refuses a tier outside the Safe widths", () => {
    expect(spreadFor("tight", terms, until)).toEqual({
      sellBps: 1,
      buyBps: 4,
      validUntil: until,
    });
    expect(spreadFor("standard", terms, until).sellBps).toBe(2);
    expect(spreadFor("fence", terms, until).buyBps).toBe(10);
    expect(() =>
      spreadFor("standard", { sellBps: 1, buyBps: 2, cap: 1n }, until),
    ).toThrow(/outside the Safe's widths/);
  });

  it("sends the counterparty facts and not an inventory width", () => {
    const text = counterpartyState(facts());
    expect(text).toContain("sizeWeth 1000000000000000000");
    expect(text).toContain("priorFills 0");
    expect(text).not.toContain("|w");
    expect(text).not.toContain("7000");
  });

  it("prices a 5 bp pool around the mid", () => {
    const mid = 4000n * 10n ** 18n;
    expect(poolAsk(mid)).toBe(4002n * 10n ** 18n);
    expect(poolBid(mid)).toBe(3998n * 10n ** 18n);
  });
});
