import assert from "node:assert/strict";
import test from "node:test";
import { encodeAbiParameters, encodeEventTopics } from "viem";
import { DESK_FILL, fillFromLog } from "../src/chain.js";
import { openDb } from "../src/db.js";
import { clientNames } from "../src/ens.js";
import { pollOnce } from "../src/watch.js";

test("client names include the configured list and mm-c", () => {
  const names = clientNames({
    ens: { suffix: "clients.dao-treasury-a.eth" },
    mms: [{ name: "mm-a.clients.dao-treasury-a.eth" }, { name: "mm-b.clients.dao-treasury-a.eth" }],
  });
  assert.deepEqual(names, [
    "mm-a.clients.dao-treasury-a.eth",
    "mm-b.clients.dao-treasury-a.eth",
    "mm-c.clients.dao-treasury-a.eth",
  ]);
});

test("empty desk addresses do not read logs or balances", async () => {
  const db = openDb();
  const client = {
    async getBlock() {
      return { number: 10n, timestamp: 1n };
    },
    async getLogs() {
      throw new Error("logs");
    },
    async readContract() {
      throw new Error("call");
    },
  };
  const result = await pollOnce(db, client, {
    deployBlock: 0,
    logChunk: 100,
    router: "",
    oracle: "",
    safe: "",
    tokens: { weth: "", usdc: "" },
    ens: { ethRegistry: "", suffix: "" },
    mms: [],
  });
  assert.equal(result.wrote, 0);
  assert.equal(result.head, "10");
});

test("DeskFill log becomes a fill row", () => {
  const taker = "0x186AF6aF170cb8805c021EFa176c060214F6aD5d";
  const weth = "0x00000000000000000000000000000000000000a1";
  const usdc = "0x00000000000000000000000000000000000000a2";
  const dns = dnsEncode("mm-a.clients.dao-treasury-a.eth");
  const topics = encodeEventTopics({
    abi: [DESK_FILL],
    eventName: "DeskFill",
    args: {
      orderHash: `0x${"11".repeat(32)}`,
      nameHash: `0x${"22".repeat(32)}`,
      taker,
    },
  });
  const data = encodeAbiParameters(
    [
      { type: "bytes" },
      { type: "address" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint16" },
      { type: "uint8" },
      { type: "uint256" },
    ],
    [dns, usdc, weth, 10n, 20n, 30n, 10, 1, 40n],
  );
  const event = fillFromLog(
    { data, topics, transactionHash: "0xfill", blockNumber: 4n },
    { weth, blockTime: 50 },
  );
  assert.equal(event.name, "mm-a.clients.dao-treasury-a.eth");
  assert.equal(event.side, "bought ETH");
  assert.equal(event.amountIn, "10");
  assert.equal(event.strategyHash, `0x${"11".repeat(32)}`);
});

function dnsEncode(name) {
  const parts = [];
  for (const label of name.split(".")) {
    const bytes = new TextEncoder().encode(label);
    parts.push(Uint8Array.of(bytes.length), bytes);
  }
  parts.push(Uint8Array.of(0));
  const out = Buffer.concat(parts.map((part) => Buffer.from(part)));
  return `0x${out.toString("hex")}`;
}
