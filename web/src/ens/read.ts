import {
  decodeAbiParameters,
  encodeFunctionData,
  namehash,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { AGENT_ENS_NAME, CLIENT_NAMES, DESK_LABEL, ETH_REGISTRY } from "./desk";

const registryAbi = [
  {
    type: "function",
    name: "findExpiry",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "getSubregistry",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getResolver",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "address" }],
  },
] as const;

const resolverAbi = [
  {
    type: "function",
    name: "resolve",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "bytes" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes" }],
  },
] as const;

const profileAbi = [
  {
    type: "function",
    name: "addr",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "data",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ type: "bytes" }],
  },
  {
    type: "function",
    name: "multicall",
    stateMutability: "view",
    inputs: [{ name: "calls", type: "bytes[]" }],
    outputs: [{ type: "bytes[]" }],
  },
] as const;

const TERMS = [{ type: "uint8" }, { type: "uint16" }, { type: "uint128" }] as const;
const SPREAD = [{ type: "uint8" }, { type: "uint16" }, { type: "uint64" }] as const;
const RECORD_BYTES = 96;

export type EnsNameView = {
  name: string;
  addr: Address;
  expiry: bigint;
  expiryOk: boolean;
  resolverOk: boolean;
  tierBps: number | null;
  cap: bigint | null;
  spreadBps: number | null;
  status: "ok" | "expired" | "no-terms" | "wrong-resolver" | "no-addr";
};

function dnsEncode(name: string): Hex {
  const parts: Uint8Array[] = [];
  for (const label of name.split(".")) {
    const bytes = new TextEncoder().encode(label);
    if (bytes.length === 0 || bytes.length > 255) throw new Error(`invalid label in ${name}`);
    parts.push(Uint8Array.of(bytes.length), bytes);
  }
  parts.push(Uint8Array.of(0));
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return `0x${[...out].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function decodeTerms(value: Hex): { tierBps: number; cap: bigint } | null {
  if ((value.length - 2) / 2 !== RECORD_BYTES) return null;
  const [version, tierBps, cap] = decodeAbiParameters(TERMS, value);
  if (version !== 1 || cap === 0n) return null;
  return { tierBps, cap };
}

function decodeSpread(value: Hex, now: bigint): number | null {
  if ((value.length - 2) / 2 !== RECORD_BYTES) return null;
  const [version, spreadBps, validUntil] = decodeAbiParameters(SPREAD, value);
  if (version !== 1 || now > validUntil) return null;
  return spreadBps;
}

async function readName(client: PublicClient, fullName: string): Promise<EnsNameView> {
  const labels = fullName.split(".");
  const block = await client.getBlock();
  let registry: Address = ETH_REGISTRY;
  let leafExpiry = 0n;
  let leafRegistry: Address = ETH_REGISTRY;
  let leafLabel = "";
  let expiryOk = true;

  for (let i = labels.length - 2; i >= 0; i--) {
    const label = labels[i] ?? "";
    const expiry = await client.readContract({
      address: registry,
      abi: registryAbi,
      functionName: "findExpiry",
      args: [label],
    });
    if (expiry <= block.timestamp) expiryOk = false;
    leafExpiry = expiry;
    leafRegistry = registry;
    leafLabel = label;
    if (i > 0) {
      const next = await client.readContract({
        address: registry,
        abi: registryAbi,
        functionName: "getSubregistry",
        args: [label],
      });
      if (next === zeroAddress) {
        expiryOk = false;
        break;
      }
      registry = next;
    }
  }

  const [resolver, expected] = await Promise.all([
    client.readContract({
      address: leafRegistry,
      abi: registryAbi,
      functionName: "getResolver",
      args: [leafLabel],
    }),
    client.readContract({
      address: ETH_REGISTRY,
      abi: registryAbi,
      functionName: "getResolver",
      args: [DESK_LABEL],
    }),
  ]);

  const resolverOk = resolver !== zeroAddress && resolver.toLowerCase() === expected.toLowerCase();
  let addr: Address = zeroAddress;
  let tierBps: number | null = null;
  let cap: bigint | null = null;
  let spreadBps: number | null = null;

  if (resolver !== zeroAddress) {
    const node = namehash(fullName);
    const calls = [
      encodeFunctionData({ abi: profileAbi, functionName: "addr", args: [node] }),
      encodeFunctionData({ abi: profileAbi, functionName: "data", args: [node, "desk.terms"] }),
      encodeFunctionData({ abi: profileAbi, functionName: "data", args: [node, "desk.spread"] }),
    ];
    const raw = await client.readContract({
      address: resolver,
      abi: resolverAbi,
      functionName: "resolve",
      args: [dnsEncode(fullName), encodeFunctionData({ abi: profileAbi, functionName: "multicall", args: [calls] })],
    });
    const [results] = decodeAbiParameters([{ type: "bytes[]" }], raw);
    const [decodedAddr] = decodeAbiParameters([{ type: "address" }], results[0] as Hex);
    const [termsRaw] = decodeAbiParameters([{ type: "bytes" }], results[1] as Hex);
    const [spreadRaw] = decodeAbiParameters([{ type: "bytes" }], results[2] as Hex);
    addr = decodedAddr;
    const terms = decodeTerms(termsRaw);
    if (terms) {
      tierBps = terms.tierBps;
      cap = terms.cap;
    }
    spreadBps = decodeSpread(spreadRaw, block.timestamp);
  }

  const status = !expiryOk
    ? "expired"
    : !resolverOk
      ? "wrong-resolver"
      : addr === zeroAddress
        ? "no-addr"
        : tierBps === null
          ? "no-terms"
          : "ok";

  return { name: fullName, addr, expiry: leafExpiry, expiryOk, resolverOk, tierBps, cap, spreadBps, status };
}

export async function readEnsDesk(client: PublicClient): Promise<{ clients: EnsNameView[]; agent: EnsNameView }> {
  const [clients, agent] = await Promise.all([
    Promise.all(CLIENT_NAMES.map((name) => readName(client, name))),
    readName(client, AGENT_ENS_NAME),
  ]);
  return { clients, agent };
}
