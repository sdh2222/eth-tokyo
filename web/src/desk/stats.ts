import { createPublicClient, decodeFunctionResult, encodeFunctionData, http, namehash, type Hex } from "viem";
import { sepolia } from "viem/chains";
import type { AgentWrite } from "./book";

// The agent's last write per client name, read from ENS desk.stats (the JSON the agent
// writes after each fill: {version, sellBps, buyBps, validUntil, writtenAt, note?}). Used in
// live mode when the keeper's index (GET /v1/agent) is not running.

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

const textAbi = [
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ type: "string" }],
  },
] as const;

function dnsEncode(name: string): Hex {
  const parts: number[] = [];
  for (const label of name.split(".")) {
    const bytes = new TextEncoder().encode(label);
    parts.push(bytes.length, ...bytes);
  }
  parts.push(0);
  return `0x${parts.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

type StatsJson = { sellBps?: number; buyBps?: number; validUntil?: number; writtenAt?: number; note?: string };

export async function readEnsWrites(rpc: string, resolver: Hex, names: readonly string[]): Promise<AgentWrite[]> {
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const writes = await Promise.all(
    names.map(async (name): Promise<AgentWrite | null> => {
      try {
        const raw = await client.readContract({
          address: resolver,
          abi: resolverAbi,
          functionName: "resolve",
          args: [dnsEncode(name), encodeFunctionData({ abi: textAbi, functionName: "text", args: [namehash(name), "desk.stats"] })],
        });
        const text = decodeFunctionResult({ abi: textAbi, functionName: "text", data: raw });
        if (!text) return null;
        const json = JSON.parse(text) as StatsJson;
        if (typeof json.sellBps !== "number" || typeof json.buyBps !== "number") return null;
        return {
          name,
          sellBps: json.sellBps,
          buyBps: json.buyBps,
          validUntil: Number(json.validUntil ?? 0),
          writtenAt: Number(json.writtenAt ?? 0),
          ...(json.note ? { note: json.note } : {}),
        };
      } catch {
        return null;
      }
    }),
  );
  return writes.filter((write): write is AgentWrite => write !== null);
}
