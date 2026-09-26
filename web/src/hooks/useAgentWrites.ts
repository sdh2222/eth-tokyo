import { useQuery } from "@tanstack/react-query";
import sepoliaConfig from "@config";
import { fixtureWrites, type AgentWrite } from "../desk/book";
import { NOW } from "../desk/fixture/state";
import { readEnsWrites } from "../desk/stats";
import type { DeskConfig } from "../desk/types";

const live = import.meta.env.VITE_DESK_MODE === "live";
const RPC = import.meta.env.VITE_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
// The keeper's index (pnpm -C ts api). Local only; when it is not running, ENS desk.stats.
const API = import.meta.env.VITE_DESK_API_URL ?? "http://127.0.0.1:8787";

type StoredSpread = {
  name: string;
  sellBps: number;
  buyBps: number;
  validUntil: string;
  writtenAt: string;
  fillTx: string;
  tier: string;
  note: string;
};

export type AgentWrites = { writes: AgentWrite[]; source: "index" | "ens" | "fixture" };

async function readIndex(): Promise<AgentWrite[] | null> {
  try {
    const res = await fetch(`${API}/v1/agent`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const body = (await res.json()) as { indexedSpreads?: StoredSpread[] };
    return (body.indexedSpreads ?? []).map((row) => ({
      name: row.name,
      sellBps: row.sellBps,
      buyBps: row.buyBps,
      validUntil: Number(row.validUntil),
      writtenAt: Number(row.writtenAt),
      ...(row.fillTx ? { fillTx: row.fillTx } : {}),
      ...(row.tier ? { tier: row.tier } : {}),
      ...(row.note ? { note: row.note } : {}),
    }));
  } catch {
    return null;
  }
}

// The agent's last write per client name. Live: the keeper's index when it runs, else
// desk.stats on ENS. Fixture: one write per name.
export function useAgentWrites() {
  return useQuery<AgentWrites>({
    queryKey: ["agent-writes", live ? "live" : "fixture"],
    queryFn: async () => {
      if (!live) return { writes: fixtureWrites(NOW), source: "fixture" };
      const indexed = await readIndex();
      if (indexed) return { writes: indexed, source: "index" };
      const cfg = sepoliaConfig as DeskConfig & { mms?: { name: string }[]; ens: { resolver: `0x${string}` } };
      const names = (cfg.mms ?? []).map((mm) => mm.name);
      return { writes: await readEnsWrites(RPC, cfg.ens.resolver, names), source: "ens" };
    },
    refetchInterval: live ? 15_000 : false,
  });
}

export function writeFor(writes: AgentWrites | undefined, name: string): AgentWrite | undefined {
  return writes?.writes.find((write) => write.name.toLowerCase() === name.toLowerCase());
}
