import { Link } from "react-router-dom";
import { formatBpsShare, formatWadUsd, nameQuote, shortName } from "../desk/book";
import { buysEth, fillEth, fillPrice } from "../desk/fills";
import type { FillRecord } from "../desk/types";
import { useAgentWrites, writeFor } from "../hooks/useAgentWrites";
import { useBook } from "../hooks/useBook";
import { formatCountdown, useClock } from "../hooks/useClock";
import { useDeskState, useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { Badge, Card, Empty, Header, Metric, Metrics, Page, Status } from "../ui/v";
import { PRICE_WINDOW_SECONDS } from "../desk/window";

// Dashboard: is the desk live, what does each counterparty pay now, what is in the Safe,
// and what just traded. Numbers only; how the agent sets widths is on the Risk agent page.


function FillRow({ fill, now }: { fill: FillRecord; now: number }) {
  return (
    <tr>
      <td className="v-muted">{formatWhen(fill.blockTime, now)}</td>
      <td>{fill.name}</td>
      <td>{buysEth(fill) ? "Bought ETH" : "Sold ETH"}</td>
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
  const fills = useFills(strategy.data ?? null, strategy.isLoading);
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
            description="Opening a desk ships the program to Aqua in one Safe transaction."
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
  const windowLeft = updatedAt > now ? 0 : updatedAt + PRICE_WINDOW_SECONDS - now;
  const midWad = b.oracle.answer * 10n ** 10n;
  const weth = desk.data?.safeWallet.weth;
  const usdc = desk.data?.safeWallet.usdc;
  const rows = (fills.data ?? []).slice(0, 8);

  return (
    <Page>
      <Header title="Dashboard" description={b.name} actions={<Badge tone="green">Live</Badge>} />

      <Card flush>
        <Metrics>
          <Metric
            label="Oracle mid"
            value={`$${formatWadUsd(midWad)}`}
            hint={
              <Status tone={windowLeft > 60 ? "green" : windowLeft > 0 ? "amber" : "red"}>
                {windowLeft > 0 ? `Fills open for ${formatCountdown(windowLeft)}` : "Fills closed until the next update"}
              </Status>
            }
          />
          <Metric label="ETH share" value={formatBpsShare(b.inventory.wBps)} hint={`Sells no ETH at ${formatBpsShare(b.inventory.wStarBps)}`} />
          <Metric label="WETH in the Safe" value={weth !== undefined ? formatWeth(weth) : "—"} />
          <Metric label="USDC in the Safe" value={usdc !== undefined ? formatUsdc(usdc) : "—"} />
        </Metrics>
      </Card>

      <Card title="Prices now" flush>
        <div className="v-table-wrap">
          <table className="v-table">
            <thead>
              <tr>
                <th>Counterparty</th>
                <th className="v-right">Bid</th>
                <th className="v-right">Ask</th>
                <th className="v-right">Widths</th>
                <th className="v-right">Set</th>
              </tr>
            </thead>
            <tbody>
              {b.names.map((name) => {
                const q = nameQuote(b, name);
                const write = writeFor(writes.data, name.name);
                return (
                  <tr key={name.name}>
                    <td>{shortName(name.name)}</td>
                    <td className="v-right">{q && name.live ? `$${formatWadUsd(q.bid)}` : "—"}</td>
                    <td className="v-right">{q && name.live ? `$${formatWadUsd(q.ask)}` : "—"}</td>
                    <td className="v-right v-muted">{q && name.live ? `−${q.buyBps} / +${q.sellBps} bp` : "Can't trade"}</td>
                    <td className="v-right v-muted">
                      {q?.source === "terms" ? "Terms" : write ? formatWhen(write.writtenAt, now) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
        {rows.length === 0 && fills.isLoading ? (
          <Empty title="Reading the fills…" />
        ) : rows.length === 0 ? (
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
