import { useParams } from "react-router-dom";
import sepoliaConfig from "@config";
import { Banner } from "@astryxdesign/core/Banner";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { useClipboard } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Section } from "@astryxdesign/core/Section";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { formatWadUsd } from "../desk/book";
import { emptyConfig } from "../desk/fixture/state";
import type { DeskConfig, FillRecord } from "../desk/types";
import { useDeskPort, useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatAddr, formatHash, formatShare, formatUsdc, formatWeth } from "../lib/format";

// Verify a fill (IA: "Was this fill priced by the rule?"). Built from the Astryx `detail-page`
// template: the PageHeader (Heading level 1 + a bulleted metadata row + an end action), then
// Sections with a Heading level 2 and a MetadataList. The shell renders the breadcrumb.

const cfg = sepoliaConfig as DeskConfig;
const WETH = cfg.tokens.weth.toLowerCase();

function Bullet() {
  return (
    <Text type="supporting" color="secondary">
      {"・"}
    </Text>
  );
}

function buysEth(fill: FillRecord): boolean {
  return fill.tokenOut.toLowerCase() === WETH;
}

function amountText(fill: FillRecord, leg: "in" | "out"): string {
  const token = leg === "in" ? fill.tokenIn : fill.tokenOut;
  const amount = leg === "in" ? fill.amountIn : fill.amountOut;
  return token.toLowerCase() === WETH ? formatWeth(amount) : formatUsdc(amount);
}

export function VerifyPage() {
  const { tx = "" } = useParams();
  const strategy = useLiveStrategy();
  const fills = useFills(strategy.data ?? null);
  const port = useDeskPort();
  const { copy, isCopied } = useClipboard({ announce: "Link copied" });
  const fill = (fills.data ?? []).find((row) => row.tx.toLowerCase() === tx.toLowerCase());
  const check = fill ? port.verifyFill(fill, emptyConfig()) : null;
  const recompute = (check?.steps ?? [])
    .map((step, index) => `${index + 1}. ${step.label}\n   ${step.formula} = ${step.value}`)
    .join("\n\n");

  let verdict = (
    <Banner
      status="info"
      title="Fill not found"
      description="No fill with this hash on the desk yet. Check the hash, or come back after the next block."
    />
  );
  if (fills.isLoading) {
    verdict = <Banner status="info" title="Reading the fills" description="Looking up this fill on the desk." />;
  } else if (check && check.steps.length === 0) {
    verdict = (
      <Banner
        status="info"
        title="Recompute is not available for this fill"
        description="The desk did not return the recompute steps, so this page can't compare them."
      />
    );
  } else if (check?.matches) {
    verdict = (
      <Banner
        status="success"
        title="Matches on-chain"
        description="Recomputed from the inputs the fill emitted: oracle mid, spread and ETH share."
      />
    );
  } else if (check) {
    verdict = (
      <Banner
        status="error"
        title="Does not match"
        description="The recomputed amounts differ from what the fill emitted."
      />
    );
  }

  return (
    <VStack gap={6}>
      <HStack gap={4} vAlign="start">
        <StackItem size="fill">
          <VStack gap={2}>
            <Heading level={1} maxLines={1}>
              {`Fill ${formatHash(tx)}`}
            </Heading>
            {fill ? (
              <HStack gap={1} vAlign="center" wrap="wrap">
                <Text type="body" maxLines={1}>
                  {fill.name}
                </Text>
                <HStack gap={1} vAlign="center">
                  <Bullet />
                  <Text type="body" maxLines={1}>
                    {buysEth(fill) ? "Buy ETH" : "Sell ETH"}
                  </Text>
                </HStack>
                <HStack gap={1} vAlign="center">
                  <Bullet />
                  <Timestamp value={fill.blockTime} format="date_time" type="body" />
                </HStack>
              </HStack>
            ) : (
              <Text type="body" color="secondary">
                Was this fill priced by the rule?
              </Text>
            )}
          </VStack>
        </StackItem>
        <IconButton
          label="Copy link to this fill"
          icon={<Icon icon={isCopied ? "check" : "copy"} color="inherit" />}
          variant="ghost"
          tooltip="Copy link"
          onClick={() => void copy(window.location.href)}
        />
      </HStack>

      {verdict}

      {fill ? (
        <Section>
          <VStack gap={4}>
            <Heading level={2}>The trade</Heading>
            <MetadataList>
              <MetadataListItem label="Counterparty">{fill.name}</MetadataListItem>
              <MetadataListItem label="Wallet">
                <Link href={`${cfg.explorer}/address/${fill.taker}`}>{formatAddr(fill.taker)}</Link>
              </MetadataListItem>
              <MetadataListItem label="Side">{buysEth(fill) ? "Buy ETH" : "Sell ETH"}</MetadataListItem>
              <MetadataListItem label="Paid">{amountText(fill, "in")}</MetadataListItem>
              <MetadataListItem label="Received">{amountText(fill, "out")}</MetadataListItem>
              <MetadataListItem label="Oracle mid">{`$${formatWadUsd(fill.midWad)}`}</MetadataListItem>
              <MetadataListItem label="Spread">{`${fill.spreadBps} bp`}</MetadataListItem>
              <MetadataListItem label="ETH share before">{formatShare(fill.wBeforeWad)}</MetadataListItem>
              <MetadataListItem label="Block">{fill.blockNumber.toString()}</MetadataListItem>
              <MetadataListItem label="Transaction">
                <Link href={`${cfg.explorer}/tx/${fill.tx}`}>{formatHash(fill.tx)}</Link>
              </MetadataListItem>
            </MetadataList>
          </VStack>
        </Section>
      ) : null}

      {fill && recompute !== "" ? (
        <Section>
          <VStack gap={4}>
            <Heading level={2}>Recompute</Heading>
            <Text type="body" color="secondary">
              Every fill emits its inputs, so anyone can recompute the price and amounts.
            </Text>
            <CodeBlock code={recompute} language="plaintext" width="100%" isWrapped />
          </VStack>
        </Section>
      ) : null}
    </VStack>
  );
}
