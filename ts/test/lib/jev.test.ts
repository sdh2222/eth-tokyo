import { describe, expect, it } from "vitest";

import { askJev, parseJevTier } from "../../src/lib/jev.js";

describe("jev tier parse", () => {
  it("reads a confident choice and rejects a bad body", () => {
    expect(
      parseJevTier({
        answers: { tier: { choice: "tight", confidence: 0.91 } },
      }),
    ).toEqual({ tier: "tight", confidence: 0.91 });
    expect(
      parseJevTier({ answers: { tier: { choice: "wide", confidence: 0.9 } } }),
    ).toBe(null);
    expect(parseJevTier({ answers: { tier: { choice: "fence" } } })).toBe(null);
    expect(parseJevTier(null)).toBe(null);
  });

  it("uses a fake fetch and does not call the network", async () => {
    let called = "";
    const fetchImpl: typeof fetch = async (input, init) => {
      called = String(input);
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer test-key");
      expect(String(init?.body)).not.toContain("test-key");
      return new Response(
        JSON.stringify({
          answers: { tier: { choice: "standard", confidence: 0.8 } },
        }),
        { status: 200 },
      );
    };
    expect(await askJev("test-key", "name mm-a", fetchImpl)).toEqual({
      tier: "standard",
      confidence: 0.8,
    });
    expect(called).toBe("https://api.typesafe.ai/v1/systemone");
    expect(
      String(
        await askJev(
          "test-key",
          "x",
          async () => new Response("", { status: 401 }),
        ),
      ),
    ).toBe("null");
    expect(await askJev("", "x", fetchImpl)).toBe(null);
  });
});
