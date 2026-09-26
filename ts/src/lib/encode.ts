import {
  encodeAbiParameters,
  encodePacked,
  hexToBytes,
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

/** DNS wire bytes from a `DeskFill` name, back to a dotted name. */
export function dnsDecode(wire: Hex): string {
  const bytes = hexToBytes(wire);
  const labels: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    const len = bytes[i] ?? 0;
    if (len === 0) break;
    i += 1;
    labels.push(new TextDecoder().decode(bytes.slice(i, i + len)));
    i += len;
  }
  return labels.join(".");
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
  maxBlocks: number;
  wStarBps: number;
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
      a.maxBlocks,
      a.wStarBps,
    ],
  );
}

export function encodeTakerArgs(name: string): Hex {
  const dns = dnsEncode(name);
  const len = (dns.length - 2) / 2;
  if (len > 255) throw new Error("name too long");
  return encodePacked(["uint8", "bytes"], [len, dns]);
}

export function encodeTerms(
  sSellBps: number,
  sBuyBps: number,
  cap: bigint,
): Hex {
  return encodeAbiParameters(
    [
      { type: "uint8" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint128" },
    ],
    [1, sSellBps, sBuyBps, cap],
  );
}

export function encodeSpread(bps: number, validUntil: bigint): Hex {
  return encodeAbiParameters(
    [{ type: "uint8" }, { type: "uint16" }, { type: "uint64" }],
    [1, bps, validUntil],
  );
}
