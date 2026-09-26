import { encodeAbiParameters, encodeErrorResult, keccak256, toHex } from "viem";
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { placeholderConfig } from "../../src/lib/config.js";
import {
  buildSwapTx,
  decodeDeskError,
  decodeProgram,
  describeProgram,
  findLiveStrategy,
  findStrategies,
  planCutOff,
  planDock,
  planMultiSend,
  planSetTerms,
  quoteFor,
  readDeskState,
  readFills,
  verifyFill,
  type DeskCtx,
} from "../../src/lib/client/index.js";
import { priceMirror } from "../../src/lib/price.js";

const program =
  "0x0d05006ab13b8014080000000000000001226200000000000000000000000000000000000000e100000000000000000000000000000000000000d100000000000000000000000000000000000000c100000000000000000000000000000000000000a107636c69656e7473046465736b0365746800235700000000000000000000000000000000000000a1000000000000000000000000000000000000000a00000000000000000000000000000000000000ee00000000000000000000000000000000000000dc08120600031b58" as const;

const cfg = {
  ...placeholderConfig(),
  router: "0x00000000000000000000000000000000000000aa" as const,
  safe: "0x00000000000000000000000000000000000000bb" as const,
  logChunk: 1,
};

function shipped(hash: `0x${string}`) {
  const data = encodeAbiParameters(
    [
      { type: "address" },
      { type: "address" },
      { type: "bytes32" },
      { type: "bytes" },
    ],
    [cfg.safe, cfg.router, hash, program],
  );
  return {
    data,
    topics: [
      keccak256(
        toHex(
          new TextEncoder().encode("Shipped(address,address,bytes32,bytes)"),
        ),
      ),
    ] as const,
    blockNumber: 1n,
    transactionHash: hash,
  };
}

describe("T-TS-5 strategies", () => {
  it("scans chunks and warns when two strategies are live", async () => {
    const logs = [
      shipped("0x" + "11".repeat(32)),
      shipped("0x" + "22".repeat(32)),
    ];
    const client = {
      getBlockNumber: async () => 2n,
      getLogs: async () => logs,
      readContract: async () => [1n, 2] as const,
    };
    const ctx = { client, cfg } as unknown as DeskCtx;
    const found = await findStrategies(ctx);
    expect(found.filter((s) => s.live)).toHaveLength(2);
    const live = await findLiveStrategy(ctx);
    expect(live?.warning).toBe("MULTIPLE_LIVE");
  });
});

describe("T-TS-6 program", () => {
  it("round-trips the golden program and describes it", () => {
    const decoded = decodeProgram(program);
    expect(decoded.deadline).toBe(1790000000n);
    expect(decoded.salt).toBe(1n);
    expect(decoded.unknown).toEqual([]);
    expect(describeProgram(decoded, cfg)).toEqual([
      "Open until 2026-09-21 23:13 JST",
      "Only names under clients.desk.eth may trade",
      "Price: the oracle mid, with the widths scaled by the distance from 70% ETH. A sell stops at 70% ETH",
      "Open for 3 blocks after the oracle update",
      "Suffix matches the config",
    ]);
    const withUnknown = decodeProgram(`${program}6301aa`);
    expect(withUnknown.unknown).toEqual([
      { opcode: 0x63, args: "0xaa", known: false },
    ]);
  });
});

describe("T-TS-7 plans", () => {
  it("plans terms, cutoff, dock and a multisend", () => {
    const ctx = { client: {}, cfg } as unknown as DeskCtx;
    expect(
      planSetTerms(ctx, "mm-a.clients.desk.eth", 3, 10, 50n * 10n ** 18n).label,
    ).toBe("set terms");
    expect(planCutOff(ctx, "mm-a.clients.desk.eth").label).toBe("cut off");
    expect(planDock(ctx, "0x" + "ab".repeat(32)).label).toBe("dock");
    const packed = planMultiSend([planDock(ctx, "0x" + "ab".repeat(32))]);
    expect(packed.to).toBe("0x40A2aCCbd92BCA938b02010E17A5b8929b49130D");
    expect(packed.data.startsWith("0x8d80ff0a")).toBe(true);
  });
});

describe("T-TS-8 state", () => {
  it("reads wallet balances in one multicall", async () => {
    const client = {
      multicall: async () => [
        { status: "success", result: 1n },
        { status: "success", result: 2n },
        { status: "success", result: 3n },
        { status: "success", result: 4n },
        { status: "success", result: [1n, 4000n * 10n ** 8n, 0n, 10n, 1n] },
      ],
    };
    const state = await readDeskState(
      {
        client,
        cfg: { ...cfg, mms: [{ name: "mm-a.clients.desk.eth", address: "" }] },
      } as unknown as DeskCtx,
      { live: true } as DeskCtx extends never
        ? never
        : Parameters<typeof readDeskState>[1],
    );
    expect(state.safeWallet).toEqual({ weth: 1n, usdc: 2n });
    expect(state.balances).toEqual({ weth: 1n, usdc: 2n });
    const mirror = priceMirror({
      baseBal: 1n,
      quoteBal: 2n,
      answer: 4000n * 10n ** 8n,
      sSellBps: cfg.desk.sSellBps,
      sBuyBps: cfg.desk.sBuyBps,
      cfg,
      side: "buy",
      exactIn: true,
      amount: 1n,
    });
    expect(state.wWad).toBe(mirror.wWad);
    expect(state.mms[0]?.askWad).toBe(mirror.askWad);
    expect(state.mms[0]?.bidWad).toBe(mirror.bidWad);
    expect(state.mms[0]?.status).toBe("no-addr");
  });
});

