import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { WalletTxOverlay } from "../overlays/WalletTxOverlay";
import {
  APPROVE_ROUTER,
  BUY_ETH,
  ENTER_AMOUNT,
  FILL,
  REFRESH_QUOTE,
  SELL_ETH,
  SLIPPAGE,
  TOO_MANY_DECIMALS,
  YOU_PAY,
  YOU_RECEIVE,
} from "../copy/en";
import { ERRORS } from "../copy/errors";
import { formatEth, formatWadUsd, type DeskBook } from "../desk/book";
import { emptyConfig } from "../desk/fixture/state";
import { useBook } from "../hooks/useBook";
import { useWalletLabel } from "../hooks/useCanAct";
import { formatCountdown, useClock } from "../hooks/useClock";
import { useDeskPort, useLiveStrategy } from "../hooks/useDesk";
import { useQuote } from "../hooks/useQuote";
import { formatPrice, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { SpreadStrip, WindowCells } from "../ui/cells";
import { Badge, Card, Dl, Empty, Header, Note, Page, type Tone } from "../ui/v";

// Trade (IA: "Can I trade now, at what price, and how much?"). Vercel-style: the header says
// who trades and whether they can, a refusal is one Note above the grid, then the Order card
// (5 columns, Fill in its footer) and the Quote card (7). Slippage is a disclosure (SC-06).

type Side = "buy" | "sell";
type Unit = "ETH" | "USDC";
type Refusal = { title: string; hint: string };
type Action = { label: string; run: () => void };

const MODE_LIVE = import.meta.env.VITE_DESK_MODE === "live";
const WINDOW_SECONDS = 600;
const ZERO = "0x0000000000000000000000000000000000000000";
const SOURCE_LABEL: Record<NonNullable<DeskBook["quote"]>["source"], string> = {
  spread: "Agent spread",
  terms: "Terms",
  router: "Router",
};

export function parseAmount(text: string, decimals: number): { ok: true; value: bigint } | { ok: false; reason: "empty" | "decimals" } {
  if (text === "" || text === ".") return { ok: false, reason: "empty" };
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, reason: "decimals" };
  const [whole, frac = ""] = text.split(".");
  if (frac.length > decimals) return { ok: false, reason: "decimals" };
  const digits = `${whole}${frac.padEnd(decimals, "0")}`;
  return { ok: true, value: BigInt(digits) };
}

export function legFor(side: Side, unit: Unit): { leg: "weth" | "usdc"; exact: "exactIn" | "exactOut" } {
  if (side === "buy" && unit === "ETH") return { leg: "weth", exact: "exactOut" };
  if (side === "buy" && unit === "USDC") return { leg: "usdc", exact: "exactIn" };
  if (side === "sell" && unit === "ETH") return { leg: "weth", exact: "exactIn" };
  return { leg: "usdc", exact: "exactOut" };
}

// The title and hint from web/src/copy/errors.ts. DeskPriceTargetReached is not in that file
// yet, so its fallback is the copy from ts/src/lib/client/errors.ts.
function errorCopy(code: string, fallback: Refusal): Refusal {
  const copy = ERRORS[code];
  return copy ? { title: copy.title, hint: copy.hint } : fallback;
}

// USDC base units (6 decimals) for an ETH amount (wei) at a wad price.
function usdcFor(wei: bigint, priceWad: bigint): bigint {
  return (wei * priceWad) / 10n ** 30n;
}

// "1." and ".5" are half-typed numbers, not a decimals error.
function normalizeAmount(text: string): string {
  const lead = text.startsWith(".") ? `0${text}` : text;
  return lead.endsWith(".") ? lead.slice(0, -1) : lead;
}

// Wei as an input string, e.g. 50000000000000000000n -> "50".
function weiText(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return frac === "" ? whole.toString() : `${whole}.${frac}`;
}

