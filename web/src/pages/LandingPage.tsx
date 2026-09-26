import { Link } from "react-router-dom";
import { Skeleton } from "../components/Skeleton";
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
    <div className="landing">
      <section className="landing-hero">
        <p className="landing-kicker">{SEPOLIA_MICRO}</p>
        <h1 className="landing-title">{HERO_TITLE}</h1>
        <p className="landing-sub">{HERO_SUB}</p>
        <div className="landing-actions">
          <Link className="landing-go" to="/desk">
            {OPEN_DEMO}
          </Link>
          <a className="landing-link" href="#how">
            {HOW_IT_WORKS}
          </a>
        </div>
        <div className="term">
          <div className="term-bar">Sepolia · Desk</div>
          <div className="term-body">
            {loading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <p>
                  <span>{STRIP.status}</span>
                  <span className="num">{status}</span>
                </p>
                <p>
                  <span>{STRIP.share}</span>
                  <span className="num">{share}</span>
                </p>
                <p>
                  <span>{STRIP.mid}</span>
                  <span className="num">{mid}</span>
                </p>
                <p>
                  <span>{STRIP.fills}</span>
                  <span className="num">{fillsToday}</span>
                </p>
              </>
            )}
          </div>
        </div>
      </section>
      <section className="landing-rest">
        <div className="landing-compare">
          <p>
            <span>2%</span>
            <span className="num">{COMPARE_2PCT}</span>
          </p>
          <p>
            <span>10 bps</span>
            <span className="num">{COMPARE_10}</span>
          </p>
          <p>
            <span>25 bps</span>
            <span className="num">{COMPARE_25}</span>
          </p>
        </div>
        <div className="landing-rule">
          {PROBLEM.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <section id="how" className="landing-steps">
          {STEPS.map((line, index) => (
            <p key={line}>
              <span className="num">{index + 1}</span>
              {line}
            </p>
          ))}
        </section>
        <p>
          <Link className="landing-link" to="/fills">
            {VERIFY_LINE}
          </Link>
        </p>
      </section>
    </div>
  );
}

function jstDay(unix: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(unix * 1000),
  );
}
