import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useBlockNumber, usePublicClient } from "wagmi";
import sepoliaConfig from "@config";
import { fetchApiDesk } from "../desk/api";
import { createPort } from "../desk/createPort";
import { fixtureBlock } from "../desk/fixture";
import { emptyConfig, FIXTURE_MMS, FIXTURE_OWNERS } from "../desk/fixture/state";
import type { DeskConfig, DeskError, DeskPort, StrategyInfo } from "../desk/port";
import { ERRORS } from "../copy/errors";

const mode = import.meta.env.VITE_DESK_MODE === "live" ? "live" : "fixture";
const which = import.meta.env.VITE_FIXTURE === "demo" ? "demo" : "qa";
const port: DeskPort = createPort();

export function useDeskPort(): DeskPort {
  return port;
}

function deskConfig(): DeskConfig {
  const parsed = sepoliaConfig as DeskConfig;
  if (mode === "live") return parsed;
  const base = emptyConfig();
  return {
    ...parsed,
    ...base,
    desk: parsed.desk,
    ens: { ...base.ens, suffix: parsed.ens.suffix },
    explorer: parsed.explorer,
    owners: FIXTURE_OWNERS,
    mms: FIXTURE_MMS,
  };
}

export function useBlock(): { block?: bigint; error?: DeskError } {
  const watched = useBlockNumber({ watch: true, query: { enabled: mode === "live" } });
  const [fixture, setFixture] = useState<bigint>(fixtureBlock(which));

  useEffect(() => {
    if (mode === "live") return;
    const timer = window.setInterval(() => setFixture(fixtureBlock(which)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (mode === "live") {
    return watched.data !== undefined ? { block: watched.data } : {};
  }
  return { block: fixture };
}

export function useLiveStrategy() {
  const desk = useDeskPort();
  const client = usePublicClient();
  const { block } = useBlock();
  const cfg = deskConfig();
  const api = useQuery({
    queryKey: ["v1", "desk"],
    queryFn: fetchApiDesk,
    enabled: mode === "live",
    refetchInterval: 15_000,
  });
  const chain = useQuery({
    queryKey: ["live", block?.toString()],
    queryFn: () => {
      if (mode === "live" && cfg.safe === "") {
        const copy = ERRORS.UNKNOWN;
        const error: DeskError = {
          code: "NO_CONFIG",
          args: {},
          title: copy?.title ?? "Something went wrong",
          hint: copy?.hint ?? "",
          severity: "config",
        };
        throw error;
      }
      return desk.findLiveStrategy({ client, cfg });
    },
    enabled: mode !== "live" && block !== undefined,
  });
  if (mode === "live") {
    return { ...api, data: api.data?.strategy ?? null };
  }
  return chain;
}

export function useDeskState(strategy: StrategyInfo | null) {
  const desk = useDeskPort();
  const client = usePublicClient();
  const { block } = useBlock();
  const cfg = deskConfig();
  const api = useQuery({
    queryKey: ["v1", "desk"],
    queryFn: fetchApiDesk,
    enabled: mode === "live",
    refetchInterval: 15_000,
  });
  const chain = useQuery({
    queryKey: ["state", strategy?.strategyHash, block?.toString()],
    queryFn: () => {
      if (!strategy) throw new Error("strategy missing");
      return desk.readDeskState({ client, cfg }, strategy);
    },
    enabled: mode !== "live" && strategy !== null && block !== undefined,
  });
  if (mode === "live") return { ...api, data: api.data?.state ?? undefined };
  return chain;
}

// Fills come from the router's DeskFill logs in both modes. The Render API's indexer still
// decodes the old DeskFill signature, so live mode reads the chain directly (every block).
// Fills for the desk. The key moves with each block, so the last list is kept while the next
// one loads. isLoading is true until a read has come back (the first block, the strategy
// or the request itself may still be on its way), so pages don't paint "No fills yet" early.
export function useFills(strategy: StrategyInfo | null, strategyLoading = false) {
  const desk = useDeskPort();
  const client = usePublicClient();
  const { block } = useBlock();
  const cfg = deskConfig();
  const query = useQuery({
    queryKey: ["fills", mode, strategy?.strategyHash, block?.toString()],
    queryFn: () => desk.readFills({ client, cfg }, mode === "live" ? undefined : (strategy ?? undefined)),
    enabled: block !== undefined && (mode === "live" || strategy !== null),
    placeholderData: keepPreviousData,
  });
  const waiting = query.data === undefined && !query.isError && (mode === "live" || strategy !== null || strategyLoading);
  return { ...query, isLoading: waiting };
}