export function TradePage() {
  const { address } = useAccount();
  const label = useWalletLabel();
  const book = useBook();
  const now = useClock();
  const strategy = useLiveStrategy();
  const port = useDeskPort();
  const client = usePublicClient();
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState<number | null>(10);
  const [overlay, setOverlay] = useState<"approve" | "fill" | null>(null);
  const parsed = parseAmount(normalizeAmount(amount), 18);
  const wei = parsed.ok && parsed.value > 0n ? parsed.value : null;
  const route = legFor(side, "ETH");
  const approvals = useQuery({
    queryKey: ["approvals", address],
    queryFn: () => port.planMmApprovals({ client, cfg: emptyConfig() }, address as `0x${string}`),
    enabled: address !== undefined,
  });
  const quote = useQuote({
    strategy: strategy.data ?? null,
    mm: address ?? null,
    side,
    leg: route.leg,
    amount: wei,
  });

  if (!book.data) {
    return (
      <Page>
        <Header
          title="Trade"
          description={book.isLoading ? "Reading the desk…" : "The desk could not be read. Check the Sepolia RPC in web/.env and reload."}
        />
      </Page>
    );
  }

  const b = book.data;
  const updatedAt = Number(b.oracle.updatedAt);
  const windowLeft = updatedAt > now ? 0 : updatedAt + WINDOW_SECONDS - now;
  const entry = address
    ? b.names.find((name) => name.addr.toLowerCase() === address.toLowerCase() || name.name === label)
    : undefined;
  const expired = entry !== undefined && (!entry.live || (entry.expiry > 0n && Number(entry.expiry) <= now));

  // Who you are: can this wallet trade at all right now?
  let nameRefusal: Refusal | null = null;
  if (address && !entry) {
    nameRefusal = errorCopy("EnsGateTakerMismatch", {
      title: "This wallet isn't on the desk's list",
      hint: "Only the address in a client name's ENS record can trade under that name.",
    });
  } else if (expired) {
    nameRefusal = errorCopy("EnsGateNameExpired", {
      title: "Your name has expired",
      hint: "Ask the treasury to renew your name to trade again.",
    });
  }
  const windowRefusal =
    windowLeft > 0
      ? null
      : errorCopy("DeskPriceOracleStale", {
          title: "The price feed is too old",
          hint: "Trading pauses when the price is older than the limit. It resumes on the next update.",
        });

  // This order: the desk-side guards on side and size, then the quote's own refusal.
  // Each refusal carries at most one action.
  let refusal: Refusal | null = nameRefusal ?? windowRefusal;
  let refusalTone: Tone = "red";
  let refusalAction: Action | null = null;
  if (!refusal && side === "buy" && b.inventory.wBps <= b.inventory.wStarBps) {
    refusal = errorCopy("DeskPriceTargetReached", {
      title: "The desk has reached its ETH target",
      hint: "A sale of ETH stops at the target share. A purchase of ETH still fills.",
    });
    refusalTone = "amber";
    refusalAction = { label: SELL_ETH, run: () => setSide("sell") };
  }
  if (!refusal && b.terms && wei !== null && wei > b.terms.cap) {
    const cap = b.terms.cap;
    const copy = errorCopy("DeskPriceCapExceeded", { title: "Over your cap per fill", hint: "" });
    refusal = { title: copy.title, hint: `One fill is capped at ${formatEth(cap)}. Split the trade.` };
    refusalTone = "amber";
    refusalAction = { label: "Use the cap", run: () => setAmount(weiText(cap)) };
  }
  if (!refusal && quote.data && !quote.data.ok) {
    refusal = { title: quote.data.error.title, hint: quote.data.error.hint };
    refusalAction = { label: REFRESH_QUOTE, run: () => void quote.refetch() };
  }

  const canTrade = address !== undefined && nameRefusal === null && windowRefusal === null;

  // What you pay and receive: the exact quote when there is one, else the book's quote.
  const exact = quote.data?.ok ? quote.data : null;
  const bookPrice = b.quote ? (side === "buy" ? b.quote.ask : b.quote.bid) : null;
  let pay = "—";
  let receive = "—";
  let price = bookPrice === null ? "—" : `$${formatWadUsd(bookPrice)}`;
  let priceNote = "Indicative";
  if (exact) {
    pay = side === "buy" ? formatUsdc(exact.amountIn) : formatWeth(exact.amountIn);
    receive = side === "buy" ? formatWeth(exact.amountOut) : formatUsdc(exact.amountOut);
    price = `$${formatPrice(exact.priceWad)}`;
    priceNote = quote.secondsLeft > 0 ? formatCountdown(quote.secondsLeft) : "Expired";
  } else if (wei !== null && bookPrice !== null) {
    pay = side === "buy" ? `≈ ${formatUsdc(usdcFor(wei, bookPrice))}` : formatWeth(wei);
    receive = side === "buy" ? formatWeth(wei) : `≈ ${formatUsdc(usdcFor(wei, bookPrice))}`;
  }

  const slippageBps = slippage ?? 0;
  const needsApproval = (approvals.data?.length ?? 0) > 0;
  const swapTx =
    strategy.data && exact
      ? port.buildSwapTx({ client, cfg: emptyConfig() }, strategy.data, exact, { slippageBps, deadlineSec: 120 })
      : null;
  const fillWired = !MODE_LIVE || (swapTx !== null && swapTx.to.toLowerCase() !== ZERO);
  let blocked: string | null = null;
  if (!address) blocked = "Connect a wallet to trade.";
  else if (refusal) blocked = refusal.title;
  else if (wei === null) blocked = `${ENTER_AMOUNT}.`;
  else if (!exact) blocked = "Waiting for a quote.";
  else if (quote.secondsLeft <= 0) blocked = "The quote expired. Refresh it.";
  else if (!needsApproval && !fillWired) blocked = "Filling from this page is not wired to Sepolia yet.";
  // The spread strip: the widths the quote is on (the agent spread when live, else the terms),
  // fenced by the terms widths. The same rule as the Dashboard.
  const onSpread = b.quote?.source === "spread" && b.spread !== null;
  const sellBps = onSpread && b.spread ? b.spread.sellBps : (b.terms?.sellBps ?? 0);
  const buyBps = onSpread && b.spread ? b.spread.buyBps : (b.terms?.buyBps ?? 0);
  const midWad = b.oracle.answer * 10n ** 10n;
  // Refresh quote sits in the Quote card head when there is a quote, unless the refusal's
  // one action is already Refresh quote.
  const showRefresh = quote.data !== undefined && refusalAction?.label !== REFRESH_QUOTE;
  const refusalText = refusal ? (refusal.hint && refusal.hint !== "—" ? `${refusal.title}. ${refusal.hint}` : refusal.title) : "";

  return (
    <Page>
      <Header
        title="Trade"
        description={entry ? `${entry.name} · WETH / USDC` : "WETH / USDC"}
        actions={<Badge tone={canTrade ? "green" : "red"}>{canTrade ? "Can trade" : "Can't trade"}</Badge>}
      />

      {refusal ? (
        <Note
          tone={refusalTone}
          action={
            refusalAction ? (
              <button type="button" className="v-btn v-btn-secondary" onClick={refusalAction.run}>
                {refusalAction.label}
              </button>
            ) : null
          }
        >
          {refusalText}
        </Note>
      ) : null}

      <div className="v-grid">
        <Card
          className="v-col-5"
          title="Order"
          footer={
            <>
              {blocked !== null ? <span id="trade-blocked">{blocked}</span> : <span />}
              <button
                type="button"
                className="v-btn v-btn-lg"
                disabled={blocked !== null}
                aria-describedby={blocked !== null ? "trade-blocked" : undefined}
                onClick={() => setOverlay(needsApproval ? "approve" : "fill")}
              >
                {needsApproval ? APPROVE_ROUTER : FILL}
              </button>
            </>
          }
        >
          <div className="v-stack v-stack-24">
            <div className="v-seg" role="radiogroup" aria-label="Side">
              <button type="button" role="radio" aria-checked={side === "buy"} onClick={() => setSide("buy")}>
                {BUY_ETH}
              </button>
              <button type="button" role="radio" aria-checked={side === "sell"} onClick={() => setSide("sell")}>
                {SELL_ETH}
              </button>
            </div>
            <label className="v-field">
              <span>Amount · ETH</span>
              <input
                className="v-input"
                inputMode="decimal"
                autoComplete="off"
                placeholder={ENTER_AMOUNT}
                value={amount}
                aria-invalid={!parsed.ok && parsed.reason === "decimals"}
                onChange={(event) => {
                  if (/^\d*\.?\d*$/.test(event.target.value)) setAmount(event.target.value);
                }}
              />
              {!parsed.ok && parsed.reason === "decimals" ? (
                <span className="v-error" role="alert">
                  {TOO_MANY_DECIMALS}
                </span>
              ) : null}
            </label>
            <Dl
              items={[
                [YOU_PAY, pay],
                [YOU_RECEIVE, receive],
                ["Your limits", b.terms ? `Up to ${formatEth(b.terms.cap)} per fill` : "No terms on the client names"],
                ...(entry && entry.expiry > 0n ? ([["Name valid until", formatWhen(Number(entry.expiry), now)]] as const) : []),
              ]}
            />
            <details className="v-details">
              <summary>{SLIPPAGE}</summary>
              <label className="v-field">
                <span>Slippage · bps</span>
                <input
                  className="v-input"
                  type="number"
                  min={0}
                  max={500}
                  step={1}
                  value={slippage ?? ""}
                  onChange={(event) => {
                    const next = event.target.value;
                    setSlippage(next === "" ? null : Math.min(500, Math.max(0, Math.round(Number(next)))));
                  }}
                />
                <span className="v-label">The fill reverts if the price moves more than this.</span>
              </label>
            </details>
          </div>
        </Card>

        <Card
          className="v-col-7"
          title="Quote"
          actions={
            showRefresh ? (
              <button type="button" className="v-btn v-btn-secondary" disabled={quote.isFetching} onClick={() => void quote.refetch()}>
                {REFRESH_QUOTE}
              </button>
            ) : null
          }
        >
          {b.quote ? (
            <div className="v-stack v-stack-24">
              <div className="v-stack v-stack-4">
                <span className="v-label">{side === "buy" ? "Ask · you buy ETH" : "Bid · you sell ETH"}</span>
                <span className="v-figure-lg">{price}</span>
              </div>
              <SpreadStrip sellBps={sellBps} buyBps={buyBps} fenceSellBps={b.terms?.sellBps} fenceBuyBps={b.terms?.buyBps} />
              <Dl
                items={[
                  ["Source", SOURCE_LABEL[b.quote.source]],
                  ["Oracle mid", `$${formatWadUsd(midWad)}`],
                  [
                    "Price window",
                    <span key="window" className="v-row v-row-8">
                      <span className="v-num">{windowLeft > 0 ? formatCountdown(windowLeft) : "Closed"}</span>
                      <WindowCells secondsLeft={windowLeft} windowSeconds={WINDOW_SECONDS} />
                    </span>,
                  ],
                  ["Valid", priceNote],
                ]}
              />
            </div>
          ) : (
            <Empty title="No quote: the terms on the client names disagree or are missing." />
          )}
        </Card>
      </div>

      {overlay && strategy.data && exact && swapTx ? (
        <WalletTxOverlay
          kind={overlay}
          tx={overlay === "approve" ? (approvals.data?.[0] ?? swapTx) : swapTx}
          onClose={() => setOverlay(null)}
        />
      ) : null}
    </Page>
  );
}
