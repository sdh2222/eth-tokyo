import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { Table } from "@astryxdesign/core/Table";
import { pixel, proportional, type TableColumn } from "@astryxdesign/core/Table/utils";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { Role } from "../../app/role";
import { BANNER_NONE, BANNER_STALE, BANNER_STALE_TAIL, CONTROLS, NAV_LABEL, TRADING_AS } from "../../copy/en";
import { emptyConfig, NOW } from "../../desk/fixture/state";
import type { DeskState, FillRecord, MmState } from "../../desk/types";
import { AGENT_ENS_NAME } from "../../ens/names";
import { useDeskPort, useDeskState, useFills, useLiveStrategy } from "../../hooks/useDesk";
import { useOracleRound } from "../../hooks/useOracle";
import {
  formatAddr,
  formatBps,
  formatHash,
  formatPrice,
  formatShare,
  formatSkewBps,
  formatUsd,
  formatUsdc,
  formatVsMidBps,
  formatWeth,
} from "../../lib/format";
import { formatWhen } from "../../lib/time";
import "./shell-pages.css";

const WAD = 10n ** 18n;
const SCALE = 10n ** 30n;
const WETH = emptyConfig().tokens.weth;

export function DismissibleNotices() {
  return (
    <div className="mul-banners">
      <Banner
        status="warning"
        container="section"
        isDismissable
        title={`${BANNER_STALE} 60 ${BANNER_STALE_TAIL}`}
        endContent={<Button label={CONTROLS} variant="ghost" />}
      />
      <Banner
        status="info"
        container="section"
        isDismissable
        title={BANNER_NONE}
        endContent={<Button label={NAV_LABEL.open} variant="ghost" />}
      />
    </div>
  );
}

export function ShellPages({ page }: { role: Role; page: string }) {
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  const fills = useFills(live.data ?? null);
  const oracle = useOracleRound();
  const now = import.meta.env.VITE_DESK_MODE === "live" ? Math.floor(Date.now() / 1000) : NOW;
  const desk = state.data ?? null;
  const rows = fills.data ?? [];
  const mid = oracle.data?.midWad ?? desk?.pWad;
  const updatedAt = oracle.data?.updatedAt ?? desk?.oracleUpdatedAt;
  const stale = oracle.data?.stale ?? desk?.oracleStale ?? false;
  const pending = live.isPending || (live.data != null && state.isPending);

  return (
    <main className="mul-page">
      <Screen
        page={page}
        desk={desk}
        rows={rows}
        mid={mid}
        now={now}
        hash={live.data?.strategyHash}
        live={live.data?.live ?? false}
        pending={pending}
        fillsPending={fills.isPending}
        updatedAt={updatedAt}
        stale={stale}
      />
    </main>
  );
}

function Screen({
  page,
  desk,
  rows,
  mid,
  now,
  hash,
  live,
  pending,
  fillsPending,
  updatedAt,
  stale,
}: {
  page: string;
  desk: DeskState | null;
  rows: FillRecord[];
  mid: bigint | undefined;
  now: number;
  hash: string | undefined;
  live: boolean;
  pending: boolean;
  fillsPending: boolean;
  updatedAt: number | undefined;
  stale: boolean;
}) {
  if (isDashboard(page)) {
    return (
      <Dashboard
        title={page}
        desk={desk}
        rows={rows}
        mid={mid}
        now={now}
        hash={hash}
        live={live}
        pending={pending}
        fillsPending={fillsPending}
        updatedAt={updatedAt}
        stale={stale}
      />
    );
  }
  if (pending) {
    return (
      <>
        <Heading level={1}>{page}</Heading>
        <Skeleton height={160} />
      </>
    );
  }
  if (page === "Desks") return <Desks desk={desk} hash={hash} live={live} />;
  if (page === "Trade") return <Trade desk={desk} mid={mid} />;
  if (page === "Fills") return <Fills rows={rows} mid={mid ?? desk?.pWad ?? 0n} now={now} pending={fillsPending} />;
  if (page === "Records") return <Records rows={rows} />;
  if (page === "Counterparties") return <Counterparties desk={desk} now={now} />;
  if (page === "Control center") return <Controls hash={hash} />;
  if (page === "Programs") return <Programs />;
  if (page === "Agent") return <Agent />;
  if (page === "Compare") return <Compare />;
  if (page === "API") return <ApiNote />;
  return null;
}

