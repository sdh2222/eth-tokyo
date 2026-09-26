import { Link, useSearchParams } from "react-router-dom";
import { useAccount } from "wagmi";
import { formatWadUsd } from "../desk/book";
import { buysEth, fillEth, fillPrice } from "../desk/fills";
import type { FillRecord } from "../desk/types";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { Badge, Card, Empty, Header, Metric, Metrics, Page } from "../ui/v";

// Fills: what traded, with whom, at what price. /fills?mine is the counterparty's "My fills"
// (only the connected wallet's fills). Vercel-style: totals card, then the table card with
// its filters in the card head and paging in the card foot.

const PAGE_SIZE = 25;

type SideFilter = "all" | "buy" | "sell";
const SIDE_OPTIONS: { label: string; value: SideFilter }[] = [
  { label: "All sides", value: "all" },
  { label: "Bought ETH", value: "buy" },
  { label: "Sold ETH", value: "sell" },
];

// The fill's price against the oracle mid, in basis points (+ above the mid).
function vsMidBps(fill: FillRecord): number {
  if (fill.midWad === 0n) return 0;
  return Number(((fillPrice(fill) - fill.midWad) * 10000n) / fill.midWad);
}

function FillRow({ fill, now }: { fill: FillRecord; now: number }) {
  const buys = buysEth(fill);
  const bps = vsMidBps(fill);
  return (
    <tr>
      <td className="v-muted">{formatWhen(fill.blockTime, now)}</td>
      <td>{fill.name}</td>
      <td>
        <Badge tone={buys ? "red" : "green"}>{buys ? "Bought ETH" : "Sold ETH"}</Badge>
      </td>
      <td className="v-right">{formatWeth(fillEth(fill))}</td>
      <td className="v-right">{`$${formatWadUsd(fillPrice(fill))}`}</td>
      <td className="v-right v-muted">{`${bps > 0 ? "+" : ""}${bps} bp`}</td>
      <td className="v-right">
        <Link className="v-mono" to={`/fills/${fill.tx}`}>
          {formatHash(fill.tx)}
        </Link>
      </td>
    </tr>
  );
}

export function FillsPage() {
  const [params, setParams] = useSearchParams();
  const mine = params.has("mine");
  const mm = params.get("mm");
  const sideParam = params.get("side");
  const side: SideFilter = sideParam === "buy" || sideParam === "sell" ? sideParam : "all";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const { address } = useAccount();
  const book = useBook();
  const now = useClock();
  const strategy = useLiveStrategy();
  const fills = useFills(strategy.data ?? null);

  function set(next: Record<string, string | null>) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === null) merged.delete(key);
      else merged.set(key, value);
    }
    setParams(merged);
  }

  const all = fills.data ?? [];
  const names = [...new Set([...(book.data?.names ?? []).map((name) => name.name), ...all.map((fill) => fill.name)])];
  const filtered = all.filter((fill) => {
    if (mine && (!address || fill.taker.toLowerCase() !== address.toLowerCase())) return false;
    if (!mine && mm && fill.name !== mm) return false;
    if (side === "buy" && !buysEth(fill)) return false;
    if (side === "sell" && buysEth(fill)) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);
  const bought = filtered.filter(buysEth).reduce((sum, fill) => sum + fill.amountOut, 0n);
  const sold = filtered.filter((fill) => !buysEth(fill)).reduce((sum, fill) => sum + fill.amountIn, 0n);
  const usdc = filtered.reduce((sum, fill) => sum + (buysEth(fill) ? fill.amountIn : fill.amountOut), 0n);
  const isFiltered = (!mine && mm !== null) || side !== "all";
  const reset = () => set({ mm: null, side: null, page: null });

  let empty = (
    <Empty
      picture
      title="No fills yet"
      description="Counterparties fill from the Trade page."
      action={
        <Link className="v-btn v-btn-secondary" to="/trade">
          Trade
        </Link>
      }
    />
  );
  if (fills.isLoading) {
    empty = <Empty title="Reading the fills…" />;
  } else if (mine && !address) {
    empty = <Empty title="Connect a wallet" description="My fills lists the fills your wallet made on the Trade page." />;
  } else if (all.length > 0 && isFiltered) {
    empty = (
      <Empty
        title="No fills match these filters"
        action={
          <button type="button" className="v-btn v-btn-secondary" onClick={reset}>
            Reset filters
          </button>
        }
      />
    );
  } else if (mine) {
    empty = (
      <Empty
        picture
        title="No fills yet"
        description="Your fills appear here after you fill from the Trade page."
        action={
          <Link className="v-btn v-btn-secondary" to="/trade">
            Trade
          </Link>
        }
      />
    );
  }

  const filters = (
    <div className="v-row v-row-8" role="group" aria-label="Fill filters">
      {mine ? null : (
        <select
          className="v-input"
          aria-label="Counterparty"
          value={mm ?? ""}
          onChange={(event) => set({ mm: event.target.value || null, page: null })}
        >
          <option value="">All counterparties</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      )}
      <select
        className="v-input"
        aria-label="Side"
        value={side}
        onChange={(event) => set({ side: event.target.value === "all" ? null : event.target.value, page: null })}
      >
        {SIDE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isFiltered ? (
        <button type="button" className="v-btn v-btn-tertiary" onClick={reset}>
          Reset
        </button>
      ) : null}
    </div>
  );

  return (
    <Page>
      <Header
        title={mine ? "My fills" : "Fills"}
        description={mine ? "Every fill your wallet made against this desk." : "Every fill against the desk, each with its own proof."}
      />

      <Card flush>
        <Metrics>
          <Metric label="Fills" value={String(filtered.length)} />
          <Metric label={mine ? "ETH you bought" : "ETH bought by counterparties"} value={formatWeth(bought)} />
          <Metric label={mine ? "ETH you sold" : "ETH sold by counterparties"} value={formatWeth(sold)} />
          <Metric label="USDC volume" value={formatUsdc(usdc)} />
        </Metrics>
      </Card>

      <Card
        title={mine ? "Your fills" : "All fills"}
        actions={filters}
        flush
        {...(filtered.length > PAGE_SIZE
          ? {
              footer: (
                <>
                  <span className="v-num">{`${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`}</span>
                  <span className="v-actions">
                    <button
                      type="button"
                      className="v-btn v-btn-secondary"
                      disabled={page <= 1}
                      onClick={() => set({ page: page - 1 <= 1 ? null : String(page - 1) })}
                    >
                      Previous
                    </button>
                    <button type="button" className="v-btn v-btn-secondary" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })}>
                      Next
                    </button>
                  </span>
                </>
              ),
            }
          : {})}
      >
        {rows.length === 0 ? (
          empty
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
                  <th className="v-right">vs mid</th>
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
