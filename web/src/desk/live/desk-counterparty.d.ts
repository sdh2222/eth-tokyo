// Types for the keeper's rules in ts/src/lib/counterparty.ts (main, PR #34), aliased as
// @desk/counterparty in vite.config.ts. The web reads desk.policy and derives the fixture's
// agent writes with this same code, so neither is a second copy of the rules.
declare module "@desk/counterparty" {
  export type Tier = "tight" | "standard" | "fence";
  export type WidthStep = { sell: number; buy: number };
  export type InventoryStep = { above: WidthStep; below: WidthStep };
  export type SuspicionRule = { markoutBps: number; withinBlocks: number; cutBps: number };
  export type FillSigns = { markoutBps: number; blocksSincePrior: number | null; sizeUp: boolean };
  export type AgentTerms = { sellBps: number; buyBps: number; cap: bigint };
  export type AgentSpread = { sellBps: number; buyBps: number; validUntil: bigint };
  export function inventoryStep(policy: string): InventoryStep | null;
  export function suspicionStep(policy: string): SuspicionRule | null;
  export function localTier(facts: { live: boolean; sizeWeth: bigint }): Tier;
  export function widthsFor(tier: Tier): { sellBps: number; buyBps: number };
  export function suspicionCut(policy: string, signs: FillSigns): number;
  export function signNote(signs: FillSigns, cutBps: number): string;
  export function spreadFor(
    tier: Tier,
    terms: AgentTerms,
    validUntil: bigint,
    inventory?: { wBps: number; wStarBps: number; step: InventoryStep | null },
    cutBps?: number,
  ): AgentSpread;
}