function isDashboard(page: string): boolean {
  return page === "Dashboard" || page.endsWith(" Dashboard");
}

function Dashboard({
  title,
  desk,
  rows,
  mid,
  now,
  hash,
  live,
  pending,
  fillsPending,
  updatedAt,
  stale,
}: {
  title: string;
  desk: DeskState | null;
  rows: FillRecord[];
  mid: bigint | undefined;
  now: number;
  hash: string | undefined;
  live: boolean;
  pending: boolean;
  fillsPending: boolean;
  updatedAt: number | undefined;
  stale: boolean;
}) {
  return (
    <>
      <Heading level={1}>{title}</Heading>
      {pending ? (
        <DeskSkeleton />
      ) : (
        <>
          <StatusLine desk={desk} mid={mid} now={now} hash={hash} live={live} updatedAt={updatedAt} stale={stale} />
          {hash ? (
            <Collapsible trigger="Full hash" defaultIsOpen={false}>
              <Code>{hash}</Code>
            </Collapsible>
          ) : null}
          {desk ? (
            <div className="mul-board">
              <Inventory desk={desk} />
              <QuoteBoard mms={desk.mms} />
            </div>
          ) : (
            <EmptyState title="No desk is open" headingLevel={2} />
          )}
          <FillsTable rows={rows} mid={mid ?? desk?.pWad ?? 0n} now={now} pending={fillsPending} />
        </>
      )}
    </>
  );
}

function DeskSkeleton() {
  return (
    <div aria-busy="true">
      <VStack gap={8}>
        <Skeleton height={24} />
        <div className="mul-board">
          <Skeleton height={160} index={1} />
          <Skeleton height={160} index={2} />
        </div>
        <Skeleton height={160} index={3} />
      </VStack>
    </div>
  );
}

function StatusLine({
  desk,
  mid,
  now,
  hash,
  live,
  updatedAt,
  stale,
}: {
  desk: DeskState | null;
  mid: bigint | undefined;
  now: number;
  hash: string | undefined;
  live: boolean;
  updatedAt: number | undefined;
  stale: boolean;
}) {
  const status = deskStatus(desk, live);
  const maxStaleness = desk?.maxStaleness ?? emptyConfig().desk.maxStaleness;
  const age = updatedAt == null ? 0 : Math.max(0, now - updatedAt);
  const tone = ageTone(age, maxStaleness, stale);
  const ageText = updatedAt == null ? null : updatedAgo(updatedAt, now);

  return (
    <HStack gap={4} align="center">
      <Badge variant={status.variant} label={status.label} />
      {hash ? <Code>{formatHash(hash)}</Code> : null}
      {hash ? (
        <IconButton
          label="Copy strategy hash"
          icon={<Icon icon="copy" />}
          variant="ghost"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(hash);
          }}
        />
      ) : null}
      {desk ? <Text type="body">{closesIn(desk.deadline, now)}</Text> : null}
      <Text type="body">{mid !== undefined ? formatUsd(mid) : "—"}</Text>
      <Text type="body">Oracle</Text>
      {ageText ? <Age tone={tone} text={ageText} /> : null}
    </HStack>
  );
}

function Age({ tone, text }: { tone: "ok" | "warn" | "stale"; text: string }) {
  if (tone === "warn") return <Badge variant="warning" label={text} />;
  if (tone === "stale") return <Badge variant="error" label={text} />;
  return <Text type="body">{text}</Text>;
}

function Inventory({ desk }: { desk: DeskState }) {
  const share = percentOfWad(desk.wWad);
  const target = percentOfWad(desk.targetWad);
  const sentence = `${formatShare(desk.wWad)} ETH · target ${(desk.targetWad * 100n) / WAD}% · skew ${formatSkewBps(emptyConfig().desk.kappaBps, desk.wWad, desk.targetWad)}`;
  return (
    <VStack gap={4}>
      <MetadataList columns={2} label={{ position: "top" }}>
        <MetadataListItem label="WETH">{formatWeth(desk.balances.weth)}</MetadataListItem>
        <MetadataListItem label="USDC">{formatUsdc(desk.balances.usdc)}</MetadataListItem>
      </MetadataList>
      <ProgressBar label="ETH share" value={share} marks={[{ value: target, label: `target ${target}%` }]} />
      <Text type="body">{sentence}</Text>
      <Text type="body">
        In the Safe: {formatWeth(desk.safeWallet.weth)} · {formatUsdc(desk.safeWallet.usdc)}
      </Text>
    </VStack>
  );
}

