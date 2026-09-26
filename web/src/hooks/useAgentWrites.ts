import { useQuery } from "@tanstack/react-query";
import sepoliaConfig from "@config";
import { fixtureWrites, type AgentWrite } from "../desk/book";
import { NOW } from "../desk/fixture/state";
import { readEnsWrites } from "../desk/stats";
import type { DeskConfig } from "../desk/types";

const live = import.meta.env.VITE_DESK_MODE === "live";
const RPC = import.meta.env.VITE_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
export type AgentWrites = { writes: AgentWrite[]; source: "ens" | "fixture" };

// The agent's last write per client name. Live: what the keeper wrote to ENS (desk.stats, with
// the widths it also wrote to desk.spread), read from the chain, so a public build shows the
// keeper's numbers without any local index. Fixture: one write per name.
export function useAgentWrites() {
  return useQuery<AgentWrites>({
    queryKey: ["agent-writes", live ? "live" : "fixture"],
    queryFn: async () => {
      if (!live) return { writes: fixtureWrites(NOW), source: "fixture" };
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
