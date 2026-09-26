import { describe, expect, it } from "vitest";

import {
  chooseTier,
  counterpartyState,
  inventoryStep,
  localTier,
  observeSigns,
  poolAsk,
  poolBid,
  spreadFor,
  suspicionCut,
  suspicionStep,
  type CounterpartyFacts,
} from "../../src/lib/counterparty.js";

const POLICY =
  "ETH 비중이 70%보다 높으면 에이전트는 고른 매도 폭에서 1 bp를 빼고 매수 폭에 1 bp를 더한다. 70%보다 낮으면 매도 폭에 1 bp를 더하고 매수 폭에서 1 bp를 뺀다.";
const SUSPICION =
  "체결 뒤에 오라클이 그 이름에 유리하게 1 bp 이상 움직이거나, 같은 이름이 50블록 안에 다시 오거나, 이번 크기가 직전보다 크면 의심해서 고른 폭을 1 bp 깎는다.";

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
    markoutBps: 0,
    blocksSincePrior: null,
    sizeUp: false,
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

  it("shifts widths only when desk.policy states the inventory rule", () => {
    const step = inventoryStep(POLICY);
    expect(step).toEqual({
      above: { sell: 1, buy: 1 },
      below: { sell: 1, buy: 1 },
    });
    expect(inventoryStep("오라클은 움직이지 않는다.")).toBeNull();
    expect(
      spreadFor("tight", terms, until, {
        wBps: 7186,
        wStarBps: 7000,
        step,
      }),
    ).toEqual({ sellBps: 1, buyBps: 5, validUntil: until });
    expect(
      spreadFor("fence", terms, until, {
        wBps: 7186,
        wStarBps: 7000,
        step,
      }),
    ).toEqual({ sellBps: 2, buyBps: 10, validUntil: until });
    expect(
      spreadFor("fence", terms, until, {
        wBps: 6500,
        wStarBps: 7000,
        step,
      }),
    ).toEqual({ sellBps: 3, buyBps: 9, validUntil: until });
    expect(
      spreadFor("fence", terms, until, {
        wBps: 7186,
        wStarBps: 7000,
        step: null,
      }).sellBps,
    ).toBe(3);
  });

  it("refuses a tier outside the Safe widths", () => {
    expect(spreadFor("tight", terms, until)).toEqual({
      sellBps: 1,
      buyBps: 4,
      validUntil: until,
    });
    expect(spreadFor("standard", terms, until).sellBps).toBe(2);
    expect(spreadFor("fence", terms, until).buyBps).toBe(10);
    expect(
      spreadFor("standard", { sellBps: 1, buyBps: 2, cap: 1n }, until),
    ).toEqual({ sellBps: 1, buyBps: 2, validUntil: until });
    expect(() =>
      spreadFor("standard", { sellBps: 1, buyBps: 1, cap: 1n }, until),
    ).toThrow(/outside the Safe's widths/);
  });

  it("sends the counterparty facts and not an inventory width", () => {
    const text = counterpartyState(facts());
    expect(text).toContain("sizeWeth 1000000000000000000");
    expect(text).toContain("priorFills 0");
    expect(text).toContain("markoutBps 0");
    expect(text).toContain("sizeUp false");
    expect(text).not.toContain("|w");
    expect(text).not.toContain("7000");
  });

  it("cuts both widths when a post-fill sign matches the policy", () => {
    const mid = 3985n * 10n ** 18n;
    const quiet = observeSigns(
      [{ block: 10n, side: "buy", sizeWeth: 10n ** 18n, midWad: mid }],
      mid,
    );
    expect(quiet).toEqual({
      markoutBps: 0,
      blocksSincePrior: null,
      sizeUp: false,
    });
    expect(suspicionCut(SUSPICION, quiet)).toBe(0);
    const marked = observeSigns(
      [{ block: 10n, side: "buy", sizeWeth: 10n ** 18n, midWad: mid }],
      mid + mid / 10_000n,
    );
    expect(marked.markoutBps).toBeGreaterThanOrEqual(1);
    expect(suspicionStep(SUSPICION)).toEqual({
      markoutBps: 1,
      withinBlocks: 50,
      cutBps: 1,
    });
    expect(suspicionStep("오라클은 움직이지 않는다.")).toBeNull();
    const step = inventoryStep(POLICY);
    expect(
      spreadFor(
        "tight",
        terms,
        until,
        { wBps: 7186, wStarBps: 7000, step },
        suspicionCut(SUSPICION, marked),
      ),
    ).toEqual({ sellBps: 2, buyBps: 6, validUntil: until });
    const repeat = observeSigns(
      [
        { block: 10n, side: "buy", sizeWeth: 10n ** 18n, midWad: mid },
        { block: 40n, side: "buy", sizeWeth: 2n * 10n ** 18n, midWad: mid },
      ],
      mid,
    );
    expect(repeat.blocksSincePrior).toBe(30);
    expect(repeat.sizeUp).toBe(true);
    expect(suspicionCut(SUSPICION, repeat)).toBe(1);
    expect(
      spreadFor("fence", terms, until, { wBps: 7186, wStarBps: 7000, step }, 1),
    ).toEqual({ sellBps: 3, buyBps: 10, validUntil: until });
  });

  it("prices a 5 bp pool around the mid", () => {
    const mid = 4000n * 10n ** 18n;
    expect(poolAsk(mid)).toBe(4002n * 10n ** 18n);
    expect(poolBid(mid)).toBe(3998n * 10n ** 18n);
  });
});