function QuoteBoard({ mms }: { mms: DeskState["mms"] }) {
  const data = mms.map((mm) => quoteRow(mm));
  return (
    <VStack gap={4}>
      <Table data={data} columns={QUOTE_COLUMNS} density="compact" idKey="id" />
      <Text type="body">Prices for a 1 ETH fill. Larger fills can carry a size floor.</Text>
    </VStack>
  );
}

function FillsTable({
  rows,
  mid,
  now,
  pending,
}: {
  rows: FillRecord[];
  mid: bigint;
  now: number;
  pending: boolean;
}) {
  if (pending) return <Skeleton height={160} />;
  const data = fillRows(rows, mid, now);
  if (data.length === 0) {
    return <EmptyState title="No fills yet. Market makers see this desk on the Trade page." headingLevel={2} />;
  }
  return <Table data={data} columns={FILL_COLUMNS} density="compact" idKey="id" />;
}

function Desks({ desk, hash, live }: { desk: DeskState | null; hash: string | undefined; live: boolean }) {
  const status = deskStatus(desk, live);
  return (
    <>
      <Heading level={1}>Desks</Heading>
      <MetadataList label={{ position: "top" }}>
        <MetadataListItem label="Status">{status.label}</MetadataListItem>
        <MetadataListItem label="Hash">{hash ? formatHash(hash) : "—"}</MetadataListItem>
        <MetadataListItem label="WETH">{desk ? formatWeth(desk.balances.weth) : "—"}</MetadataListItem>
        <MetadataListItem label="USDC">{desk ? formatUsdc(desk.balances.usdc) : "—"}</MetadataListItem>
      </MetadataList>
    </>
  );
}

function Trade({ desk, mid }: { desk: DeskState | null; mid: bigint | undefined }) {
  const open = desk?.mms.find((mm) => mm.status === "ok");
  const identity = open
    ? `${TRADING_AS} ${open.name}${open.terms ? ` · tier ${formatBps(open.terms.tierBps)} · cap ${formatUsdc(open.terms.cap)} per fill` : ""}`
    : "This wallet isn't on the desk's list.";
  return (
    <>
      <Heading level={1}>Trade</Heading>
      <Text type="body">{identity}</Text>
      <MetadataList label={{ position: "top" }}>
        <MetadataListItem label="Ask">{open ? formatPrice(open.askWad) : "—"}</MetadataListItem>
        <MetadataListItem label="Bid">{open ? formatPrice(open.bidWad) : "—"}</MetadataListItem>
        <MetadataListItem label="Mid">{mid !== undefined ? formatUsd(mid) : "—"}</MetadataListItem>
      </MetadataList>
    </>
  );
}

function Fills({
  rows,
  mid,
  now,
  pending,
}: {
  rows: FillRecord[];
  mid: bigint;
  now: number;
  pending: boolean;
}) {
  return (
    <>
      <Heading level={1}>Fills</Heading>
      <FillsTable rows={rows} mid={mid} now={now} pending={pending} />
    </>
  );
}

function Records({ rows }: { rows: FillRecord[] }) {
  const name = rows[0]?.dnsName ?? "—";
  return (
    <>
      <Heading level={1}>Records</Heading>
      <Text type="body">{name}</Text>
    </>
  );
}

function Compare() {
  return (
    <>
      <Heading level={1}>Compare</Heading>
      <Text type="body">This desk against other venues.</Text>
    </>
  );
}

function ApiNote() {
  return (
    <>
      <Heading level={1}>API</Heading>
      <Text type="body">The taker reads the desk.</Text>
    </>
  );
}

type PartyRow = {
  [key: string]: unknown;
  id: string;
  name: string;
  address: string;
  expiry: string;
  tier: string;
  cap: string;
  status: string;
};

function Counterparties({ desk, now }: { desk: DeskState | null; now: number }) {
  const data: PartyRow[] = (desk?.mms ?? []).map((mm) => ({
    id: mm.address,
    name: mm.name,
    address: formatAddr(mm.address),
    expiry: formatWhen(mm.expiry, now),
    tier: mm.terms ? formatBps(mm.terms.tierBps) : "—",
    cap: mm.terms ? formatUsdc(mm.terms.cap) : "—",
    status: quoteStatus(mm.status).label,
  }));
  return (
    <>
      <Heading level={1}>Counterparties</Heading>
      <Table data={data} columns={PARTY_COLUMNS} density="compact" idKey="id" />
    </>
  );
}

