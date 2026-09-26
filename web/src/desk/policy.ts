import { inventoryStep, suspicionStep, type InventoryStep, type SuspicionRule } from "@desk/counterparty";

// desk.policy, as the keeper reads it (main, PR #34). The keeper takes two sentences from the
// policy with ts/src/lib/counterparty.ts: the inventory step around 70% ETH and the suspicion
// rule. Everything else in the text is for people. The template is the one main ships
// (ts/src/scripts/demo.ts); the sentences the keeper parses are in Korean, so the web says
// what it read in English next to the text, with the keeper's own parser.

export const POLICY_TEMPLATE =
  "이미 장부에 있는 상대는 게시된 약정보다 좁은 폭을 받을 수 있다. 크고 처음인 거래는 매도 3 bp, 매수 10 bp에 머문다. 그 약정 밖으로는 호가하지 않는다. 오라클 중간가는 움직이지 않는다. ETH 비중이 70%보다 높으면 에이전트는 고른 매도 폭에서 1 bp를 빼고 매수 폭에 1 bp를 더한다. 70%보다 낮으면 매도 폭에 1 bp를 더하고 매수 폭에서 1 bp를 뺀다. 매도 폭은 1 bp 아래로 내려가지 않고, 둘 다 그 이름의 약정 안에 둔다. 체결 뒤에 오라클이 그 이름에 유리하게 1 bp 이상 움직이거나, 같은 이름이 50블록 안에 다시 오거나, 이번 크기가 직전보다 크면 의심해서 고른 폭을 1 bp 깎는다.";

export type PolicyReading = {
  step: InventoryStep | null;
  rule: SuspicionRule | null;
  /** What the keeper took from the text, one [when, then] line per rule, in English. */
  lines: [string, string][];
  /** Rules the keeper looks for and did not find in the text. */
  missing: string[];
};

// Sell width is the ask side (the desk sells ETH), buy width the bid side.
export function readPolicy(text: string): PolicyReading {
  const step = inventoryStep(text);
  const rule = suspicionStep(text);
  const lines: [string, string][] = [];
  const missing: string[] = [];
  if (step) {
    lines.push(["ETH share above 70%", `Ask ${step.above.sell} bp tighter, bid ${step.above.buy} bp wider`]);
    lines.push(["ETH share below 70%", `Ask ${step.below.sell} bp wider, bid ${step.below.buy} bp tighter`]);
  } else {
    missing.push("inventory step around 70% ETH");
  }
  if (rule) {
    lines.push([
      `Taker gained ${rule.markoutBps} bp, came back within ${rule.withinBlocks} blocks or sized up`,
      `Both ${rule.cutBps} bp wider`,
    ]);
  } else {
    missing.push("rule for a suspicious fill");
  }
  return { step, rule, lines, missing };
}

// The template's sentences the keeper does not parse, in English.
const TEMPLATE_PREAMBLE =
  "Names already on the book may get narrower widths than their posted terms. Large and first-time fills stay at ask 3 bp, bid 10 bp. The desk never quotes outside those terms, and the oracle mid does not move.";

/**
 * The policy in English, for the screen. The stored text stays as written (the keeper parses
 * its Korean sentences); this says the same from what the keeper reads, plus the template's
 * other sentences when the text is main's template.
 */
export function englishPolicy(text: string): string {
  const { step, rule } = readPolicy(text);
  const parts: string[] = [];
  if (text.trim() === POLICY_TEMPLATE) parts.push(TEMPLATE_PREAMBLE);
  if (step) {
    parts.push(
      `Above 70% ETH, the agent takes ${step.above.sell} bp off the ask width and adds ${step.above.buy} bp to the bid width. Below 70%, it adds ${step.below.sell} bp to the ask and takes ${step.below.buy} bp off the bid.`,
    );
  }
  if (step || rule) parts.push("The ask stays at 1 bp or more, and both widths stay inside that name's terms.");
  if (rule) {
    parts.push(
      `After a fill, if the oracle moves ${rule.markoutBps} bp or more in that name's favour, the same name is back within ${rule.withinBlocks} blocks, or the size is larger than its last fill, both widths go ${rule.cutBps} bp wider.`,
    );
  }
  return parts.join(" ");
}
