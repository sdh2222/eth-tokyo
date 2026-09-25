import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useBlockNumber, usePublicClient } from "wagmi";
import sepoliaConfig from "@config";
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

  return useQuery({
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
    enabled: block !== undefined,
    refetchInterval: mode === "live" ? 60_000 : false,
  });
}

export function useDeskState(strategy: StrategyInfo | null) {
  const desk = useDeskPort();
  const client = usePublicClient();
  const { block } = useBlock();
  const cfg = deskConfig();

  return useQuery({
    queryKey: ["state", strategy?.strategyHash, block?.toString()],
    queryFn: () => {
      if (!strategy) throw new Error("strategy missing");
      return desk.readDeskState({ client, cfg }, strategy);
    },
    enabled: strategy !== null && block !== undefined,
  });
}

export function useFills(strategy: StrategyInfo | null) {
  const desk = useDeskPort();
  const client = usePublicClient();
  const { block } = useBlock();
  const cfg = deskConfig();

  return useQuery({
    queryKey: ["fills", strategy?.strategyHash, block?.toString()],
    queryFn: () => desk.readFills({ client, cfg }, strategy ?? undefined),
    enabled: strategy !== null && block !== undefined,
  });
}
