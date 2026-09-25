import type { Address } from "viem";
import { isAddress } from "viem";

export type DeskConfig = {
  chainId: number;
  aqua: Address;
  ens: {
    ethRegistry: Address | "";
    deskRegistry: Address | "";
    clientsRegistry: Address | "";
    resolver: Address | "";
    suffix: string;
    universalResolver: Address | "";
  };
  tokens: { weth: Address | ""; usdc: Address | "" };
  oracle: Address | "";
  router: Address | "";
  safe: Address | "";
  desk: {
    oracleDecimals: number;
    baseDecimals: number;
    quoteDecimals: number;
    maxStaleness: number;
    wStarBps: number;
    kappaBps: number;
    sMinBps: number;
    sMaxBps: number;
    strategyTtlDays: number;
    shipWeth: string;
    shipUsdc: string;
  };
  mms: { name: string; address: Address | "" }[];
  deployBlock: number;
  logChunk: number;
  explorer: string;
};

const addressKeys = ["aqua", "oracle", "router", "safe"] as const;

export function loadConfig(json: unknown): DeskConfig {
  if (json === null || typeof json !== "object")
    throw new Error("config is not an object");
  const cfg = json as DeskConfig;
  for (const key of addressKeys) {
    assertAddressField(cfg[key], key);
  }
  if (typeof cfg.ens !== "object" || cfg.ens === null)
    throw new Error("missing ens");
  for (const key of [
    "ethRegistry",
    "deskRegistry",
    "clientsRegistry",
    "resolver",
    "universalResolver",
  ] as const) {
    assertAddressField(cfg.ens[key], `ens.${key}`);
  }
  if (typeof cfg.ens.suffix !== "string" || cfg.ens.suffix.length === 0)
    throw new Error("missing ens.suffix");
  if (typeof cfg.tokens !== "object" || cfg.tokens === null)
    throw new Error("missing tokens");
  assertAddressField(cfg.tokens.weth, "tokens.weth");
  assertAddressField(cfg.tokens.usdc, "tokens.usdc");
  if (!Array.isArray(cfg.mms)) throw new Error("missing mms");
  for (const mm of cfg.mms) {
    assertAddressField(mm.address, `mms.${mm.name}`);
  }
  return cfg;
}

function assertAddressField(value: unknown, name: string): void {
  if (value === "") return;
  if (typeof value !== "string" || !isAddress(value))
    throw new Error(`malformed address ${name}`);
}

export function placeholderConfig(): DeskConfig {
  const a = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Address;
  return {
    chainId: 11155111,
    aqua: "0x1111113ccf1426a8e30e2bff5e005d929bf6a90a",
    ens: {
      ethRegistry: a(0xe1),
      deskRegistry: a(0xd1),
      clientsRegistry: a(0xc1),
      resolver: a(0xa1),
      suffix: "clients.desk.eth",
      universalResolver: "",
    },
    tokens: { weth: a(0xee), usdc: a(0xdc) },
    oracle: a(0x0a),
    router: "",
    safe: "",
    desk: {
      oracleDecimals: 8,
      baseDecimals: 18,
      quoteDecimals: 6,
      maxStaleness: 3600,
      wStarBps: 7000,
      kappaBps: 200,
      sMinBps: 5,
      sMaxBps: 200,
      strategyTtlDays: 30,
      shipWeth: "900000000000000000000",
      shipUsdc: "400000000000",
    },
    mms: [],
    deployBlock: 0,
    logChunk: 50000,
    explorer: "https://sepolia.etherscan.io",
  };
}
