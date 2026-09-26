import { useSearchParams } from "react-router-dom";
import { useAccount } from "wagmi";
import sepoliaConfig from "@config";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Pagination } from "@astryxdesign/core/Pagination";
import { Selector } from "@astryxdesign/core/Selector";
import { Table, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { formatWadUsd } from "../desk/book";
import type { DeskConfig, FillRecord } from "../desk/types";
import { useBook } from "../hooks/useBook";
import { useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatUsdc, formatWeth } from "../lib/format";

// Fills (IA: "What traded, with whom, at what price?"). /fills?mine is the counterparty's
// "My fills": only the connected wallet's fills. Built from the Astryx ToolbarTableFilter
// template (Toolbar + Selectors + Table), PaginationWithTable (count variant below the table), and the
// DeskPage TableCard; totals are a MetadataList (MetadataListMultiColumnMetadata).

const WETH = (sepoliaConfig as DeskConfig).tokens.weth.toLowerCase();
const PAGE_SIZE = 25;
const WAD = 10n ** 18n;
type SideFilter = "all" | "buy" | "sell";
// Three options, not two: the Selector page says two options belong in a SegmentedControl.
const SIDE_OPTIONS = [
  { label: "All sides", value: "all" },
  { label: "Buy ETH", value: "buy" },
  { label: "Sell ETH", value: "sell" },
];

type FillRow = { id: string; tx: string; time: number; name: string; side: string; size: string; price: string };

const columns: TableColumn<FillRow>[] = [
  { key: "time", header: "Time", width: proportional(1), renderCell: (row) => <Timestamp value={row.time} /> },
  { key: "tx", header: "Fill", width: proportional(1), renderCell: (row) => <Link href={`/fills/${row.tx}`}>{formatHash(row.tx)}</Link> },
  { key: "name", header: "Counterparty", width: proportional(2) },
  { key: "side", header: "Side", width: proportional(1) },
  { key: "size", header: "Size", width: proportional(1) },
  { key: "price", header: "Price", width: proportional(1) },
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

function toRow(fill: FillRecord): FillRow {
  const buys = buysEth(fill);
  return {
    id: fill.tx,
    tx: fill.tx,
    time: fill.blockTime,
    name: fill.name,
    side: buys ? "Buy ETH" : "Sell ETH",
    size: formatWeth(buys ? fill.amountOut : fill.amountIn),
    price: `$${formatWadUsd(fillPrice(fill))}`,
  };
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
  const start = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE).map(toRow);
  const bought = filtered.filter(buysEth).reduce((sum, fill) => sum + fill.amountOut, 0n);
  const sold = filtered.filter((fill) => !buysEth(fill)).reduce((sum, fill) => sum + fill.amountIn, 0n);
  const usdc = filtered.reduce((sum, fill) => sum + (buysEth(fill) ? fill.amountIn : fill.amountOut), 0n);
  const isFiltered = (!mine && mm !== null) || side !== "all";

  let empty = { title: "No fills yet", description: "Counterparties fill from the Trade page." };
  if (mine && !address) {
    empty = { title: "Connect a wallet to see your fills", description: "My fills lists the fills your wallet made on the Trade page." };
  } else if (all.length > 0 && isFiltered) {
    empty = { title: "No fills match these filters", description: "Clear the counterparty or side filter to see every fill." };
  } else if (mine) {
    empty = { title: "No fills yet", description: "Your fills appear here after you fill from the Trade page." };
  }

  return (
    <VStack gap={6}>
      <VStack gap={2}>
        <Heading level={1}>{mine ? "My fills" : "Fills"}</Heading>
        <Text type="body" color="secondary">
          {mine ? "Every fill your wallet made against this desk." : "Every fill against this desk, with whom and at what price."}
        </Text>
      </VStack>

      <Card>
        <VStack gap={4}>
          <Toolbar
            label="Fill filters"
            size="sm"
            dividers={["bottom"]}
            startContent={
              <>
                {mine ? null : (
                  <Selector
                    label="Counterparty"
                    isLabelHidden
                    placeholder="Counterparty"
                    hasClear
                    value={mm}
                    onChange={(value) => set({ mm: value, page: null })}
                    options={names}
                  />
                )}
                <Selector
                  label="Side"
                  isLabelHidden
                  placeholder="Side"
                  value={side}
                  onChange={(value) => set({ side: value === "all" ? null : value, page: null })}
                  options={SIDE_OPTIONS}
                />
              </>
            }
          />
          <Table<FillRow>
            data={rows}
            columns={columns}
            idKey="id"
            density="compact"
            dividers="rows"
            hasHover
            emptyState={<EmptyState isCompact title={empty.title} description={empty.description} />}
          />
          {filtered.length > PAGE_SIZE ? (
            <Pagination
              page={page}
              onChange={(next) => set({ page: String(next) })}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              variant="count"
              size="sm"
            />
          ) : null}
        </VStack>
      </Card>

      <Card>
        <VStack gap={4}>
          <Heading level={4}>Totals</Heading>
          <MetadataList columns="multi">
            <MetadataListItem label="Fills">{String(filtered.length)}</MetadataListItem>
            <MetadataListItem label={mine ? "ETH you bought" : "ETH bought by counterparties"}>{formatWeth(bought)}</MetadataListItem>
            <MetadataListItem label={mine ? "ETH you sold" : "ETH sold by counterparties"}>{formatWeth(sold)}</MetadataListItem>
            <MetadataListItem label="USDC volume">{formatUsdc(usdc)}</MetadataListItem>
          </MetadataList>
        </VStack>
      </Card>
    </VStack>
  );
}
