// Types for the policy readers in ts/src/lib/counterparty.ts (main, PR #34), aliased as
// @desk/counterparty in vite.config.ts. The keeper reads desk.policy with these, so the web
// shows what the agent will take from a policy with the same code.
declare module "@desk/counterparty" {
  export type WidthStep = { sell: number; buy: number };
  export type InventoryStep = { above: WidthStep; below: WidthStep };
  export type SuspicionRule = { markoutBps: number; withinBlocks: number; cutBps: number };
  export function inventoryStep(policy: string): InventoryStep | null;
  export function suspicionStep(policy: string): SuspicionRule | null;
}