function Controls({ hash }: { hash: string | undefined }) {
  const port = useDeskPort();
  const lines = port.describeProgram({ deadline: 0n, salt: 0n, unknown: [] }, emptyConfig());
  return (
    <>
      <Heading level={1}>Control center</Heading>
      <VStack gap={2}>
        {lines.map((line) => (
          <Text key={line} type="body">
            {line}
          </Text>
        ))}
      </VStack>
      {hash ? <Code>{hash}</Code> : null}
      <HStack gap={4} align="center">
        <Button label="Change" variant="primary" />
        <Button label="Stop the desk" variant="destructive" />
      </HStack>
    </>
  );
}

function Programs() {
  const port = useDeskPort();
  const lines = port.describeProgram({ deadline: 0n, salt: 0n, unknown: [] }, emptyConfig());
  return (
    <>
      <Heading level={1}>Programs</Heading>
      <VStack gap={2}>
        {lines.map((line) => (
          <Text key={line} type="body">
            {line}
          </Text>
        ))}
      </VStack>
    </>
  );
}

function Agent() {
  return (
    <>
      <Heading level={1}>Agent</Heading>
      <Text type="body">{AGENT_ENS_NAME}</Text>
      <Text type="body">
        The agent can only change one number per market maker, inside the range the treasury set. It can't block trading.
      </Text>
    </>
  );
}

type QuoteRow = {
  [key: string]: unknown;
  id: string;
  name: string;
  status: MmState["status"];
  tier: string;
  agent: string;
  spread: string;
  bid: string;
  ask: string;
  cap: string;
};

type FillRow = {
  [key: string]: unknown;
  id: string;
  time: string;
  name: string;
  side: "bought ETH" | "sold ETH";
  size: string;
  price: string;
  vs: string;
  spread: string;
  source: 0 | 1 | 2;
};

function deskStatus(desk: DeskState | null, live: boolean): { label: "Live" | "Stopped" | "Not open"; variant: "success" | "neutral" } {
  if (!desk) return { label: "Not open", variant: "neutral" };
  if (live) return { label: "Live", variant: "success" };
  return { label: "Stopped", variant: "neutral" };
}

