import { decodeAbiParameters, encodeFunctionData, namehash, zeroAddress } from "viem";

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
];

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
];

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
];

const TERMS = [{ type: "uint8" }, { type: "uint16" }, { type: "uint128" }];
const SPREAD = [{ type: "uint8" }, { type: "uint16" }, { type: "uint64" }];
const RECORD_BYTES = 96;

function dnsEncode(name) {
  const parts = [];
  for (const label of name.split(".")) {
    const bytes = new TextEncoder().encode(label);
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

function decodeRecord(value, kind) {
  if ((value.length - 2) / 2 !== RECORD_BYTES) return null;
  if (kind === "terms") {
    const [version, tierBps, cap] = decodeAbiParameters(TERMS, value);
    if (version !== 1 || cap === 0n) return null;
    return { tierBps, cap };
  }
  const [version, spreadBps, validUntil] = decodeAbiParameters(SPREAD, value);
  if (version !== 1) return null;
  return { spreadBps, validUntil };
}

export function clientNames(config) {
  const suffix = config.ens?.suffix ?? "";
  const listed = (config.mms ?? []).map((mm) => mm.name).filter(Boolean);
  const expiredDemo = suffix ? [`mm-c.${suffix}`] : [];
  return [...new Set([...listed, ...expiredDemo])];
}

async function readName(client, ethRegistry, fullName) {
  const labels = fullName.split(".");
  const block = await client.getBlock();
  let registry = ethRegistry;
  let leafExpiry = 0n;
  let leafRegistry = ethRegistry;
  let leafLabel = "";

  for (let i = labels.length - 2; i >= 0; i--) {
    const label = labels[i];
    const expiry = await client.readContract({
      address: registry,
      abi: registryAbi,
      functionName: "findExpiry",
      args: [label],
    });
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
      if (next === zeroAddress) break;
      registry = next;
    }
  }

  const resolver = await client.readContract({
    address: leafRegistry,
    abi: registryAbi,
    functionName: "getResolver",
    args: [leafLabel],
  });

  let address = zeroAddress;
  let tierBps = null;
  let cap = null;
  let spreadBps = null;
  let spreadUntil = null;
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
    const [decodedAddr] = decodeAbiParameters([{ type: "address" }], results[0]);
    const [termsRaw] = decodeAbiParameters([{ type: "bytes" }], results[1]);
    const [spreadRaw] = decodeAbiParameters([{ type: "bytes" }], results[2]);
    address = decodedAddr;
    const terms = decodeRecord(termsRaw, "terms");
    if (terms) {
      tierBps = terms.tierBps;
      cap = terms.cap.toString();
    }
    const spread = decodeRecord(spreadRaw, "spread");
    if (spread && block.timestamp <= spread.validUntil) {
      spreadBps = spread.spreadBps;
      spreadUntil = Number(spread.validUntil);
    }
  }

  return {
    type: "terms",
    name: fullName,
    address,
    expiry: Number(leafExpiry),
    tierBps,
    cap,
    spreadBps,
    spreadUntil,
  };
}

export async function readTerms(client, config) {
  const ethRegistry = config.ens?.ethRegistry;
  if (!ethRegistry) return [];
  const names = clientNames(config);
  const rows = [];
  for (const name of names) {
    rows.push(await readName(client, ethRegistry, name));
  }
  return rows;
}
