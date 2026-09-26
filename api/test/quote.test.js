import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { quoteRequest } from "../src/quote.js";

const body = {
  mm: "0x186AF6aF170cb8805c021EFa176c060214F6aD5d",
  side: "buy",
  leg: "weth",
  amount: "10000000000000000000",
};

test("quote rejects a missing amount", async () => {
  const result = await quoteRequest({ ...body, amount: "" });
  assert.equal(result.status, 400);
  assert.equal(result.body.error.code, "BAD_QUOTE");
});

test("quote waits for router and token addresses", async () => {
  const dir = mkdtempSync(join(tmpdir(), "desk-quote-"));
  const configPath = join(dir, "sepolia.json");
  writeFileSync(configPath, JSON.stringify({ router: "", tokens: { weth: "", usdc: "" }, mms: [] }));
  const result = await quoteRequest(body, { configPath });
  assert.equal(result.status, 501);
  assert.equal(result.body.error.code, "QUOTE_NOT_ON_CHAIN");
});

test("quote returns the contract amounts as strings", async () => {
  const dir = mkdtempSync(join(tmpdir(), "desk-quote-"));
  const configPath = join(dir, "sepolia.json");
  writeFileSync(
    configPath,
    JSON.stringify({
      router: "0x1111111111111111111111111111111111111111",
      tokens: {
        weth: "0x2222222222222222222222222222222222222222",
        usdc: "0x3333333333333333333333333333333333333333",
      },
      mms: [],
    }),
  );
  const result = await quoteRequest(body, {
    configPath,
    quoteLive: async () => ({
      ok: true,
      amountIn: 10n,
      amountOut: 20n,
      priceWad: 30n,
      spreadBps: 20,
      spreadSource: 1,
    }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.amountIn, "10");
  assert.equal(result.body.amountOut, "20");
  assert.equal(result.body.priceWad, "30");
});
