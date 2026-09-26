import { Link } from "react-router-dom";
import { formatBpsShare, formatWadUsd, nameQuote, shortName, type DeskBook } from "../desk/book";
import { buysEth, fillEth, fillPrice } from "../desk/fills";
import type { FillRecord } from "../desk/types";
import { useAgentWrites, writeFor } from "../hooks/useAgentWrites";
import { useBook } from "../hooks/useBook";
import { formatCountdown, useClock } from "../hooks/useClock";
import { useDeskState, useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { InventoryCells, SpreadStrip, WindowCells } from "../ui/cells";
import { Badge, Card, Dl, Empty, Header, Metric, Metrics, Note, Page, Status } from "../ui/v";

// Dashboard: the state of the desk at a glance. Main's flow (PR #34): each counterparty is
// priced from its own agent spread, which the risk agent rewrites after each of its fills.
// Vercel-style: metrics, then quotes by counterparty, inventory, and recent fills. Read-only.

const WINDOW_SECONDS = 600;

type Need = { label: string; href: string; action: string };

function firstNeed(book: DeskBook, now: number): Need | null {
  for (const name of book.names) {
    if (name.live && !name.spread?.live) {
      return { label: `${shortName(name.name)} has no live agent spread and is quoted on its terms.`, href: "/agent", action: "Risk agent" };
    }
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
      <td className="v-right v-muted">{`${fill.spreadBps} bp`}</td>
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
  const writes = useAgentWrites();
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
  const fence = b.terms;

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
          <Metric label="Oracle mid" value={`$${formatWadUsd(midWad)}`} hint={b.oracle.fresh ? "Fresh" : "Older than the price window"} large />
          <Metric
            label="Price window"
            value={windowLeft > 0 ? formatCountdown(windowLeft) : "Closed"}
            hint={<WindowCells secondsLeft={windowLeft} windowSeconds={WINDOW_SECONDS} />}
          />
          <Metric label="ETH share" value={formatBpsShare(b.inventory.wBps)} hint={`Stops selling ETH at ${formatBpsShare(b.inventory.wStarBps)}`} />
          <Metric
            label="Terms fence"
            value={fence ? `+${fence.sellBps} / −${fence.buyBps} bp` : "—"}
            hint={fence ? `Cap ${formatWeth(fence.cap)} per fill` : "No terms"}
          />
        </Metrics>
      </Card>

      <Card
        title="Quotes by counterparty"
        flush
        actions={
          <Link className="v-btn v-btn-secondary" to="/agent">
            Risk agent
          </Link>
        }
        footer="The router prices each fill from that counterparty's own spread, inside its terms. The risk agent rewrites it after each of its fills."
      >
        <div className="v-table-wrap">
          <table className="v-table">
            <thead>
              <tr>
                <th>Counterparty</th>
                <th>Source</th>
                <th className="v-right">Bid</th>
                <th className="v-right">Ask</th>
                <th>Widths around the mid</th>
                <th>Agent's last write</th>
              </tr>
            </thead>
            <tbody>
              {b.names.map((name) => {
                const q = nameQuote(b, name);
                const write = writeFor(writes.data, name.name);
                return (
                  <tr key={name.name}>
                    <td>{shortName(name.name)}</td>
                    <td>
                      {!name.live ? (
                        <Badge tone="red">Can't trade</Badge>
                      ) : q?.source === "agent" ? (
                        <Badge tone="blue">Agent spread</Badge>
                      ) : (
                        <Badge>Terms</Badge>
                      )}
                    </td>
                    <td className="v-right">{q ? `$${formatWadUsd(q.bid)}` : "—"}</td>
                    <td className="v-right">{q ? `$${formatWadUsd(q.ask)}` : "—"}</td>
                    <td>
                      {q ? (
                        <SpreadStrip
                          sellBps={q.sellBps}
                          buyBps={q.buyBps}
                          fenceSellBps={name.terms?.sellBps}
                          fenceBuyBps={name.terms?.buyBps}
                        />
                      ) : null}
                    </td>
                    <td className="v-muted">
                      {write ? `${formatWhen(write.writtenAt, now)}${write.note ? ` · ${write.note}` : ""}` : "No write yet"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Inventory">
        <div className="v-grid">
          <div className="v-col-6">
            <InventoryCells shareBps={b.inventory.wBps} stopBps={b.inventory.wStarBps} />
          </div>
          <div className="v-col-6">
            <Dl
              items={[
                ["WETH in the Safe", weth !== undefined ? formatWeth(weth) : "—"],
                ["USDC in the Safe", usdc !== undefined ? formatUsdc(usdc) : "—"],
                ["ETH share", formatBpsShare(b.inventory.wBps)],
                [
                  "Policy step now",
                  b.inventory.wBps > b.inventory.wStarBps ? (
                    <Status tone="blue">Above 70%: the agent sells 1 bp tighter and buys 1 bp wider</Status>
                  ) : (
                    <Status tone="amber">At or below 70%: the desk does not sell ETH</Status>
                  ),
                ],
              ]}
            />
          </div>
        </div>
      </Card>

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
          <Empty picture="pier" title="No fills yet" description="Counterparties fill from the Trade page." />
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
                  <th className="v-right">Width paid</th>
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
