import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Table, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { useBook } from "../hooks/useBook";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatWeth } from "../lib/format";
import { SafeDialog } from "./open/SafeDialog";

// Controls (IA: "What does it take to change or stop the desk?").
// Same frame as DeskPage (the Astryx `dashboard` template): Heading 1 + secondary Text, then
// Cards with Heading 4 titles. Table from `TableRichCellTable`, checks from `ListItemWithMetadata`,
// the stop confirmation from `AlertDialogDeleteConfirmation`.

// The oracle owner, from docs/agent-design.md ("Live chain"). The agent must not be it.
const ORACLE_OWNER = "0x1AC95a5e4CD739D01130f705f93D3bE070407c2b";

type ChangeRow = { id: string; how: string; what: string; linkLabel: string; href: string };

const changeColumns: TableColumn<ChangeRow>[] = [
  { key: "how", header: "How", width: proportional(2) },
  { key: "what", header: "What it changes", width: proportional(4) },
  {
    key: "href",
    header: "Where",
    width: proportional(2),
    renderCell: (row) => <Link href={row.href}>{row.linkLabel}</Link>,
  },
];

export function ControlsPage() {
  const live = useLiveStrategy();
  const strategy = live.data ?? null;
  const desk = useDeskState(strategy);
  const book = useBook();
  const [isStopAsked, setIsStopAsked] = useState(false);
  const [isSafeOpen, setIsSafeOpen] = useState(false);

  if (live.isLoading) return <Text type="body">Reading the desk…</Text>;
  if (!strategy) {
    return (
      <EmptyState
        title="No desk is open"
        description="No program is shipped to Aqua. Open a desk from the Safe to start quoting."
        actions={<Link href="/open">Open a desk</Link>}
      />
    );
  }

  const deadline = desk.data?.deadline ?? Number(strategy.decoded.deadline);
  const terms = book.data?.terms ?? null;
  const agentAddr = book.data?.agent.addr;
  const oracleOk = agentAddr !== undefined && agentAddr.toLowerCase() !== ORACLE_OWNER.toLowerCase();
  const oneLive = strategy.warning !== "MULTIPLE_LIVE";

  const rows: ChangeRow[] = [
    {
      id: "agent",
      how: "Agent moves it",
      what: "The spread: the sell and buy widths, inside the terms.",
      linkLabel: "Agent",
      href: "/agent",
    },
    {
      id: "signature",
      how: "One Safe signature",
      what: terms
        ? `Terms (sell ${terms.sellBps} bp, buy ${terms.buyBps} bp), cap (${formatWeth(terms.cap)}), names, policy, agent. The desk stays open.`
        : "Terms, cap, names, policy, agent. The desk stays open.",
      linkLabel: "Counterparties",
      href: "/counterparties",
    },
    {
      id: "reopen",
      how: "Reopen the desk",
      what: "Pair, oracle, 70% ETH target, 10-minute window, inventory, deadline.",
      linkLabel: "Change",
      href: "/open?step=2",
    },
  ];

  return (
    <VStack gap={6}>
      <VStack gap={2}>
        <Heading level={1}>Controls</Heading>
        <Text type="body" color="secondary">
          What it takes to change or stop the desk.
        </Text>
      </VStack>

      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center">
            <Heading level={4}>Live program</Heading>
            <Link href="/program">See the program</Link>
          </HStack>
          <MetadataList>
            <MetadataListItem label="Shipped">{`Block ${strategy.shippedAt.block.toLocaleString("en-US")}`}</MetadataListItem>
            <MetadataListItem label="Closes">
              <Timestamp value={deadline} format="date_time" type="body" color="primary" />
            </MetadataListItem>
            <MetadataListItem label="Strategy hash">{formatHash(strategy.strategyHash)}</MetadataListItem>
          </MetadataList>
        </VStack>
      </Card>

      <Card>
        <VStack gap={4}>
          <Heading level={4}>What changes how</Heading>
          <Table<ChangeRow>
            data={rows}
            columns={changeColumns}
            idKey="id"
            density="compact"
            dividers="rows"
            emptyState={
              <EmptyState isCompact title="No controls to show" description="The desk program could not be read." />
            }
          />
          <Text type="supporting" color="secondary">
            Change docks this program and ships a new one in one Safe transaction. Stop docks it.
          </Text>
          <HStack gap={2} wrap="wrap">
            <Button label="Change" variant="primary" href="/open?step=2" />
            <Button label="Stop the desk" variant="destructive" onClick={() => setIsStopAsked(true)} />
          </HStack>
        </VStack>
      </Card>

      <Card>
        <VStack gap={4}>
          <Heading level={4}>Checks</Heading>
          <List hasDividers>
            <ListItem
              label="Oracle owner is not the agent"
              description={
                oracleOk
                  ? "The agent can move the spread, not the price."
                  : "Check the oracle owner before the next fill."
              }
              startContent={
                <StatusDot variant={oracleOk ? "success" : "error"} label={oracleOk ? "Passes" : "Fails"} />
              }
            />
            <ListItem
              label="One program live"
              description={
                oneLive
                  ? "Aqua holds one live program for this Safe."
                  : "More than one program is live. Stop the extra one."
              }
              startContent={<StatusDot variant={oneLive ? "success" : "error"} label={oneLive ? "Passes" : "Fails"} />}
            />
          </List>
        </VStack>
      </Card>

      <AlertDialog
        isOpen={isStopAsked}
        onOpenChange={setIsStopAsked}
        title="Stop the desk?"
        description="Counterparties can't trade until a new desk opens. Tokens stay in the Safe."
        actionLabel="Stop the desk"
        onAction={() => {
          setIsStopAsked(false);
          setIsSafeOpen(true);
        }}
      />
      <SafeDialog
        isOpen={isSafeOpen}
        onOpenChange={setIsSafeOpen}
        title="Stop the desk"
        description="This proposal docks the live program on Aqua. Counterparties can't trade until a new desk opens. Tokens stay in the Safe."
      />
    </VStack>
  );
}
