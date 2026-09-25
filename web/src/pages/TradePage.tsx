import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { WalletTxOverlay } from "../overlays/WalletTxOverlay";
import { AmountInput } from "../components/AmountInput";
import { Countdown } from "../components/Countdown";
import { Skeleton } from "../components/Skeleton";
import { SourceBadge } from "../components/SourceBadge";
import {
  APPROVE_ROUTER,
  BUY_ETH,
  FILL,
  CHECKED,
  ENTER_AMOUNT,
  NOT_ON_LIST,
  PER_FILL,
  REFRESH_QUOTE,
  SELL_ETH,
  SLIPPAGE,
  TOO_MANY_DECIMALS,
  TRADING_AS,
  YOU_PAY,
  YOU_RECEIVE,
} from "../copy/en";
import { emptyConfig } from "../desk/fixture/state";
import { useDeskPort, useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { useQuote } from "../hooks/useQuote";
import { formatBps, formatPrice, formatUsdc, formatWeth } from "../lib/format";
import { formatVsMidBps } from "../lib/format";

type Side = "buy" | "sell";
type Unit = "ETH" | "USDC";

export function parseAmount(text: string, decimals: number): { ok: true; value: bigint } | { ok: false; reason: "empty" | "decimals" } {
  if (text === "" || text === ".") return { ok: false, reason: "empty" };
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, reason: "decimals" };
  const [whole, frac = ""] = text.split(".");
  if (frac.length > decimals) return { ok: false, reason: "decimals" };
  const digits = `${whole}${frac.padEnd(decimals, "0")}`;
  return { ok: true, value: BigInt(digits) };
}

function bpsOf(text: string): number {
  let value = 0;
  for (const char of text) value = value * 10 + (char.charCodeAt(0) - 48);
  return value;
}

export function legFor(side: Side, unit: Unit): { leg: "weth" | "usdc"; exact: "exactIn" | "exactOut" } {
  if (side === "buy" && unit === "ETH") return { leg: "weth", exact: "exactOut" };
  if (side === "buy" && unit === "USDC") return { leg: "usdc", exact: "exactIn" };
  if (side === "sell" && unit === "ETH") return { leg: "weth", exact: "exactIn" };
  return { leg: "usdc", exact: "exactOut" };
}

