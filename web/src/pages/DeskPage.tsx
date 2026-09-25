import { Skeleton } from "../components/Skeleton";
import { StatusBadge, type StatusKind } from "../components/StatusBadge";
import { CLOSES_IN, UPDATED } from "../copy/en";
import { NOW } from "../desk/fixture/state";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatUsd } from "../lib/format";
import { formatWhen } from "../lib/time";

export function DeskPage() {
  const live = useLiveStrategy();
  const strategy = live.data ?? null;
  const state = useDeskState(strategy);

  if (live.isPending || (strategy !== null && state.isPending)) {
    return <Skeleton className="h-8 w-full" />;
  }

  const desk = state.data;
  const now = import.meta.env.VITE_DESK_MODE === "live" ? Math.floor(Date.now() / 1000) : NOW;
  const kind: StatusKind = desk?.oracleStale
    ? "Stale"
    : strategy?.live
      ? "Live"
      : strategy
        ? "Stopped"
        : "NotOpen";
  const age = desk ? now - desk.oracleUpdatedAt : 0;
  const aged = desk ? age > desk.maxStaleness / 2 : false;
  const updatedClass = desk?.oracleStale ? "text-danger" : aged ? "text-warning" : "text-muted";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <StatusBadge kind={kind} />
        {desk ? <span className="num text-h2">{formatUsd(desk.pWad)}</span> : null}
        {desk ? (
          <span className={`text-small ${updatedClass}`}>
            {UPDATED} {formatWhen(desk.oracleUpdatedAt, now)}
          </span>
        ) : null}
      </div>
      <div className="text-right text-small text-muted">
        {strategy ? (
          <button
            type="button"
            className="num text-small"
            onClick={() => {
              void navigator.clipboard.writeText(strategy.strategyHash);
            }}
          >
            {formatHash(strategy.strategyHash)}
          </button>
        ) : null}
        {strategy?.live && desk ? (
          <p>
            {CLOSES_IN} {formatWhen(desk.deadline, now)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
