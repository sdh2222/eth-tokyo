import {
  encodeAbiParameters,
  encodePacked,
  type Address,
  type Hex,
} from "viem";

export function dnsEncode(name: string): Hex {
  const parts = name.split(".");
  const bytes: number[] = [];
  for (const part of parts) {
    const raw = new TextEncoder().encode(part);
    bytes.push(raw.length, ...raw);
  }
  bytes.push(0);
  return `0x${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function encodeGateArgs(a: {
  ethRegistry: Address;
  deskRegistry: Address;
  clientsRegistry: Address;
  resolver: Address;
  suffix: string;
}): Hex {
  return encodePacked(
    ["address", "address", "address", "address", "bytes"],
    [
      a.ethRegistry,
      a.deskRegistry,
      a.clientsRegistry,
      a.resolver,
      dnsEncode(a.suffix),
    ],
  );
}

export function encodePriceArgs(a: {
  resolver: Address;
  oracle: Address;
  base: Address;
  quote: Address;
  oracleDecimals: number;
  baseDecimals: number;
  quoteDecimals: number;
  maxStaleness: number;
  wStarBps: number;
  kappaBps: number;
  sMinBps: number;
  sMaxBps: number;
}): Hex {
  return encodePacked(
    [
      "address",
      "address",
      "address",
      "address",
      "uint8",
      "uint8",
      "uint8",
      "uint32",
      "uint16",
      "uint16",
      "uint16",
      "uint16",
    ],
    [
      a.resolver,
      a.oracle,
      a.base,
      a.quote,
      a.oracleDecimals,
      a.baseDecimals,
      a.quoteDecimals,
      a.maxStaleness,
      a.wStarBps,
      a.kappaBps,
      a.sMinBps,
      a.sMaxBps,
    ],
  );
}

export function encodeTakerArgs(name: string): Hex {
  const dns = dnsEncode(name);
  const len = (dns.length - 2) / 2;
  if (len > 255) throw new Error("name too long");
  return encodePacked(["uint8", "bytes"], [len, dns]);
}

export function encodeTerms(tierBps: number, cap: bigint): Hex {
  return encodeAbiParameters(
    [{ type: "uint8" }, { type: "uint16" }, { type: "uint128" }],
    [1, tierBps, cap],
  );
}

export function encodeSpread(bps: number, validUntil: bigint): Hex {
  return encodeAbiParameters(
    [{ type: "uint8" }, { type: "uint16" }, { type: "uint64" }],
    [1, bps, validUntil],
  );
}
