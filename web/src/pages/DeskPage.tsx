import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Table, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { formatBpsShare, formatWadUsd, type DeskBook } from "../desk/book";
import type { FillRecord } from "../desk/types";
import { useBook } from "../hooks/useBook";
import { formatCountdown, useClock } from "../hooks/useClock";
import { useDeskState, useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatUsdc, formatWeth } from "../lib/format";

// Dashboard (IA: "Is my desk trading, and does anything need me?").
// Built from the Astryx `dashboard` template: MetricCard tiles in a Grid, then TableCard.

const WINDOW_SECONDS = 600;

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card>
      <VStack gap={2}>
        <Heading level={4}>{label}</Heading>
        <Heading level={2}>{value}</Heading>
        <Text type="supporting" color="secondary">
          {note}
        </Text>
      </VStack>
    </Card>
  );
}

function TableCard<T extends { id: string }>({
  title,
  linkLabel,
  linkHref,
  data,
  columns,
}: {
  title: string;
  linkLabel: string;
  linkHref: string;
  data: T[];
  columns: TableColumn<T>[];
}) {
  return (
    <Card>
      <VStack gap={6}>
        <HStack hAlign="between" vAlign="center">
          <Heading level={4}>{title}</Heading>
          <Link href={linkHref}>{linkLabel}</Link>
        </HStack>
        <Table<T>
          data={data}
          columns={columns}
          idKey="id"
          density="compact"
          dividers="rows"
          hasHover
          emptyState={
            <EmptyState isCompact title="No fills yet" description="Counterparties fill from the Trade page." />
          }
        />
      </VStack>
    </Card>
  );
}

type FillRow = { id: string; tx: string; name: string; side: string; size: string; price: string };

const fillColumns: TableColumn<FillRow>[] = [
  { key: "tx", header: "Fill", width: proportional(2), renderCell: (row) => <Link href={`/fills/${row.tx}`}>{formatHash(row.tx)}</Link> },
  { key: "name", header: "Counterparty", width: proportional(3) },
  { key: "side", header: "Side", width: proportional(1) },
  { key: "size", header: "Size", width: proportional(2) },
  { key: "price", header: "Price", width: proportional(2) },
];

function toRow(fill: FillRecord, weth: string): FillRow {
  const buysEth = fill.tokenOut.toLowerCase() === weth.toLowerCase();
  const eth = buysEth ? fill.amountOut : fill.amountIn;
  return {
    id: fill.tx,
    tx: fill.tx,
    name: fill.name,
    side: buysEth ? "Buy ETH" : "Sell ETH",
    size: formatWeth(eth),
    price: formatWadUsd(fill.midWad),
  };
}

function needs(book: DeskBook, now: number, windowLeft: number): { label: string; href: string }[] {
  const items: { label: string; href: string }[] = [];
  if (windowLeft <= 0) items.push({ label: "The price window is closed until the next oracle update.", href: "/controls" });
  if (book.spread === null || !book.spread.live) items.push({ label: "No live agent spread: quoting on the terms widths.", href: "/agent" });
  for (const name of book.names) {
    if (!name.live) items.push({ label: `${name.name} can't trade right now.`, href: "/counterparties" });
    else if (name.expiry > 0n && Number(name.expiry) - now < 7 * 86400) {
      items.push({ label: `${name.name} expires within a week.`, href: "/counterparties" });
    }
  }
  return items;
}

