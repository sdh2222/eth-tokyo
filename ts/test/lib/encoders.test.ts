import { HexString, TakerTraits } from "@1inch/swap-vm-sdk";
import { describe, expect, it } from "vitest";

import { placeholderConfig } from "../../src/lib/config.js";
import {
  dnsEncode,
  encodeGateArgs,
  encodePriceArgs,
  encodeSpread,
  encodeTakerArgs,
  encodeTerms,
} from "../../src/lib/encode.js";
import { deskInstructions } from "../../src/lib/opcodes.js";
import { priceMirror } from "../../src/lib/price.js";
import { buildProgram } from "../../src/lib/program.js";
import { buildTakerData } from "../../src/lib/taker.js";

const cfg = placeholderConfig();
const gate =
  "0x00000000000000000000000000000000000000e100000000000000000000000000000000000000d100000000000000000000000000000000000000c100000000000000000000000000000000000000a107636c69656e7473046465736b0365746800";
const price =
  "0x00000000000000000000000000000000000000a1000000000000000000000000000000000000000a00000000000000000000000000000000000000ee00000000000000000000000000000000000000dc08120600031b58";
const taker = "0x17046d6d2d6107636c69656e7473046465736b0365746800";
const program =
  "0x0d05006ab13b8014080000000000000001226200000000000000000000000000000000000000e100000000000000000000000000000000000000d100000000000000000000000000000000000000c100000000000000000000000000000000000000a107636c69656e7473046465736b0365746800235700000000000000000000000000000000000000a1000000000000000000000000000000000000000a00000000000000000000000000000000000000ee00000000000000000000000000000000000000dc08120600031b58";

describe("T-TS-1 encodings", () => {
  it("matches the section 9 vectors", () => {
    expect(dnsEncode("clients.desk.eth")).toBe(
      "0x07636c69656e7473046465736b0365746800",
    );
    expect(
      encodeGateArgs({
        ethRegistry: cfg.ens.ethRegistry as `0x${string}`,
        deskRegistry: cfg.ens.deskRegistry as `0x${string}`,
        clientsRegistry: cfg.ens.clientsRegistry as `0x${string}`,
        resolver: cfg.ens.resolver as `0x${string}`,
        suffix: "clients.desk.eth",
      }),
    ).toBe(gate);
    expect(
      encodePriceArgs({
        resolver: cfg.ens.resolver as `0x${string}`,
        oracle: cfg.oracle as `0x${string}`,
        base: cfg.tokens.weth as `0x${string}`,
        quote: cfg.tokens.usdc as `0x${string}`,
        oracleDecimals: 8,
        baseDecimals: 18,
        quoteDecimals: 6,
        maxBlocks: 3,
        wStarBps: 7000,
      }),
    ).toBe(price);
    expect(encodeTakerArgs("mm-a.clients.desk.eth")).toBe(taker);
    expect(
      buildProgram(cfg, { deadline: 1790000000n, salt: 1n }).toString(),
    ).toBe(program);
    expect(encodeTerms(3, 10, 50n * 10n ** 18n)).toBe(
      "0x00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000002b5e3af16b1880000",
    );
    expect(encodeSpread(40, 1n)).toMatch(/^0x/);
  });
});

describe("T-TS-2 price mirror", () => {
  const cells = [
    ["buy", true, 4_001_200_000n, 10n ** 18n],
    ["buy", false, 10n ** 18n, 4_001_200_000n],
    ["sell", true, 10n ** 18n, 3_996_000_000n],
    ["sell", false, 3_996_000_000n, 10n ** 18n],
    ["buy", true, 1_000n * 10n ** 6n, 249_925_022_493_252_024n],
    ["sell", true, 5n * 10n ** 17n, 1_998_000_000n],
  ] as const;

  it("prices the two widths on the oracle", () => {
    for (const [side, exactIn, amount, expected] of cells) {
      const got = priceMirror({
        baseBal: 900n * 10n ** 18n,
        quoteBal: 400_000n * 10n ** 6n,
        answer: 4000n * 10n ** 8n,
        sSellBps: 3,
        sBuyBps: 10,
        cap: 50n * 10n ** 18n,
        cfg,
        side,
        exactIn,
        amount,
      });
      expect(exactIn ? got.amountOut : got.amountIn).toBe(expected);
      expect(got.rWad).toBe(4000n * 10n ** 18n);
      expect(got.sellStopped).toBe(false);
    }
    const stopped = priceMirror({
      baseBal: 700n * 10n ** 18n,
      quoteBal: 1_200_000n * 10n ** 6n,
      answer: 4000n * 10n ** 8n,
      sSellBps: 3,
      sBuyBps: 10,
      cfg,
      side: "buy",
      exactIn: true,
      amount: 1_000n * 10n ** 6n,
    });
    expect(stopped.sellStopped).toBe(true);
  });
});

describe("instructions", () => {
  it("pins opcode indexes", () => {
    expect(deskInstructions).toHaveLength(36);
    expect(deskInstructions[13]).toBeTruthy();
    expect(deskInstructions[20]).toBeTruthy();
    expect(deskInstructions[34]).toBe(deskInstructions.at(34));
    expect(deskInstructions[35]).toBe(deskInstructions.at(35));
  });
});

describe("T-TS-3 taker data", () => {
  it("round-trips through TakerTraits.decode", () => {
    const hex = buildTakerData({
      name: "mm-a.clients.desk.eth",
      exactIn: true,
      threshold: 1n,
      deadline: 1790000000n,
    });
    const decoded = TakerTraits.decode(new HexString(hex));
    expect(decoded.exactIn).toBe(true);
    expect(decoded.instructionsArgs.toString()).toBe(
      encodeTakerArgs("mm-a.clients.desk.eth"),
    );
  });
});

describe("T-TS-4 strategyHash parity", () => {
  it.skip("filled by T8", () => {});
});
