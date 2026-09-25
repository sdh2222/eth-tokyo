import { decodeFunctionData } from "viem";
import { describe, expect, it } from "vitest";

import { chooseSpread, planSpreadWrite } from "../../src/agent/risk.js";
import { placeholderConfig } from "../../src/lib/config.js";
import { dnsEncode } from "../../src/lib/encode.js";

const cfg = placeholderConfig();
const name = "mm-a.clients.desk.eth";
const now = 1_700_000_000n;

describe("risk agent", () => {
  it("uses sMin when the book is on target", () => {
    const choice = chooseSpread(
      [{ dnsName: dnsEncode(name), wBeforeWad: 7n * 10n ** 17n }],
      cfg,
      name,
      now,
    );
    expect(choice.spreadBps).toBe(cfg.desk.sMinBps);
    expect(choice.validUntil).toBe(now + 3600n);
  });

  it("widens when the share is away from the target and stays inside the range", () => {
    const onTarget = chooseSpread([], cfg, name, now);
    const far = chooseSpread(
      [{ dnsName: dnsEncode(name), wBeforeWad: 0n }],
      cfg,
      name,
      now,
    );
    expect(onTarget.spreadBps).toBe(cfg.desk.sMinBps);
    expect(far.spreadBps).toBeGreaterThan(onTarget.spreadBps);
    expect(far.spreadBps).toBeLessThanOrEqual(cfg.desk.sMaxBps);
    expect(far.spreadBps).toBeGreaterThanOrEqual(cfg.desk.sMinBps);
    const capped = chooseSpread(
      [{ dnsName: dnsEncode(name), wBeforeWad: 2n * 10n ** 18n }],
      cfg,
      name,
      now,
    );
    expect(capped.spreadBps).toBe(cfg.desk.sMaxBps);
  });

  it("plans a desk.spread write and no other record", () => {
    const choice = chooseSpread(
      [{ dnsName: dnsEncode(name), wBeforeWad: 9n * 10n ** 17n }],
      cfg,
      name,
      now,
    );
    const tx = planSpreadWrite(cfg, name, choice);
    const decoded = decodeFunctionData({
      abi: [
        {
          type: "function",
          name: "setData",
          inputs: [
            { name: "node", type: "bytes" },
            { name: "key", type: "string" },
            { name: "value", type: "bytes" },
          ],
        },
      ],
      data: tx.data,
    });
    expect(decoded.functionName).toBe("setData");
    expect(decoded.args[1]).toBe("desk.spread");
    expect(decoded.args[2]).toBe(choice.data);
    expect(choice.data.startsWith("0x")).toBe(true);
  });
});
