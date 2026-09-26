import { Link } from "react-router-dom";
import { formatBpsShare, formatWadUsd, type DeskBook } from "../desk/book";
import { buysEth, fillEth, fillPrice } from "../desk/fills";
import type { FillRecord } from "../desk/types";
import { useBook } from "../hooks/useBook";
import { formatCountdown, useClock } from "../hooks/useClock";
import { useDeskState, useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { InventoryCells, SpreadStrip, WindowCells } from "../ui/cells";
import { Dot, Empty, Page, PageHead, Pill, Section } from "../ui/plain";

// Dashboard: "the state of the desk at a glance, readable from the back of a room" (TWA §5.1).
// L1 is the price board (bid and ask around the mid), under a one-line status. L2 is the
// inventory. L3 is recent fills. Read-only: no primary action.

const WINDOW_SECONDS = 600;

type Need = { label: string; href: string };

// The first thing that needs the treasury, if any. Desk-level issues are banners already.
function firstNeed(book: DeskBook, now: number): Need | null {
  if (book.spread === null || !book.spread.live) {
    return { label: "No live agent spread: quoting on the terms widths", href: "/agent" };
  }
  for (const name of book.names) {
    if (!name.live) return { label: `${name.name} can't trade`, href: "/counterparties" };
    if (name.expiry > 0n && Number(name.expiry) - now < 7 * 86400) {
      return { label: `${name.name} expires within a week`, href: "/counterparties" };
    }
  }
  return null;
}

function FillRow({ fill, now }: { fill: FillRecord; now: number }) {
  const buys = buysEth(fill);
  return (
    <tr>
      <td className="wk-muted">{formatWhen(fill.blockTime, now)}</td>
      <td>{fill.name}</td>
      <td className={buys ? "wk-ask" : "wk-bid"}>{buys ? "Bought ETH" : "Sold ETH"}</td>
      <td className="wk-right">{formatWeth(fillEth(fill))}</td>
      <td className="wk-right">{`$${formatWadUsd(fillPrice(fill))}`}</td>
      <td className="wk-right">
        <Link to={`/fills/${fill.tx}`}>Verify</Link>
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

  if (book.isLoading) {
    return (
      <Page>
        <PageHead title="Dashboard" lede="Reading the desk…" />
      </Page>
    );
  }
  if (!book.data) {
    return (
      <Page>
        <PageHead title="Dashboard" />
        <Empty title="The desk could not be read. Check the Sepolia RPC in web/.env and reload." />
      </Page>
    );
  }

  const b = book.data;
  const live = Boolean(strategy.data);
  const updatedAt = Number(b.oracle.updatedAt);
  const windowLeft = updatedAt > now ? 0 : updatedAt + WINDOW_SECONDS - now;
  const midWad = b.oracle.answer * 10n ** 10n;
  const need = firstNeed(b, now);
  const weth = desk.data?.safeWallet.weth;
  const usdc = desk.data?.safeWallet.usdc;
  const rows = (fills.data ?? []).slice(0, 10);
  const deadline = desk.data?.deadline;

  if (!live) {
    return (
      <Page>
        <PageHead kicker={b.name} title="Dashboard" />
        <Empty
          picture
          title="No desk is open. The treasury hasn't shipped a program yet, or it was stopped."
          action={
            <Link className="wk-btn" to="/open">
              Open a desk
            </Link>
          }
        />
      </Page>
    );
  }

  return (
    <Page>
      <PageHead kicker={b.name} title="Dashboard" />

      <div className="wk-stack wk-stack-24">
        <div className="wk-strip" aria-label="Desk status">
          <Pill tone="success">Live</Pill>
          {deadline ? <span>{`Closes ${formatWhen(deadline, now)}`}</span> : null}
          <span>
            <span className="wk-label">Oracle</span>
            {`$${formatWadUsd(midWad)}`}
            <span className="wk-label">{b.oracle.fresh ? "fresh" : "stale"}</span>
          </span>
          <span>
            <WindowCells secondsLeft={windowLeft} windowSeconds={WINDOW_SECONDS} />
            {windowLeft > 0 ? `${formatCountdown(windowLeft)} left in the price window` : "Price window closed"}
          </span>
          {need ? (
            <Link to={need.href}>
              <Dot tone="warning">{need.label}</Dot>
            </Link>
          ) : null}
        </div>

        {b.quote ? (
          <section className="wk-stack wk-stack-24" aria-label="Live quote">
            <div className="wk-quote">
              <div className="wk-stack wk-stack-8">
                <span className="wk-label">Bid · a counterparty sells ETH</span>
                <span className="wk-hero">{`$${formatWadUsd(b.quote.bid)}`}</span>
              </div>
              <div className="wk-stack wk-stack-8">
                <span className="wk-label">Ask · a counterparty buys ETH</span>
                <span className="wk-hero">{`$${formatWadUsd(b.quote.ask)}`}</span>
              </div>
            </div>
            <SpreadStrip
              sellBps={b.quote.source === "spread" && b.spread ? b.spread.sellBps : (b.terms?.sellBps ?? 0)}
              buyBps={b.quote.source === "spread" && b.spread ? b.spread.buyBps : (b.terms?.buyBps ?? 0)}
              {...(b.terms ? { fenceSellBps: b.terms.sellBps, fenceBuyBps: b.terms.buyBps } : {})}
            />
            <p className="wk-muted">
              {b.quote.source === "spread" ? "Widths from the risk agent, inside the terms. " : "Widths from the terms. "}
              <Link to="/agent">Risk agent</Link>
            </p>
          </section>
        ) : (
          <Empty title="No quote: the terms on the client names disagree or are missing." />
        )}
      </div>

      <Section title="Inventory">
        <div className="wk-grid">
          <div className="wk-stack wk-stack-8 wk-span-4">
            <span className="wk-label">WETH</span>
            <span className="wk-value">{weth !== undefined ? formatWeth(weth) : "—"}</span>
          </div>
          <div className="wk-stack wk-stack-8 wk-span-4">
            <span className="wk-label">USDC</span>
            <span className="wk-value">{usdc !== undefined ? formatUsdc(usdc) : "—"}</span>
          </div>
          <div className="wk-stack wk-stack-8 wk-span-4">
            <InventoryCells shareBps={b.inventory.wBps} stopBps={b.inventory.wStarBps} />
            <span className="wk-label">
              {`ETH ${formatBpsShare(b.inventory.wBps)} · the line is the ${formatBpsShare(b.inventory.wStarBps)} stop`}
            </span>
          </div>
        </div>
      </Section>

      <Section
        title="Recent fills"
        aside={
          <Link className="wk-link" to="/fills">
            All fills
          </Link>
        }
      >
        {rows.length === 0 ? (
          <Empty picture title="No fills yet. Counterparties fill from the Trade page." />
        ) : (
          <div className="wk-table-wrap">
            <table className="wk-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Counterparty</th>
                  <th>Side</th>
                  <th className="wk-right">Size</th>
                  <th className="wk-right">Price</th>
                  <th className="wk-right">
                    <span className="wk-sr">Verify</span>
                  </th>
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
      </Section>
    </Page>
  );
}
