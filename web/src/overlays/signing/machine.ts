import type { Address, DeskError, Hex } from "../../desk/types";

export type Phase =
  | { name: "review" }
  | { name: "signed1"; owner: Address; safeTxHash: Hex }
  | { name: "switch" }
  | { name: "confirming"; hash?: Hex }
  | { name: "done"; summary: string[] }
  | { name: "failed"; error: DeskError };

export type SignEvent =
  | { type: "SIGN_1"; owner: Address; safeTxHash: Hex; sig: string }
  | { type: "ACCOUNT"; owner: Address }
  | { type: "SIGN_2" }
  | { type: "REJECT" }
  | { type: "MINED" }
  | { type: "CHECKS"; lines: string[] }
  | { type: "CHECK_FAIL"; error: DeskError };

export function reduce(phase: Phase, event: SignEvent): Phase {
  if (event.type === "REJECT") return phase;
  if (phase.name === "review" && event.type === "SIGN_1") {
    return { name: "signed1", owner: event.owner, safeTxHash: event.safeTxHash };
  }
  if (phase.name === "signed1") return { name: "switch" };
  if (phase.name === "switch" && event.type === "ACCOUNT") return phase;
  if (phase.name === "switch" && event.type === "SIGN_2") return { name: "confirming" };
  if (phase.name === "confirming" && event.type === "MINED") return phase;
  if (phase.name === "confirming" && event.type === "CHECKS") return { name: "done", summary: event.lines };
  if (phase.name === "confirming" && event.type === "CHECK_FAIL") return { name: "failed", error: event.error };
  return phase;
}
