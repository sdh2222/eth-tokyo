import { type Address, type Hex, hexToBytes } from "viem";

import type { DeskConfig } from "../config.js";
import type { DecodedProgram, GateArgs, PriceArgs } from "./ctx.js";

export function decodeProgram(program: Hex): DecodedProgram {
  const bytes = hexToBytes(program);
  let i = 0;
  let deadline = 0n;
  let salt = 0n;
  let gate: GateArgs = emptyGate();
  let price: PriceArgs = emptyPrice();
  const unknown: DecodedProgram["unknown"] = [];
  while (i + 2 <= bytes.length) {
    const opcode = bytes[i];
    const len = bytes[i + 1];
    const args = bytes.slice(i + 2, i + 2 + len);
    const hex =
      `0x${[...args].map((b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
    if (opcode === 13 && len === 5) deadline = readUint(args);
    else if (opcode === 20 && len === 8) salt = readUint(args);
    else if (opcode === 34) gate = parseGate(args);
    else if (opcode === 35) price = parsePrice(args);
    else unknown.push({ opcode, args: hex, known: false });
    i += 2 + len;
  }
  return { deadline, salt, gate, price, unknown };
}

export function describeProgram(d: DecodedProgram, cfg: DeskConfig): string[] {
  const when = formatJst(d.deadline);
  const target = Math.round(d.price.wStarBps / 100);
  const blocks = d.price.maxBlocks;
  const suffix = dnsToName(d.gate.suffix);
  return [
    `Open until ${when}`,
    `Only names under ${suffix} may trade`,
    `Price: the oracle mid, with the widths scaled by the distance from ${target}% ETH. A sell stops at ${target}% ETH`,
    `Open for ${blocks} blocks after the oracle update`,
    cfg.ens.suffix === suffix
      ? "Suffix matches the config"
      : `Suffix differs from ${cfg.ens.suffix}`,
  ];
}

function formatJst(deadline: bigint): string {
  const jst = new Date(Number(deadline) * 1000 + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm} JST`;
}

function readUint(bytes: Uint8Array): bigint {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) + BigInt(b);
  return n;
}

function addressAt(bytes: Uint8Array, offset: number): Address {
  const slice = bytes.slice(offset, offset + 20);
  return `0x${[...slice].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function parseGate(bytes: Uint8Array): GateArgs {
  const suffixBytes = bytes.slice(80);
  return {
    ethRegistry: addressAt(bytes, 0),
    deskRegistry: addressAt(bytes, 20),
    clientsRegistry: addressAt(bytes, 40),
    resolver: addressAt(bytes, 60),
    suffix: `0x${[...suffixBytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`,
  };
}

function parsePrice(bytes: Uint8Array): PriceArgs {
  return {
    resolver: addressAt(bytes, 0),
    oracle: addressAt(bytes, 20),
    base: addressAt(bytes, 40),
    quote: addressAt(bytes, 60),
    oracleDecimals: bytes[80],
    baseDecimals: bytes[81],
    quoteDecimals: bytes[82],
    maxBlocks: Number(readUint(bytes.slice(83, 85))),
    wStarBps: Number(readUint(bytes.slice(85, 87))),
  };
}

function dnsToName(suffix: string): string {
  const bytes = hexToBytes(suffix as Hex);
  const labels: string[] = [];
  let i = 0;
  while (i < bytes.length && bytes[i] !== 0) {
    const n = bytes[i];
    labels.push(new TextDecoder().decode(bytes.slice(i + 1, i + 1 + n)));
    i += 1 + n;
  }
  return labels.join(".");
}

function emptyGate(): GateArgs {
  const zero = "0x0000000000000000000000000000000000000000";
  return {
    ethRegistry: zero,
    deskRegistry: zero,
    clientsRegistry: zero,
    resolver: zero,
    suffix: "0x00",
  };
}

function emptyPrice(): PriceArgs {
  const zero = "0x0000000000000000000000000000000000000000";
  return {
    resolver: zero,
    oracle: zero,
    base: zero,
    quote: zero,
    oracleDecimals: 0,
    baseDecimals: 0,
    quoteDecimals: 0,
    maxBlocks: 0,
    wStarBps: 0,
  };
}
