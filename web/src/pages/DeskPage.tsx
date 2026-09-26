import { Link } from "react-router-dom";
import { formatBpsShare, formatWadUsd, type DeskBook } from "../desk/book";
import type { FillRecord } from "../desk/types";
import { useBook } from "../hooks/useBook";
import { formatCountdown, useClock } from "../hooks/useClock";
import { useDeskState, useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatUsdc, formatWeth } from "../lib/format";
import { Bar, Empty, Page, PageHead, Pill, Section, Stat, Window } from "../ui/plain";

// Dashboard (IA: "Is my desk trading, and does anything need me?"). Plain page kit.
// Screens SC-17: status row 12 columns, inventory 5 and the quote board 7, recent fills 12.

const WINDOW_SECONDS = 600;
const WETH = "0x7Bd809623704F82eBaf04589220E57b174512ADB";

type Need = { label: string; href: string; action: string };

function needs(book: DeskBook, now: number, windowLeft: number): Need[] {
  const items: Need[] = [];
  if (windowLeft <= 0) items.push({ label: "The price window is closed until the next oracle update.", href: "/controls", action: "Controls" });
  if (book.spread === null || !book.spread.live) {
    items.push({ label: "No live agent spread: the desk quotes on the terms widths.", href: "/agent", action: "Risk agent" });
  }
  for (const name of book.names) {
    if (!name.live) items.push({ label: `${name.name} can't trade right now.`, href: "/counterparties", action: "Counterparties" });
    else if (name.expiry > 0n && Number(name.expiry) - now < 7 * 86400) {
      items.push({ label: `${name.name} expires within a week.`, href: "/counterparties", action: "Counterparties" });
    }
  }
  return items;
}

function FillRow({ fill }: { fill: FillRecord }) {
  const buysEth = fill.tokenOut.toLowerCase() === WETH.toLowerCase();
  const eth = buysEth ? fill.amountOut : fill.amountIn;
  return (
    <tr>
      <td>
        <Link to={`/fills/${fill.tx}`}>{formatHash(fill.tx)}</Link>
      </td>
      <td>{fill.name}</td>
      <td className={buysEth ? "wm-ask" : "wm-bid"}>{buysEth ? "Bought ETH" : "Sold ETH"}</td>
      <td className="wm-right">{formatWeth(eth)}</td>
      <td className="wm-right">{`$${formatWadUsd(fill.midWad)}`}</td>
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
  const updatedAt = Number(b.oracle.updatedAt);
  const windowLeft = updatedAt > now ? 0 : updatedAt + WINDOW_SECONDS - now;
  const midWad = b.oracle.answer * 10n ** 10n;
  const todo = needs(b, now, windowLeft);
  const weth = desk.data?.safeWallet.weth;
  const usdc = desk.data?.safeWallet.usdc;
  const rows = (fills.data ?? []).slice(0, 5);
  const live = Boolean(strategy.data);

  return (
    <Page>
      <PageHead
        kicker={b.name}
        title="Dashboard"
        lede="Is the desk trading, and does anything need you?"
      />

      <div className="wm-stats">
        <Stat
          label="Desk"
          value={live ? <Pill tone="success">Live</Pill> : <Pill>Not open</Pill>}
          note={live ? "The Safe's program is shipped to Aqua." : "No program is shipped."}
        />
        <Stat
          label="Price window"
          value={windowLeft > 0 ? formatCountdown(windowLeft) : "Closed"}
          note="Open for 10 minutes after each oracle update."
        />
        <Stat
          label="ETH share"
          value={formatBpsShare(b.inventory.wBps)}
          note={`Stops selling ETH at ${formatBpsShare(b.inventory.wStarBps)}.`}
        />
        <Stat label="Oracle mid" value={`$${formatWadUsd(midWad)}`} note={b.oracle.fresh ? "Fresh" : "Older than the window"} />
      </div>

      <div className="wm-grid">
        <Section title="Inventory" className="wm-span-5">
          <Bar
            label="ETH share of the Safe"
            value={b.inventory.wBps / 100}
            mark={b.inventory.wStarBps / 100}
            markLabel={`The line is the ${formatBpsShare(b.inventory.wStarBps)} stop.`}
          />
          <p className="wm-muted">
            {weth !== undefined && usdc !== undefined
              ? `In the Safe: ${formatWeth(weth)} and ${formatUsdc(usdc)}.`
              : "Tokens stay in the Safe until each fill."}
          </p>
        </Section>

        <Section
          title="Live quote"
          className="wm-span-7"
          aside={
            b.quote ? (
              <Link className="wm-link" to="/agent">
                {b.quote.source === "spread" ? "Agent spread" : "Terms widths"}
              </Link>
            ) : null
          }
        >
          {b.quote ? (
            <Window title="Quote board" meta={windowLeft > 0 ? `window ${formatCountdown(windowLeft)}` : "window closed"}>
              <div className="wm-window-line">
                <span>ASK · counterparty buys ETH</span>
                <span className="wm-mark">{`$${formatWadUsd(b.quote.ask)}`}</span>
              </div>
              <div className="wm-window-line">
                <span>BID · counterparty sells ETH</span>
                <span className="wm-mark">{`$${formatWadUsd(b.quote.bid)}`}</span>
              </div>
              <div className="wm-window-line">
                <span>MID · oracle</span>
                <span>{`$${formatWadUsd(midWad)}`}</span>
              </div>
              {b.terms ? (
                <div className="wm-window-line">
                  <span>FENCE · terms</span>
                  <span>{`sell ${b.terms.sellBps} bp · buy ${b.terms.buyBps} bp · cap ${formatWeth(b.terms.cap)}`}</span>
                </div>
              ) : null}
            </Window>
          ) : (
            <Empty title="No quote: the terms on the client names disagree or are missing." />
          )}
        </Section>

        <Section title="Needs you" className="wm-span-12">
          {todo.length === 0 ? (
            <p>
              <Pill tone="success">Clear</Pill> Nothing needs you.
            </p>
          ) : (
            <ul className="wm-list">
              {todo.map((item) => (
                <li key={item.label}>
                  <span className="wm-row wm-row-8">
                    <Pill tone="warning">Check</Pill>
                    {item.label}
                  </span>
                  <Link className="wm-link" to={item.href}>
                    {item.action}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Recent fills"
          className="wm-span-12"
          aside={
            <Link className="wm-link" to="/fills">
              All fills
            </Link>
          }
        >
          {rows.length === 0 ? (
            <Empty title="No fills yet. Counterparties fill from the Trade page." />
          ) : (
            <div className="wm-table-wrap">
              <table className="wm-table">
                <thead>
                  <tr>
                    <th>Fill</th>
                    <th>Counterparty</th>
                    <th>Side</th>
                    <th className="wm-right">Size</th>
                    <th className="wm-right">Oracle mid</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((fill) => (
                    <FillRow key={fill.tx} fill={fill} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </Page>
  );
}
