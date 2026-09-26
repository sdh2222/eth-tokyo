import { inventoryStep, localTier, signNote, spreadFor, suspicionCut, type FillSigns, type Tier } from "@desk/counterparty";
import { POLICY_TEMPLATE } from "../policy";

// The fixture's agent writes, derived with the keeper's own rules (ts/src/lib/counterparty.ts)
// from each name's last fill, not typed in by hand. Book: 90% ETH against a 70% target, terms
// sell 3 bp / buy 10 bp / cap 50 ETH on both names, main's policy template.
//   mm-a sold 2 ETH, first fill, no warning signs -> mid-size 2/8, inventory step -> 1/9.
//   mm-b bought 1.5 ETH, 12 blocks after its last fill, larger, the oracle 2 bp its way ->
//   mid-size 2/8, inventory step -> 1/9, suspicion cut 1 bp -> 2/10 (the edge of its terms).

const WAD = 10n ** 18n;
export const FIXTURE_TERMS = { sellBps: 3, buyBps: 10, cap: 50n * WAD };
export const FIXTURE_INVENTORY = { wBps: 9000, wStarBps: 7000 };

type LastFill = { side: "buy" | "sell"; sizeWeth: bigint; signs: FillSigns };

export const LAST_FILL: Record<"mm-a" | "mm-b", LastFill> = {
  "mm-a": { side: "sell", sizeWeth: 2n * WAD, signs: { markoutBps: 0, blocksSincePrior: null, sizeUp: false } },
  "mm-b": { side: "buy", sizeWeth: (3n * WAD) / 2n, signs: { markoutBps: 2, blocksSincePrior: 12, sizeUp: true } },
};

export type FixtureAgentWrite = { tier: Tier; sellBps: number; buyBps: number; note: string };

export function fixtureAgentWrite(label: "mm-a" | "mm-b"): FixtureAgentWrite {
  const fill = LAST_FILL[label];
  const tier = localTier({ live: true, sizeWeth: fill.sizeWeth });
  const cut = suspicionCut(POLICY_TEMPLATE, fill.signs);
  const spread = spreadFor(tier, FIXTURE_TERMS, 0n, { ...FIXTURE_INVENTORY, step: inventoryStep(POLICY_TEMPLATE) }, cut);
  return { tier, sellBps: spread.sellBps, buyBps: spread.buyBps, note: signNote(fill.signs, cut) };
}