function quoteStatus(status: MmState["status"]): { label: string; variant: "success" | "neutral" } {
  switch (status) {
    case "ok":
      return { label: "Live", variant: "success" };
    case "expired":
      return { label: "Expired", variant: "neutral" };
    case "no-terms":
      return { label: "No terms", variant: "neutral" };
    case "wrong-resolver":
      return { label: "Wrong resolver", variant: "neutral" };
    case "no-addr":
      return { label: "No address", variant: "neutral" };
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

function sourceLabel(source: 0 | 1 | 2): "Tier" | "Agent" | "Size floor" {
  switch (source) {
    case 0:
      return "Tier";
    case 1:
      return "Agent";
    case 2:
      return "Size floor";
    default: {
      const unreachable: never = source;
      return unreachable;
    }
  }
}

function ageTone(age: number, maxStaleness: number, stale: boolean): "ok" | "warn" | "stale" {
  if (stale || age > maxStaleness) return "stale";
  if (age > maxStaleness / 2) return "warn";
  return "ok";
}

function percentOfWad(wad: bigint): number {
  return Number((wad * 10000n) / WAD) / 100;
}

function closesIn(deadline: number, deskNow: number): string {
  const delta = Math.max(0, deadline - deskNow);
  const days = Math.floor(delta / 86400);
  const hours = Math.floor((delta % 86400) / 3600);
  if (days > 0) return `Closes in ${days} d ${hours} h`;
  const minutes = Math.floor((delta % 3600) / 60);
  if (hours > 0) return `Closes in ${hours} h ${minutes} m`;
  return `Closes in ${minutes} m`;
}

function updatedAgo(updatedAt: number, deskNow: number): string {
  const age = Math.max(0, deskNow - updatedAt);
  if (age < 60) return `updated ${age} s ago`;
  if (age < 3600) return `updated ${Math.floor(age / 60)} m ago`;
  const hours = Math.floor(age / 3600);
  const minutes = Math.floor((age % 3600) / 60);
  return minutes === 0 ? `updated ${hours} h ago` : `updated ${hours} h ${minutes} m ago`;
}

function clock(unix: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(unix * 1000));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  return `${hour}:${minute}`;
}

function quoteRow(mm: MmState): QuoteRow {
  const open = mm.status === "ok";
  const agent = mm.spread?.valid ? `${formatBps(mm.spread.bps)} until ${clock(mm.spread.validUntil)}` : "none";
  return {
    id: mm.address,
    name: mm.name,
    status: mm.status,
    tier: mm.terms ? formatBps(mm.terms.tierBps) : "—",
    agent,
    spread: formatBps(mm.sPolicy),
    bid: open ? formatPrice(mm.bidWad) : "—",
    ask: open ? formatPrice(mm.askWad) : "—",
    cap: mm.terms ? formatUsdc(mm.terms.cap) : "—",
  };
}

const QUOTE_COLUMNS: TableColumn<QuoteRow>[] = [
  { key: "name", header: "Name", width: proportional(2) },
  {
    key: "status",
    header: "Status",
    width: proportional(1.5),
    renderCell: (row) => {
      const status = quoteStatus(row.status);
      return <Badge variant={status.variant} label={status.label} />;
    },
  },
  { key: "tier", header: "Tier", width: proportional(1) },
  { key: "agent", header: "Agent spread", width: proportional(2) },
  { key: "spread", header: "Spread used", width: proportional(1.5) },
  { key: "bid", header: "Bid", width: proportional(1.5), align: "end" },
  { key: "ask", header: "Ask", width: proportional(1.5), align: "end" },
  { key: "cap", header: "Cap", width: proportional(1.5), align: "end" },
];

function fillRows(fills: FillRecord[], midWad: bigint, deskNow: number): FillRow[] {
  return fills.slice(0, 10).flatMap((fill) => {
    const bought = fill.tokenOut.toLowerCase() === WETH.toLowerCase();
    const sold = fill.tokenIn.toLowerCase() === WETH.toLowerCase();
    if (!bought && !sold) return [];
    const wethAmt = bought ? fill.amountOut : fill.amountIn;
    const usdcAmt = bought ? fill.amountIn : fill.amountOut;
    const price = wethAmt === 0n ? 0n : (usdcAmt * SCALE) / wethAmt;
    const vs = midWad === 0n ? null : formatVsMidBps(price, midWad);
    return [
      {
        id: fill.tx,
        time: updatedAgo(fill.blockTime, deskNow).replace(/^updated /, ""),
        name: fill.name,
        side: bought ? "bought ETH" : "sold ETH",
        size: formatWeth(wethAmt),
        price: formatPrice(price),
        vs: vs === null ? "—" : `${vs} bps`,
        spread: formatBps(fill.spreadBps),
        source: fill.spreadSource,
      },
    ];
  });
}

const FILL_COLUMNS: TableColumn<FillRow>[] = [
  { key: "time", header: "Time", width: proportional(1) },
  { key: "name", header: "Name", width: proportional(1.5) },
  { key: "side", header: "Side", width: proportional(1.2) },
  { key: "size", header: "Size", width: proportional(1.2), align: "end" },
  { key: "price", header: "Price", width: proportional(1), align: "end" },
  { key: "vs", header: "Vs mid", width: proportional(1), align: "end" },
  {
    key: "spread",
    header: "Spread",
    width: proportional(1.6),
    renderCell: (row) => (
      <HStack gap={2} align="center">
        <Text type="body">{row.spread}</Text>
        <Badge variant="neutral" label={sourceLabel(row.source)} />
      </HStack>
    ),
  },
  {
    key: "verify",
    header: "Verify",
    width: pixel(88),
    renderCell: (row) => (
      <Link href={`/fills/${row.id}`} isExternalLink={false}>
        Verify
      </Link>
    ),
  },
];

const PARTY_COLUMNS: TableColumn<PartyRow>[] = [
  { key: "name", header: "Name", width: proportional(2) },
  { key: "address", header: "Address", width: proportional(1.2) },
  { key: "expiry", header: "Expiry", width: proportional(1.6) },
  { key: "tier", header: "Tier", width: proportional(1) },
  { key: "cap", header: "Cap", width: proportional(1.4), align: "end" },
  { key: "status", header: "Status", width: proportional(1.4) },
];