export function DeskPage() {
  const book = useBook();
  const now = useClock();
  const strategy = useLiveStrategy();
  const desk = useDeskState(strategy.data ?? null);
  const fills = useFills(strategy.data ?? null);

  if (book.isLoading) return <Text type="body">Reading the desk…</Text>;
  if (!book.data) {
    return <EmptyState title="The desk could not be read" description="Check the Sepolia RPC in web/.env and reload." />;
  }

  const b = book.data;
  const updatedAt = Number(b.oracle.updatedAt);
  const windowLeft = updatedAt > now ? 0 : updatedAt + WINDOW_SECONDS - now;
  const midWad = b.oracle.answer * 10n ** 10n;
  const todo = needs(b, now, windowLeft);
  const weth = desk.data?.safeWallet.weth;
  const usdc = desk.data?.safeWallet.usdc;
  const rows = (fills.data ?? []).slice(0, 5).map((fill) => toRow(fill, "0x7Bd809623704F82eBaf04589220E57b174512ADB"));

  return (
    <VStack gap={6}>
      <VStack gap={2}>
        <Heading level={1}>Dashboard</Heading>
        <Text type="body" color="secondary">
          {b.name}
        </Text>
      </VStack>

      <Grid columns={{ minWidth: 240, repeat: "fit" }} gap={4}>
        <MetricCard
          label="Desk"
          value={strategy.data ? "Live" : "Not open"}
          note={strategy.data ? "The Safe's program is shipped to Aqua." : "No program is shipped."}
        />
        <MetricCard
          label="Price window"
          value={windowLeft > 0 ? formatCountdown(windowLeft) : "Closed"}
          note="Fills are allowed for 10 minutes after each oracle update."
        />
        <MetricCard
          label="ETH share"
          value={formatBpsShare(b.inventory.wBps)}
          note={`The desk stops selling ETH at ${formatBpsShare(b.inventory.wStarBps)}.`}
        />
        <MetricCard label="Oracle mid" value={`$${formatWadUsd(midWad)}`} note={b.oracle.fresh ? "Fresh" : "Older than the window"} />
      </Grid>

      <Grid columns={{ minWidth: 320, repeat: "fit" }} gap={4}>
        <Card>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={4}>Live quote</Heading>
              {b.quote ? (
                <Link href="/agent">
                  <Token label={b.quote.source === "spread" ? "Agent spread" : "Terms"} />
                </Link>
              ) : null}
            </HStack>
            {b.quote ? (
              <HStack gap={8}>
                <VStack gap={1}>
                  <Text type="supporting" color="secondary">
                    Ask · counterparty buys ETH
                  </Text>
                  <Heading level={2}>{`$${formatWadUsd(b.quote.ask)}`}</Heading>
                </VStack>
                <VStack gap={1}>
                  <Text type="supporting" color="secondary">
                    Bid · counterparty sells ETH
                  </Text>
                  <Heading level={2}>{`$${formatWadUsd(b.quote.bid)}`}</Heading>
                </VStack>
              </HStack>
            ) : (
              <Text type="body">No quote: the terms on the client names disagree or are missing.</Text>
            )}
            {b.terms ? (
              <Text type="supporting" color="secondary">
                {`Terms fence: sell ${b.terms.sellBps} bp · buy ${b.terms.buyBps} bp · cap ${formatWeth(b.terms.cap)} per fill`}
              </Text>
            ) : null}
          </VStack>
        </Card>

        <Card>
          <VStack gap={4}>
            <Heading level={4}>Inventory</Heading>
            <ProgressBar
              label="ETH share of the Safe book"
              value={b.inventory.wBps / 100}
              max={100}
              hasValueLabel
              marks={[{ value: b.inventory.wStarBps / 100, label: `Target ${formatBpsShare(b.inventory.wStarBps)}` }]}
            />
            <Text type="supporting" color="secondary">
              {weth !== undefined && usdc !== undefined
                ? `In the Safe: ${formatWeth(weth)} · ${formatUsdc(usdc)}`
                : "Tokens stay in the Safe until each fill."}
            </Text>
          </VStack>
        </Card>
      </Grid>

      <Card>
        <VStack gap={4}>
          <Heading level={4}>Needs you</Heading>
          {todo.length === 0 ? (
            <HStack gap={2} vAlign="center">
              <StatusDot variant="success" label="Nothing needs you" />
              <Text type="body">Nothing needs you.</Text>
            </HStack>
          ) : (
            <List hasDividers>
              {todo.map((item) => (
                <ListItem
                  key={item.label}
                  label={item.label}
                  startContent={<StatusDot variant="warning" label="Needs attention" />}
                  href={item.href}
                />
              ))}
            </List>
          )}
        </VStack>
      </Card>

      <TableCard title="Recent fills" linkLabel="All fills" linkHref="/fills" data={rows} columns={fillColumns} />
    </VStack>
  );
}
