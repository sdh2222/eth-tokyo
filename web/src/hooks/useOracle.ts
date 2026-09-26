import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import sepoliaConfig from "@config";
import type { Address, DeskConfig } from "../desk/types";
import { useBlock } from "./useDesk";

const mode = import.meta.env.VITE_DESK_MODE === "live" ? "live" : "fixture";

const latestRoundData = {
  type: "function",
  name: "latestRoundData",
  stateMutability: "view",
  inputs: [],
  outputs: [
    { type: "uint80" },
    { name: "answer", type: "int256" },
    { type: "uint256" },
    { name: "updatedAt", type: "uint256" },
    { type: "uint80" },
  ],
} as const;

function filled(address: string | undefined): address is Address {
  return typeof address === "string" && /^0x[0-9a-fA-F]{40}$/.test(address) && !/^0x0{40}$/i.test(address);
}

export type OracleRound = {
  answer: bigint;
  midWad: bigint;
  updatedAt: number;
  stale: boolean;
};

export function useOracleRound() {
  const client = usePublicClient();
  const { block } = useBlock();
  const cfg = sepoliaConfig as DeskConfig;
  const oracle = cfg.oracle;
  const ready = mode === "live" && filled(oracle);

  return useQuery({
    queryKey: ["oracle", oracle, block?.toString()],
    enabled: ready && client !== undefined,
    queryFn: async (): Promise<OracleRound> => {
      if (!client || !filled(oracle)) throw new Error("oracle unset");
      const round = await client.readContract({
        address: oracle,
        abi: [latestRoundData],
        functionName: "latestRoundData",
      });
      const answer = round[1];
      const updatedAt = Number(round[3]);
      const now = Math.floor(Date.now() / 1000);
      const scale = 18 - cfg.desk.oracleDecimals;
      const limit = cfg.desk.maxStaleness ?? (cfg.desk.maxBlocks ?? 3) * 12;
      return {
        answer,
        midWad: answer * 10n ** BigInt(scale),
        updatedAt,
        stale: now - updatedAt > limit,
      };
    },
  });
}
