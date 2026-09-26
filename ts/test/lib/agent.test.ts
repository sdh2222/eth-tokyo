import { decodeFunctionData } from "viem";
import { describe, expect, it } from "vitest";

import {
  agentSpreadFits,
  encodeAgentSpread,
  encodeAgentStats,
  planAgentWrites,
  AGENT_SCOPE,
} from "../../src/lib/agent.js";

const resolver = "0x00000000000000000000000000000000000000a1" as const;
const terms = { sellBps: 3, buyBps: 10, cap: 50n * 10n ** 18n };
const spread = { sellBps: 2, buyBps: 8, validUntil: 1_800_000_000n };

describe("agent writes", () => {
  it("belongs to the Safe, not to an Aqua order", () => {
    expect(AGENT_SCOPE).toBe("safe");
  });

  it("encodes two widths and an expiry in 128 bytes", () => {
    const encoded = encodeAgentSpread(spread);
    expect((encoded.length - 2) / 2).toBe(128);
    expect(encoded.startsWith("0x" + "00".repeat(31) + "01")).toBe(true);
  });

  it("plans desk.spread and desk.stats for the agent to sign", () => {
    const writes = planAgentWrites({
      resolver,
      name: "dao-treasury-a.eth",
      spread,
      terms,
      writtenAt: 1_700_000_000n,
    });
    const data = decodeFunctionData({
      abi: [
        {
          type: "function",
          name: "setData",
          inputs: [
            { name: "name", type: "bytes" },
            { name: "key", type: "string" },
            { name: "value", type: "bytes" },
          ],
          outputs: [],
        },
      ],
      data: writes.spread.data,
    });
    const text = decodeFunctionData({
      abi: [
        {
          type: "function",
          name: "setText",
          inputs: [
            { name: "name", type: "bytes" },
            { name: "key", type: "string" },
            { name: "value", type: "string" },
          ],
          outputs: [],
        },
      ],
      data: writes.stats.data,
    });
    expect(writes.spread.to).toBe(resolver);
    expect(data.args[1]).toBe("desk.spread");
    expect(text.args[1]).toBe("desk.stats");
    expect(text.args[2]).toBe(
      encodeAgentStats({ ...spread, writtenAt: 1_700_000_000n }),
    );
  });

  it("refuses a width outside the Safe's fence", () => {
    expect(agentSpreadFits({ ...spread, sellBps: 4 }, terms)).toBe(false);
    expect(() =>
      planAgentWrites({
        resolver,
        name: "dao-treasury-a.eth",
        spread: { ...spread, sellBps: 4 },
        terms,
        writtenAt: 1_700_000_000n,
      }),
    ).toThrow(/outside the Safe/);
  });
});
