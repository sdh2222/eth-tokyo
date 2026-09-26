import { useState } from "react";
import sepoliaConfig from "@config";
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { DialogHeader, useImperativeDialog } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Table, proportional, useTableRowExpansion } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { DeskBook } from "../desk/book";
import { CLIENT_SUFFIX } from "../ens/names";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { formatAddr, formatWeth } from "../lib/format";

// Counterparties (IA: "Who can trade with my desk, and on what terms?").
// Built from the Astryx TableInCard + TableRowExpansionTable examples, with MetadataList,
// AlertDialog and Dialog examples in the expanded row.

const SAFE_URL = `https://app.safe.global/home?safe=sep:${sepoliaConfig.safe}`;
const SAFE_WALLET = "Safe{Wallet}";

type NameStatus = "Live" | "Expired" | "Can't trade";

type NameRow = {
  id: string;
  name: string;
  addr: string;
  expiry: number;
  status: NameStatus;
  terms: string;
  width: string;
  reason: string;
};

function termsText(terms: DeskBook["terms"]): string {
  if (!terms) return "No agreed terms";
  return `sell ${terms.sellBps} bp · buy ${terms.buyBps} bp · cap ${formatWeth(terms.cap)}`;
}

function widthText(book: DeskBook): string {
  if (book.spread?.live) return `sell ${book.spread.sellBps} bp · buy ${book.spread.buyBps} bp`;
  if (book.terms) return `sell ${book.terms.sellBps} bp · buy ${book.terms.buyBps} bp`;
  return "No quote";
}

function toRows(book: DeskBook, now: number): NameRow[] {
  const terms = termsText(book.terms);
  const width = widthText(book);
  return book.names.map((entry) => {
    const expiry = Number(entry.expiry);
    const expired = expiry > 0 && expiry <= now;
    const status: NameStatus = expired ? "Expired" : entry.live ? "Live" : "Can't trade";
    let reason = "Its address is the wallet, it has terms, and it has not expired.";
    if (status === "Expired") reason = "The name has expired. The Safe renews it before it can trade again.";
    else if (status === "Can't trade" && !book.terms) reason = "The client names do not store the same valid desk.terms.";
    else if (status === "Can't trade") reason = "Its address or resolver does not pass the gate.";
    return { id: entry.name, name: entry.name, addr: entry.addr, expiry, status, terms, width, reason };
  });
}

const columns: TableColumn<NameRow>[] = [
  { key: "name", header: "Name", width: proportional(3) },
  {
    key: "status",
    header: "Status",
    width: proportional(2),
    renderCell: (row) => (
      <HStack gap={2} vAlign="center">
        <StatusDot variant={row.status === "Live" ? "success" : "error"} label={row.status} />
        <Text type="body">{row.status}</Text>
      </HStack>
    ),
  },
  { key: "terms", header: "Terms", width: proportional(3) },
  { key: "width", header: "Width now", width: proportional(2) },
  { key: "addr", header: "Address", width: proportional(2), renderCell: (row) => formatAddr(row.addr) },
];

function SafeProposal({ title, change, onClose }: { title: string; change: string; onClose: () => void }) {
  return (
    <Layout
      header={<DialogHeader title={title} subtitle="Proposed to the Safe · 2 of 3 owners sign" onOpenChange={() => onClose()} />}
      content={
        <LayoutContent>
          <VStack gap={4}>
            <Text type="body">{change}</Text>
            <Text type="body">
              {`Two of the three Safe owners sign it in ${SAFE_WALLET}. Nothing is sent from this page, and the desk stays open while they sign.`}
            </Text>
            <Link href={SAFE_URL} isExternalLink isStandalone>
              {`Open the Safe in ${SAFE_WALLET}`}
            </Link>
          </VStack>
        </LayoutContent>
      }
      footer={
        <LayoutFooter>
          <HStack gap={2} hAlign="end">
            <Button label="Close" variant="secondary" onClick={onClose} />
          </HStack>
        </LayoutFooter>
      }
    />
  );
}

export function CounterpartiesPage() {
  const book = useBook();
  const now = useClock();
  const dialog = useImperativeDialog();
  const alert = useImperativeAlertDialog();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  function editTerms(row: NameRow) {
    dialog.show(
      <SafeProposal
        title="Edit terms"
        change={`New sell and buy widths and a new cap for ${row.name} are written to its desk.terms record.`}
        onClose={() => dialog.hide()}
      />,
    );
  }

  function cutOff(row: NameRow) {
    const label = row.name.split(".")[0];
    alert.show({
      title: `Cut off ${row.name}?`,
      description: `The Safe clears this name's desk.terms. Once 2 of 3 owners sign in ${SAFE_WALLET}, fills from ${label} fail the gate. Other names keep trading.`,
      actionLabel: `Cut off ${label}`,
      onAction: () => {
        alert.hide();
        dialog.show(
          <SafeProposal
            title="Cut off"
            change={`The Safe transaction clears desk.terms on ${row.name}.`}
            onClose={() => dialog.hide()}
          />,
        );
      },
    });
  }

  const expansion = useTableRowExpansion<NameRow>({
    expandedKeys,
    onToggle: (key) =>
      setExpandedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      }),
    getRowKey: (item) => item.id,
    renderExpanded: (item) => (
      <VStack gap={4}>
        <MetadataList>
          <MetadataListItem label="Address">{item.addr}</MetadataListItem>
          <MetadataListItem label="Expires">
            {item.expiry > 0 ? <Timestamp value={item.expiry} format="date" type="body" color="primary" /> : "No expiry set"}
          </MetadataListItem>
          <MetadataListItem label="Terms">{item.terms}</MetadataListItem>
          <MetadataListItem label="Can trade">{item.reason}</MetadataListItem>
        </MetadataList>
        <HStack gap={2}>
          <Button label="Edit terms" variant="secondary" onClick={() => editTerms(item)} />
          <Button label="Cut off" variant="destructive" onClick={() => cutOff(item)} />
        </HStack>
      </VStack>
    ),
  });

  if (book.isLoading) return <Text type="body">Reading the client names…</Text>;
  if (!book.data) {
    return <EmptyState title="The client names could not be read" description="Check the Sepolia RPC in web/.env and reload." />;
  }

  const rows = toRows(book.data, now);

  return (
    <VStack gap={6}>
      <VStack gap={2}>
        <Heading level={1}>Counterparties</Heading>
        <Text type="body" color="secondary">
          {`Names under ${CLIENT_SUFFIX} that can fill against the desk.`}
        </Text>
      </VStack>

      <Card>
        <VStack gap={4}>
          <Heading level={4}>Client book</Heading>
          <Table<NameRow>
            data={rows}
            columns={columns}
            idKey="id"
            density="compact"
            dividers="rows"
            hasHover
            plugins={{ expansion }}
            emptyState={
              <EmptyState
                isCompact
                title="No counterparties yet"
                description={`The Safe adds a name under ${CLIENT_SUFFIX} with an address, terms and an expiry.`}
              />
            }
          />
          <Text type="supporting" color="secondary">
            Adding a counterparty is an ENS change made by the Safe.
          </Text>
        </VStack>
      </Card>

      <Card>
        <Collapsible trigger="How the gate checks a name" defaultIsOpen={false}>
          <List listStyle="disc">
            <ListItem label="The name's address must match the wallet that signs the fill." />
            <ListItem label="The name must not be expired." />
            <ListItem label={`The name's resolver must be the desk's resolver, ${formatAddr(sepoliaConfig.ens.resolver)}.`} />
          </List>
        </Collapsible>
      </Card>

      {dialog.element}
      {alert.element}
    </VStack>
  );
}