describe("T-TS-9 quote", () => {
  it("sets mirrorMatches when the call equals the price mirror", async () => {
    const mirror = priceMirror({
      baseBal: 900n * 10n ** 18n,
      quoteBal: 400_000n * 10n ** 6n,
      answer: 4000n * 10n ** 8n,
      sSellBps: cfg.desk.sSellBps,
      sBuyBps: cfg.desk.sBuyBps,
      cap: 50n * 10n ** 18n,
      cfg,
      side: "buy",
      exactIn: true,
      amount: 1_000n * 10n ** 6n,
    });
    const client = {
      simulateContract: async () => ({
        result: [mirror.amountIn, mirror.amountOut, "0x" + "00".repeat(32)],
      }),
      multicall: async () => [
        { status: "success", result: 900n * 10n ** 18n },
        { status: "success", result: 400_000n * 10n ** 6n },
        { status: "success", result: [1n, 4000n * 10n ** 8n, 0n, 10n, 1n] },
      ],
    };
    const order = encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "maker", type: "address" },
            { name: "traits", type: "uint256" },
            { name: "data", type: "bytes" },
          ],
        },
      ],
      [{ maker: cfg.safe, traits: 0n, data: "0x" }],
    );
    const quote = await quoteFor(
      { client, cfg } as unknown as DeskCtx,
      { order, strategyHash: "0x" + "11".repeat(32) } as Parameters<
        typeof quoteFor
      >[1],
      {
        mm: { name: "mm-a.clients.desk.eth", address: cfg.safe },
        side: "buy",
        leg: "usdc",
        amount: 1_000n * 10n ** 6n,
      },
    );
    expect(quote.ok).toBe(true);
    if (quote.ok) expect(quote.mirrorMatches).toBe(true);
  });
});

describe("T-TS-10 fills", () => {
  it("recomputes a zero-skew fill", () => {
    const check = verifyFill(
      {
        amountIn: 1_000n * 10n ** 6n,
        amountOut: 0n,
        midWad: 4000n * 10n ** 18n,
        sSellBps: cfg.desk.sSellBps,
        sBuyBps: cfg.desk.sBuyBps,
        wBeforeWad: 7000n * 10n ** 14n,
        tokenIn: cfg.tokens.usdc,
        base: cfg.tokens.weth,
      },
      cfg,
    );
    expect(check.steps.map((step) => step.label)).toEqual([
      "mid",
      "price",
      "amountOut",
    ]);
    const again = verifyFill(
      {
        amountIn: 1_000n * 10n ** 6n,
        amountOut: check.steps[2]?.value ?? 0n,
        midWad: 4000n * 10n ** 18n,
        sSellBps: cfg.desk.sSellBps,
        sBuyBps: cfg.desk.sBuyBps,
        wBeforeWad: 7000n * 10n ** 14n,
        tokenIn: cfg.tokens.usdc,
        base: cfg.tokens.weth,
      },
      cfg,
    );
    expect(again.matches).toBe(true);
  });

  it("recomputes a fill on the stored widths", () => {
    const check = verifyFill(
      {
        amountIn: 1_000n * 10n ** 6n,
        amountOut: 249_925_022_493_252_024n,
        midWad: 4000n * 10n ** 18n,
        sSellBps: 3,
        sBuyBps: 10,
        wBeforeWad: 9n * 10n ** 17n,
        tokenIn: cfg.tokens.usdc,
        base: cfg.tokens.weth,
      },
      cfg,
    );
    expect(check.matches).toBe(true);
    expect(check.steps[1]?.value).toBe(4_001_200_000_000_000_000_000n);
  });

  it("reads fill logs", async () => {
    const client = { getLogs: async () => [] };
    expect(await readFills({ client, cfg } as unknown as DeskCtx)).toEqual([]);
  });
});

describe("T-TS-11 errors", () => {
  it("maps a desk error and an unknown revert", () => {
    const data = encodeErrorResult({
      abi: [{ type: "error", name: "DeskPriceNoTerms", inputs: [] }],
      errorName: "DeskPriceNoTerms",
      args: [],
    });
    expect(decodeDeskError({ data }).code).toBe("DeskPriceNoTerms");
    expect(decodeDeskError({ data: "0xdeadbeef" }).code).toBe("UNKNOWN");
    const swap = buildSwapTx(
      { client: {}, cfg } as unknown as DeskCtx,
      encodeAbiParameters(
        [
          {
            type: "tuple",
            components: [
              { name: "maker", type: "address" },
              { name: "traits", type: "uint256" },
              { name: "data", type: "bytes" },
            ],
          },
        ],
        [
          {
            maker: "0x00000000000000000000000000000000000000bb",
            traits: 0n,
            data: "0x",
          },
        ],
      ),
      {
        ok: true,
        amountIn: 10n,
        amountOut: 20n,
        name: "mm-a.clients.desk.eth",
        exactIn: true,
      },
      { slippageBps: 50, deadlineSec: 60, now: 1n },
    );
    expect(swap.label).toBe("swap");
  });
});

describe("browser build", () => {
  it("has no node imports under dist/lib", () => {
    const root = new URL("../../dist/lib", import.meta.url);
    const files = walk(root.pathname);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text.includes("node:")).toBe(false);
      expect(text.includes("child_process")).toBe(false);
    }
  });
});

function walk(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? walk(path)
      : path.endsWith(".js")
        ? [path]
        : [];
  });
}
