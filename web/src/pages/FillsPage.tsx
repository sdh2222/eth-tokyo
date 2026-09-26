import { Link, useSearchParams } from "react-router-dom";
import { useAccount } from "wagmi";
import sepoliaConfig from "@config";
import { formatWadUsd } from "../desk/book";
import type { DeskConfig, FillRecord } from "../desk/types";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { Empty, Page, PageHead, Section, Stat } from "../ui/plain";

// Fills (IA: "What traded, with whom, at what price?"). /fills?mine is the counterparty's
// "My fills": only the connected wallet's fills. Plain page kit.
// Screens SC-22: the filters are one row above the table.

const WETH = (sepoliaConfig as DeskConfig).tokens.weth.toLowerCase();
const PAGE_SIZE = 25;
const WAD = 10n ** 18n;
type SideFilter = "all" | "buy" | "sell";
const SIDE_OPTIONS: { label: string; value: SideFilter }[] = [
  { label: "All sides", value: "all" },
  { label: "Bought ETH", value: "buy" },
  { label: "Sold ETH", value: "sell" },
];

function buysEth(fill: FillRecord): boolean {
  return fill.tokenOut.toLowerCase() === WETH;
}

// The fill's own price in USD per ETH (wad): USDC has 6 decimals, WETH 18.
function fillPrice(fill: FillRecord): bigint {
  const eth = buysEth(fill) ? fill.amountOut : fill.amountIn;
  const usdc = buysEth(fill) ? fill.amountIn : fill.amountOut;
  return eth === 0n ? 0n : (usdc * 10n ** 12n * WAD) / eth;
}

function FillRow({ fill, now }: { fill: FillRecord; now: number }) {
  const buys = buysEth(fill);
  return (
    <tr>
      <td className="wm-muted">{formatWhen(fill.blockTime, now)}</td>
      <td>
        <Link to={`/fills/${fill.tx}`}>{formatHash(fill.tx)}</Link>
      </td>
      <td>{fill.name}</td>
      <td className={buys ? "wm-ask" : "wm-bid"}>{buys ? "Bought ETH" : "Sold ETH"}</td>
      <td className="wm-right">{formatWeth(buys ? fill.amountOut : fill.amountIn)}</td>
      <td className="wm-right">{`$${formatWadUsd(fillPrice(fill))}`}</td>
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
      title="No fills yet. Counterparties fill from the Trade page."
      action={
        <Link className="wm-link" to="/trade">
          Trade
        </Link>
      }
    />
  );
  if (fills.isLoading) {
    empty = <Empty title="Reading the fills…" />;
  } else if (mine && !address) {
    empty = <Empty title="Connect a wallet to see your fills. My fills lists the fills your wallet made on the Trade page." />;
  } else if (all.length > 0 && isFiltered) {
    empty = (
      <Empty
        title="No fills match these filters."
        action={
          <button type="button" className="wm-link" onClick={reset}>
            Reset
          </button>
        }
      />
    );
  } else if (mine) {
    empty = (
      <Empty
        title="No fills yet. Your fills appear here after you fill from the Trade page."
        action={
          <Link className="wm-link" to="/trade">
            Trade
          </Link>
        }
      />
    );
  }

  return (
    <Page>
      <PageHead
        title={mine ? "My fills" : "Fills"}
        lede={mine ? "Every fill your wallet made against this desk." : "What traded, with whom, at what price."}
      />

      <div className="wm-stats">
        <Stat label="Fills" value={String(filtered.length)} />
        <Stat label={mine ? "ETH you bought" : "ETH bought by counterparties"} value={formatWeth(bought)} />
        <Stat label={mine ? "ETH you sold" : "ETH sold by counterparties"} value={formatWeth(sold)} />
        <Stat label="USDC volume" value={formatUsdc(usdc)} />
      </div>

      <div className="wm-grid">
        <Section title={mine ? "Your fills" : "All fills"} className="wm-span-12">
          <div className="wm-row wm-row-24 wm-row-end" role="group" aria-label="Fill filters">
            {mine ? null : (
              <label className="wm-field">
                <span>Counterparty</span>
                <select className="wm-input" value={mm ?? ""} onChange={(event) => set({ mm: event.target.value || null, page: null })}>
                  <option value="">All counterparties</option>
                  {names.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="wm-field">
              <span>Side</span>
              <select
                className="wm-input"
                value={side}
                onChange={(event) => set({ side: event.target.value === "all" ? null : event.target.value, page: null })}
              >
                {SIDE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="wm-link" onClick={reset} disabled={!isFiltered}>
              Reset
            </button>
          </div>

          {rows.length === 0 ? (
            empty
          ) : (
            <div className="wm-table-wrap">
              <table className="wm-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Fill</th>
                    <th>Counterparty</th>
                    <th>Side</th>
                    <th className="wm-right">Size</th>
                    <th className="wm-right">Price</th>
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

          {filtered.length > PAGE_SIZE ? (
            <nav className="wm-row wm-row-24" aria-label="Pages">
              <span className="wm-muted wm-num">
                {`${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </span>
              <button type="button" className="wm-link" disabled={page <= 1} onClick={() => set({ page: page - 1 <= 1 ? null : String(page - 1) })}>
                Previous
              </button>
              <button type="button" className="wm-link" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })}>
                Next
              </button>
            </nav>
          ) : null}
        </Section>

      </div>
    </Page>
  );
}
