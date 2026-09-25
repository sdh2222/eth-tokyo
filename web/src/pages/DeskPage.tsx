import { ShareBar } from "../components/ShareBar";
import { Skeleton } from "../components/Skeleton";
import { StatusBadge, type StatusKind } from "../components/StatusBadge";
import { CLOSES_IN, UPDATED } from "../copy/en";
import { emptyConfig, NOW } from "../desk/fixture/state";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatShare, formatSkewBps, formatUsd, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";

const WAD = 10n ** 18n;

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

  const targetPct = desk ? (desk.targetWad * 100n) / WAD : 0n;
  const shareCaption = desk
    ? `${formatShare(desk.wWad)} ETH · target ${targetPct}% · skew ${formatSkewBps(emptyConfig().desk.kappaBps, desk.wWad, desk.targetWad)}`
    : "";

  return (
    <div className="flex flex-col gap-6">
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
    {desk ? (
      <section className="grid grid-cols-5 gap-5">
        <article className="rounded-card bg-surface p-5">
          <p className="text-small text-muted">In the desk</p>
          <p className="num text-h3">{formatWeth(desk.balances.weth)}</p>
        </article>
        <article className="rounded-card bg-surface p-5">
          <p className="text-small text-muted">In the desk</p>
          <p className="num text-h3">{formatUsdc(desk.balances.usdc)}</p>
        </article>
        <article className="col-span-3 rounded-card bg-surface p-5">
          <ShareBar shareWad={desk.wWad} targetWad={desk.targetWad} caption={shareCaption} />
          <p className="mt-3 text-body">
            In the Safe: {formatWeth(desk.safeWallet.weth)} · {formatUsdc(desk.safeWallet.usdc)}
          </p>
        </article>
      </section>
    ) : null}
    </div>
  );
}
