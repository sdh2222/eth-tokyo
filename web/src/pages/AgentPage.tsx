import sepoliaConfig from "@config";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { DialogHeader, useImperativeDialog } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { Token } from "@astryxdesign/core/Token";
import type { DeskBook } from "../desk/book";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { formatAddr, formatWeth } from "../lib/format";

// Risk agent (IA: "What spread is the agent setting, and inside which limits?").
// Built from the Astryx dashboard cards (as on DeskPage) with MetadataList, TextArea
// (read-only), Dialog and List examples.

const SAFE_URL = `https://app.safe.global/home?safe=sep:${sepoliaConfig.safe}`;
const SAFE_WALLET = "Safe{Wallet}";

type SpreadState = { label: string; color: "green" | "orange" | "gray" };

function spreadState(book: DeskBook, now: number): SpreadState {
  if (book.spread === null) return { label: "No spread · quoting on terms", color: "gray" };
  if (book.spread.live) return { label: "Live", color: "green" };
  if (Number(book.spread.validUntil) <= now) return { label: "Expired · quoting on terms", color: "orange" };
  return { label: "Outside terms · quoting on terms", color: "orange" };
}

function PolicyProposal({ onClose }: { onClose: () => void }) {
  return (
    <Layout
      header={<DialogHeader title="Edit policy" subtitle="Proposed to the Safe · 2 of 3 owners sign" onOpenChange={() => onClose()} />}
      content={
        <LayoutContent>
          <VStack gap={4}>
            <Text type="body">The new policy is written to desk.policy on the desk name as a Safe transaction.</Text>
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

export function AgentPage() {
  const book = useBook();
  const now = useClock();
  const dialog = useImperativeDialog();

  if (book.isLoading) return <Text type="body">Reading the agent…</Text>;
  if (!book.data) {
    return <EmptyState title="The agent could not be read" description="Check the Sepolia RPC in web/.env and reload." />;
  }

  const b = book.data;
  const state = spreadState(b, now);
  const termsWidths = b.terms ? `sell ${b.terms.sellBps} bp · buy ${b.terms.buyBps} bp` : null;

  return (
    <VStack gap={6}>
      <VStack gap={2}>
        <Heading level={1}>Risk agent</Heading>
        <Text type="body" color="secondary">
          {b.agent.name}
        </Text>
      </VStack>

      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center">
            <Heading level={4}>Live spread</Heading>
            <Token label={state.label} color={state.color} />
          </HStack>
          {b.spread ? (
            <MetadataList>
              <MetadataListItem label="Sell width">{`${b.spread.sellBps} bp`}</MetadataListItem>
              <MetadataListItem label="Buy width">{`${b.spread.buyBps} bp`}</MetadataListItem>
              <MetadataListItem label="Valid until">
                <Timestamp value={Number(b.spread.validUntil)} format="date_time" type="body" color="primary" />
              </MetadataListItem>
            </MetadataList>
          ) : (
            <Text type="body">{`The agent has not written desk.spread on ${b.name}.`}</Text>
          )}
          <Text type="supporting" color="secondary">
            {b.spread?.live
              ? "Both counterparties pay these widths until the time above."
              : termsWidths
                ? `The quote uses the terms: ${termsWidths}.`
                : "No quote: the terms on the client names disagree or are missing."}
          </Text>
        </VStack>
      </Card>

      <Grid columns={{ minWidth: 320, repeat: "fit" }} gap={4}>
        <Card>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={4}>Policy</Heading>
              <Button
                label="Edit policy"
                variant="primary"
                onClick={() => dialog.show(<PolicyProposal onClose={() => dialog.hide()} />)}
              />
            </HStack>
            <TextArea
              label="desk.policy"
              description="Plain English the Safe writes. The agent follows it."
              value={b.policy}
              placeholder="The Safe has not written a policy yet."
              rows={4}
              isReadOnly
            />
          </VStack>
        </Card>

        <Card>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={4}>Fence</Heading>
              <Link href="/counterparties">See counterparties</Link>
            </HStack>
            {b.terms ? (
              <MetadataList>
                <MetadataListItem label="Sell width limit">{`${b.terms.sellBps} bp`}</MetadataListItem>
                <MetadataListItem label="Buy width limit">{`${b.terms.buyBps} bp`}</MetadataListItem>
                <MetadataListItem label="Cap per fill">{formatWeth(b.terms.cap)}</MetadataListItem>
              </MetadataList>
            ) : (
              <Text type="body">No terms: the client names disagree or are missing.</Text>
            )}
            <Text type="supporting" color="secondary">
              A spread counts only inside these terms. Otherwise the quote uses the terms.
            </Text>
          </VStack>
        </Card>
      </Grid>

      <Card>
        <VStack gap={4}>
          <Heading level={4}>Identity and permissions</Heading>
          <MetadataList>
            <MetadataListItem label="ENS name">{b.agent.name}</MetadataListItem>
            <MetadataListItem label="Address">
              <Link href={`${sepoliaConfig.explorer}/address/${b.agent.addr}`} isExternalLink>
                {formatAddr(b.agent.addr)}
              </Link>
            </MetadataListItem>
          </MetadataList>
          <Grid columns={{ minWidth: 240, repeat: "fit" }} gap={4}>
            <List header="Can write" hasDividers>
              <ListItem label="desk.spread" description="Two widths and a valid-until time" />
              <ListItem label="desk.stats" description="The last write, as text" />
            </List>
            <List header="Cannot" hasDividers>
              <ListItem label="Policy" />
              <ListItem label="Terms" />
              <ListItem label="Addresses" />
              <ListItem label="Caps" />
              <ListItem label="Expiry" />
              <ListItem label="Oracle" />
              <ListItem label="Ship or stop the desk" />
            </List>
          </Grid>
        </VStack>
      </Card>

      {dialog.element}
    </VStack>
  );
}
