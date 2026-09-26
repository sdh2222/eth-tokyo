import { EmptyState } from "../components/EmptyState";
import { FillTable } from "../components/FillTable";
import { QuoteBoard } from "../components/QuoteBoard";
import { ShareBar } from "../components/ShareBar";
import { Skeleton } from "../components/Skeleton";
import { StatusBadge, type StatusKind } from "../components/StatusBadge";
import { CLOSES_IN, UPDATED } from "../copy/en";
import { NOW } from "../desk/fixture/state";
import { useRole } from "../app/role";
import { useCanAct } from "../hooks/useCanAct";
import { useDeskState, useFills, useLiveStrategy } from "../hooks/useDesk";
import { useOracleRound } from "../hooks/useOracle";
import { ERRORS } from "../copy/errors";
import { useNavigate } from "react-router-dom";
import { formatHash, formatShare, formatUsd, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";

const WAD = 10n ** 18n;

export function DeskPage() {
  const live = useLiveStrategy();
  const oracle = useOracleRound();
  const strategy = live.data ?? null;
  const state = useDeskState(strategy);
  const fills = useFills(strategy);
  const { isOwner } = useCanAct();
  const [role] = useRole();
  const navigate = useNavigate();

  if (live.isPending || (strategy !== null && state.isPending)) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (live.isError || state.isError) {
    const error = live.error ?? state.error;
    const title =
      error && typeof error === "object" && "title" in error && typeof error.title === "string"
        ? error.title
        : ERRORS.UNKNOWN?.title ?? "Something went wrong";
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body">{title}</p>
        <button
          type="button"
          className="text-body"
          onClick={() => {
            void live.refetch();
            void state.refetch();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const desk = state.data;
  const liveMode = import.meta.env.VITE_DESK_MODE === "live";

  if (!strategy || !desk) {
    if (liveMode) {
      return (
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-2">
            <h1 className="text-h1">Desk</h1>
            <p className="max-w-3xl text-body text-muted">
              The treasury is selling from this vault. Each named market maker gets a different price. Tokens stay in the Safe until a fill.
            </p>
          </header>
          <StatusBadge kind="NotOpen" />
          <section className="flex flex-col gap-3">
            <h2 className="text-h3">In the vault</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <article className="rounded-card border border-border bg-surface p-5">
                <p className="text-small text-muted">Oracle mid</p>
                <p className="num text-h3">{oracle.data ? formatUsd(oracle.data.midWad) : "—"}</p>
                {oracle.data ? (
                  <p className={`text-small ${oracle.data.stale ? "text-danger" : "text-muted"}`}>
                    {UPDATED} {formatWhen(oracle.data.updatedAt, Math.floor(Date.now() / 1000))}
                    {oracle.data.stale ? " · stale" : ""}
                  </p>
                ) : null}
              </article>
              <article className="rounded-card border border-border bg-surface p-5">
                <p className="text-small text-muted">ETH</p>
                <p className="num text-h3">—</p>
              </article>
              <article className="rounded-card border border-border bg-surface p-5">
                <p className="text-small text-muted">USDC</p>
                <p className="num text-h3">—</p>
              </article>
              <article className="rounded-card border border-border bg-surface p-5 sm:col-span-2 lg:col-span-2">
                <p className="text-small text-muted">ETH share</p>
                <p className="num text-h3">—</p>
              </article>
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-h3">Price for each market maker</h2>
            <p className="num text-body">—</p>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-h3">Recent fills</h2>
            <p className="text-body">—</p>
          </section>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-5">
        <StatusBadge kind="NotOpen" />
        <EmptyState
          sentence="No desk is open"
          {...(role === "treasury" && isOwner
            ? { action: { label: "Open a desk", onClick: () => navigate("/open") } }
            : {})}
        />
      </div>
    );
  }

  const now = import.meta.env.VITE_DESK_MODE === "live" ? Math.floor(Date.now() / 1000) : NOW;
  const midWad = liveMode ? desk?.pWad : (oracle.data?.midWad ?? desk?.pWad);
  const updatedAt = liveMode ? desk?.oracleUpdatedAt : (oracle.data?.updatedAt ?? desk?.oracleUpdatedAt);
  const oracleStale = liveMode ? (desk?.oracleStale ?? false) : (oracle.data?.stale ?? desk?.oracleStale ?? false);
  const kind: StatusKind = oracleStale
    ? "Stale"
    : strategy?.live
      ? "Live"
      : strategy
        ? "Stopped"
        : "NotOpen";
  const age = updatedAt !== undefined ? now - updatedAt : 0;
  const aged = desk ? age > desk.maxStaleness / 2 : false;
  const updatedClass = oracleStale ? "text-danger" : aged ? "text-warning" : "text-muted";

  const targetPct = desk ? (desk.targetWad * 100n) / WAD : 0n;
  const shareCaption = desk
    ? `${formatShare(desk.wWad)} ETH · target ${targetPct}%`
    : "";

  return (
    <div className="flex flex-col gap-8">
    <header className="flex flex-col gap-2">
      <h1 className="text-h1">Desk</h1>
      <p className="max-w-3xl text-body text-muted">
        The treasury is selling from this vault. Each named market maker gets a different price. Tokens stay in the Safe until a fill.
      </p>
    </header>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <StatusBadge kind={kind} />
        {midWad !== undefined ? (
          <p>
            <span className="block text-small text-muted">Oracle mid</span>
            <span className="num text-h2">{formatUsd(midWad)}</span>
          </p>
        ) : null}
        {updatedAt !== undefined ? (
          <span className={`text-small ${updatedClass}`}>
            {UPDATED} {formatWhen(updatedAt, now)}
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
            <span className="block text-muted">Program</span>
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
      <section className="flex flex-col gap-3">
        <h2 className="text-h3">In the vault</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <article className="rounded-card border border-border bg-surface p-5">
          <p className="text-small text-muted">ETH</p>
          <p className="num text-h3">{formatWeth(desk.balances.weth)}</p>
        </article>
        <article className="rounded-card border border-border bg-surface p-5">
          <p className="text-small text-muted">USDC</p>
          <p className="num text-h3">{formatUsdc(desk.balances.usdc)}</p>
        </article>
        <article className="rounded-card border border-border bg-surface p-5 sm:col-span-2 lg:col-span-3">
          <ShareBar shareWad={desk.wWad} targetWad={desk.targetWad} caption={shareCaption} />
          <p className="mt-3 text-body">
            In the Safe: {formatWeth(desk.safeWallet.weth)} · {formatUsdc(desk.safeWallet.usdc)}
          </p>
        </article>
      </div>
      </section>
    ) : null}
    {desk ? (
      <section className="flex flex-col gap-3">
        <h2 className="text-h3">Price for each market maker</h2>
        <QuoteBoard mms={desk.mms} now={now} />
      </section>
    ) : null}
    {desk ? (
      <section className="flex flex-col gap-3">
        <h2 className="text-h3">Recent fills</h2>
        <div className="overflow-x-auto rounded-card border border-border px-5">
          <FillTable fills={fills.data ?? []} weth="" midWad={desk.pWad} now={now} />
        </div>
      </section>
    ) : null}
    </div>
  );
}
