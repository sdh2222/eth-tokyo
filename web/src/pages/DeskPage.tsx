import { Link } from "react-router-dom";
import { formatBpsShare, formatWadUsd, type DeskBook } from "../desk/book";
import { buysEth, fillEth, fillPrice } from "../desk/fills";
import type { FillRecord } from "../desk/types";
import { useBook } from "../hooks/useBook";
import { formatCountdown, useClock } from "../hooks/useClock";
import { useDeskState, useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { InventoryCells, SpreadStrip, WindowCells } from "../ui/cells";
import { Badge, Card, Dl, Empty, Header, Metric, Metrics, Note, Page } from "../ui/v";

// Dashboard: the state of the desk at a glance (TWA §5.1). Vercel-style: one metrics card
// (the quote first), then Spread and Inventory cards, then recent fills. Read-only.

const WINDOW_SECONDS = 600;

type Need = { label: string; href: string; action: string };

function firstNeed(book: DeskBook, now: number): Need | null {
  if (book.spread === null || !book.spread.live) {
    return { label: "No live agent spread. The desk is quoting on the terms widths.", href: "/agent", action: "Risk agent" };
  }
  for (const name of book.names) {
    if (!name.live) return { label: `${name.name} can't trade right now.`, href: "/counterparties", action: "Counterparties" };
    if (name.expiry > 0n && Number(name.expiry) - now < 7 * 86400) {
      return { label: `${name.name} expires within a week.`, href: "/counterparties", action: "Counterparties" };
    }
  }
  return null;
}

function FillRow({ fill, now }: { fill: FillRecord; now: number }) {
  const buys = buysEth(fill);
  return (
    <tr>
      <td className="v-muted">{formatWhen(fill.blockTime, now)}</td>
      <td>{fill.name}</td>
      <td>
        <Badge tone={buys ? "red" : "green"}>{buys ? "Bought ETH" : "Sold ETH"}</Badge>
      </td>
      <td className="v-right">{formatWeth(fillEth(fill))}</td>
      <td className="v-right">{`$${formatWadUsd(fillPrice(fill))}`}</td>
      <td className="v-right">
        <Link className="v-mono" to={`/fills/${fill.tx}`}>
          {formatHash(fill.tx)}
        </Link>
      </td>
    </tr>
  );
}

export function DeskPage() {
  const book = useBook();
  const now = useClock();
  const strategy = useLiveStrategy();
  const desk = useDeskState(strategy.data ?? null);
  const fills = useFills(strategy.data ?? null);
  const b = book.data;
  const live = Boolean(strategy.data);

  if (!b) {
    return (
      <Page>
        <Header title="Dashboard" description={book.isLoading ? "Reading the desk…" : "The desk could not be read. Check the Sepolia RPC and reload."} />
      </Page>
    );
  }

  if (!live) {
    return (
      <Page>
        <Header title="Dashboard" description={b.name} />
        <Card>
          <Empty
            picture
            title="No desk is open"
            description="Opening a desk ships the program to Aqua in one Safe transaction. The tokens stay in the Safe."
            action={
              <Link className="v-btn" to="/open">
                Open a desk
              </Link>
            }
          />
        </Card>
      </Page>
    );
  }

  const updatedAt = Number(b.oracle.updatedAt);
  const windowLeft = updatedAt > now ? 0 : updatedAt + WINDOW_SECONDS - now;
  const midWad = b.oracle.answer * 10n ** 10n;
  const need = firstNeed(b, now);
  const weth = desk.data?.safeWallet.weth;
  const usdc = desk.data?.safeWallet.usdc;
  const rows = (fills.data ?? []).slice(0, 10);
  const deadline = desk.data?.deadline;
  const onSpread = b.quote?.source === "spread" && b.spread !== null;
  const sell = onSpread && b.spread ? b.spread.sellBps : (b.terms?.sellBps ?? 0);
  const buy = onSpread && b.spread ? b.spread.buyBps : (b.terms?.buyBps ?? 0);

  return (
    <Page>
      <Header
        title="Dashboard"
        description={`${b.name} · WETH / USDC${deadline ? ` · closes ${formatWhen(deadline, now)}` : ""}`}
        actions={<Badge tone="green">Live</Badge>}
      />

      {need ? (
        <Note
          tone="amber"
          action={
            <Link className="v-btn v-btn-secondary" to={need.href}>
              {need.action}
            </Link>
          }
        >
          {need.label}
        </Note>
      ) : null}

      <Card flush>
        <Metrics>
          <Metric label="Bid · a counterparty sells ETH" value={b.quote ? `$${formatWadUsd(b.quote.bid)}` : "—"} hint={`−${buy} bp from the mid`} large />
          <Metric label="Ask · a counterparty buys ETH" value={b.quote ? `$${formatWadUsd(b.quote.ask)}` : "—"} hint={`+${sell} bp from the mid`} large />
          <Metric label="Oracle mid" value={`$${formatWadUsd(midWad)}`} hint={b.oracle.fresh ? "Fresh" : "Older than the price window"} />
          <Metric
            label="Price window"
            value={windowLeft > 0 ? formatCountdown(windowLeft) : "Closed"}
            hint={<WindowCells secondsLeft={windowLeft} windowSeconds={WINDOW_SECONDS} />}
          />
        </Metrics>
      </Card>

      <div className="v-grid">
        <Card
          className="v-col-7"
          title="Spread"
          actions={
            <Link className="v-btn v-btn-secondary" to="/agent">
              Risk agent
            </Link>
          }
        >
          <div className="v-stack v-stack-24">
            <SpreadStrip sellBps={sell} buyBps={buy} fenceSellBps={b.terms?.sellBps} fenceBuyBps={b.terms?.buyBps} />
            <Dl
              items={[
                ["Source", onSpread ? "Risk agent spread" : "Terms widths"],
                ["Widths now", `bid −${buy} bp · ask +${sell} bp`],
                ["Terms", b.terms ? `bid −${b.terms.buyBps} bp · ask +${b.terms.sellBps} bp · cap ${formatWeth(b.terms.cap)}` : "—"],
                ...(b.spread ? ([["Valid until", formatWhen(Number(b.spread.validUntil), now)]] as const) : []),
              ]}
            />
          </div>
        </Card>

        <Card className="v-col-5" title="Inventory">
          <div className="v-stack v-stack-24">
            <InventoryCells shareBps={b.inventory.wBps} stopBps={b.inventory.wStarBps} />
            <Dl
              items={[
                ["ETH share", formatBpsShare(b.inventory.wBps)],
                ["Stops selling ETH at", formatBpsShare(b.inventory.wStarBps)],
                ["WETH in the Safe", weth !== undefined ? formatWeth(weth) : "—"],
                ["USDC in the Safe", usdc !== undefined ? formatUsdc(usdc) : "—"],
              ]}
            />
          </div>
        </Card>
      </div>

      <Card
        title="Recent fills"
        flush
        actions={
          <Link className="v-btn v-btn-secondary" to="/fills">
            View all
          </Link>
        }
      >
        {rows.length === 0 ? (
          <Empty picture title="No fills yet" description="Counterparties fill from the Trade page." />
        ) : (
          <div className="v-table-wrap">
            <table className="v-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Counterparty</th>
                  <th>Side</th>
                  <th className="v-right">Size</th>
                  <th className="v-right">Price</th>
                  <th className="v-right">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((fill) => (
                  <FillRow key={fill.tx} fill={fill} now={now} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}