export function TradePage() {
  const { address } = useAccount();
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  const [side, setSide] = useState<Side>("buy");
  const [unit, setUnit] = useState<Unit>("ETH");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("10");
  const mm = state.data?.mms.find((item) => address && item.address.toLowerCase() === address.toLowerCase());
  const named = mm && (mm.status === "ok" || mm.terms);
  const parsed = parseAmount(amount, unit === "ETH" ? 18 : 6);
  const route = legFor(side, unit);
  const port = useDeskPort();
  const client = usePublicClient();
  const [overlay, setOverlay] = useState<"approve" | "fill" | null>(null);
  const approvals = useQuery({
    queryKey: ["approvals", address],
    queryFn: () => port.planMmApprovals({ client, cfg: emptyConfig() }, address as `0x${string}`),
    enabled: address !== undefined,
  });
  const quote = useQuote({
    strategy: live.data ?? null,
    mm: (address as `0x${string}` | undefined) ?? "0x0000000000000000000000000000000000000009",
    side,
    leg: route.leg,
    amount: parsed.ok ? parsed.value : null,
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-h1">Trade</h1>
      {named && mm?.terms ? (
        <p className="text-body">
          {TRADING_AS} {mm.name} · tier {formatBps(mm.terms.tierBps)} · cap {formatUsdc(mm.terms.cap)} {PER_FILL}
        </p>
      ) : (
        <p className="text-body">{NOT_ON_LIST}</p>
      )}
      <div className="flex gap-2" role="group" aria-label="Side">
        <button type="button" aria-pressed={side === "buy"} className="rounded-control px-3 py-2 text-body" onClick={() => setSide("buy")}>
          {BUY_ETH}
        </button>
        <button type="button" aria-pressed={side === "sell"} className="rounded-control px-3 py-2 text-body" onClick={() => setSide("sell")}>
          {SELL_ETH}
        </button>
      </div>
      <AmountInput
        value={amount}
        onChange={setAmount}
        unit={unit}
        onUnit={() => setUnit(unit === "ETH" ? "USDC" : "ETH")}
        {...(parsed.ok === false && parsed.reason === "decimals" ? { error: TOO_MANY_DECIMALS } : {})}
      />
      <details>
        <summary className="text-body">{SLIPPAGE}</summary>
        <input
          className="mt-2 rounded-control border border-border px-3 py-2 text-body"
          type="text"
          inputMode="numeric"
          value={slippage}
          onChange={(event) => setSlippage(event.target.value.replace(/\D/g, ""))}
        />
      </details>
      {named && quote.data?.ok && quote.secondsLeft > 0 ? (
        (approvals.data?.length ?? 0) > 0 ? (
          <button type="button" className="text-body" onClick={() => setOverlay("approve")}>
            {APPROVE_ROUTER}
          </button>
        ) : (
          <button type="button" className="text-body" onClick={() => setOverlay("fill")}>
            {FILL}
          </button>
        )
      ) : null}
      {overlay && live.data && quote.data?.ok ? (
        <WalletTxOverlay
          kind={overlay}
          tx={
            overlay === "approve"
              ? (approvals.data?.[0] ?? port.buildSwapTx({ client, cfg: emptyConfig() }, live.data, quote.data, { slippageBps: bpsOf(slippage), deadlineSec: 120 }))
              : port.buildSwapTx({ client, cfg: emptyConfig() }, live.data, quote.data, { slippageBps: bpsOf(slippage), deadlineSec: 120 })
          }
          onClose={() => setOverlay(null)}
        />
      ) : null}
      <QuotePanel
        quote={quote}
        side={side}
        midWad={state.data?.pWad ?? 0n}
        empty={parsed.ok === false && parsed.reason === "empty"}
        onRefresh={() => void quote.refetch()}
      />
    </div>
  );
}

function QuotePanel({
  quote,
  side,
  midWad,
  empty,
  onRefresh,
}: {
  quote: ReturnType<typeof useQuote>;
  side: Side;
  midWad: bigint;
  empty: boolean;
  onRefresh: () => void;
}) {
  if (empty) return <p className="text-body">{ENTER_AMOUNT}</p>;
  if (quote.isFetching && !quote.data) return <Skeleton className="h-8 w-full" />;
  const data = quote.data;
  if (!data) return null;
  if (!data.ok) {
    return (
      <div>
        <p className="text-body">{data.error.title}</p>
        <p className="text-body text-muted">{data.error.hint}</p>
      </div>
    );
  }
  const fresh = quote.secondsLeft > 0;
  return (
    <div className={fresh ? "flex flex-col gap-2" : "flex flex-col gap-2 text-muted"}>
      <p className="text-body">
        {YOU_PAY} {side === "buy" ? formatUsdc(data.amountIn) : formatWeth(data.amountIn)}
      </p>
      <p className="text-body">
        {YOU_RECEIVE} {side === "buy" ? formatWeth(data.amountOut) : formatUsdc(data.amountOut)}
      </p>
      <p className="num text-h3">{formatPrice(data.priceWad)}</p>
      <p className="text-body">{midWad === 0n ? "—" : `${formatVsMidBps(data.priceWad, midWad).toString()} bps`}</p>
      <p className="text-body">
        {formatBps(data.spreadBps)} <SourceBadge source={data.spreadSource} />
      </p>
      <Countdown secondsLeft={quote.secondsLeft} />
      {data.mirrorMatches ? <p className="text-body">{CHECKED} ✓</p> : null}
      {fresh ? null : (
        <button type="button" className="text-body" onClick={onRefresh}>
          {REFRESH_QUOTE}
        </button>
      )}
    </div>
  );
}
