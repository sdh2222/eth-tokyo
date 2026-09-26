import { Link } from "react-router-dom";
import { Skeleton } from "../components/Skeleton";
import { StatTile } from "../components/StatTile";
import {
  COMPARE_10,
  COMPARE_25,
  COMPARE_2PCT,
  HERO_SUB,
  HERO_TITLE,
  HOW_IT_WORKS,
  NOT_OPEN,
  OPEN_DEMO,
  PROBLEM,
  SEPOLIA_MICRO,
  STEPS,
  STRIP,
  VERIFY_LINE,
} from "../copy/en";
import { NOW } from "../desk/fixture/state";
import { useDeskState, useFills, useLiveStrategy } from "../hooks/useDesk";
import { useOracleRound } from "../hooks/useOracle";
import { formatShare, formatUsd } from "../lib/format";

const STEP_COLOR = ["bg-surface", "bg-surface", "bg-surface"] as const;

export function LandingPage() {
  const live = useLiveStrategy();
  const oracle = useOracleRound();
  const strategy = live.data ?? null;
  const state = useDeskState(strategy);
  const fills = useFills(strategy);
  const failed = live.isError || state.isError || fills.isError;
  const loading = live.isPending || (strategy !== null && (state.isPending || fills.isPending));
  const desk = state.data;
  const now = import.meta.env.VITE_DESK_MODE === "live" ? Math.floor(Date.now() / 1000) : NOW;

  let status = NOT_OPEN;
  let share = NOT_OPEN;
  let mid = NOT_OPEN;
  let fillsToday = NOT_OPEN;
  if (!loading && !failed && strategy && desk) {
    status = strategy.live ? "Live" : "Stopped";
    share = formatShare(desk.wWad);
    mid = formatUsd(oracle.data?.midWad ?? desk.pWad);
    const day = jstDay(now);
    fillsToday = String((fills.data ?? []).filter((fill) => jstDay(fill.blockTime) === day).length);
  } else if (!loading) {
    status = failed ? "—" : NOT_OPEN;
    share = "—";
    mid = oracle.data ? formatUsd(oracle.data.midWad) : "—";
    fillsToday = "—";
  }

  return (
    <div className="flex flex-col gap-7">
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <p className="text-micro text-muted">{SEPOLIA_MICRO}</p>
          <h1 className="text-display font-semibold">{HERO_TITLE}</h1>
          <p className="text-h3">{HERO_SUB}</p>
          <div className="flex items-center gap-5">
            <Link className="rounded-control bg-focus px-4 py-3 text-body font-medium text-onfocus" to="/desk">
              {OPEN_DEMO}
            </Link>
            <a className="text-body" href="#how">
              {HOW_IT_WORKS}
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-5">
          {loading ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : (
            <>
              <StatTile label={STRIP.status} value={status} />
              <StatTile label={STRIP.share} value={share} />
              <StatTile label={STRIP.mid} value={mid} />
              <StatTile label={STRIP.fills} value={fillsToday} />
            </>
          )}
        </div>
      </section>
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatTile label="2%" value={COMPARE_2PCT} />
        <StatTile label="10 bps" value={COMPARE_10} />
        <StatTile label="25 bps" value={COMPARE_25} />
      </section>
      <section className="rounded-card bg-surface p-5">
        {PROBLEM.map((line, index) => (
          <p key={line} className={index === 1 ? "text-body font-semibold" : "text-body"}>
            {line}
          </p>
        ))}
      </section>
      <section id="how" className="flex flex-col gap-5">
        {STEPS.map((line, index) => (
          <div key={line} className="flex items-start gap-4">
            <span className={`flex h-8 w-8 items-center justify-center rounded-pill text-body text-onfocus ${STEP_COLOR[index]}`}>
              {index + 1}
            </span>
            <p className="text-body">{line}</p>
          </div>
        ))}
      </section>
      <p className="text-body">
        <Link to="/fills">{VERIFY_LINE}</Link>
      </p>
    </div>
  );
}

function jstDay(unix: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(unix * 1000),
  );
}
