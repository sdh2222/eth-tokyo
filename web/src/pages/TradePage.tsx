import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { Token } from "@astryxdesign/core/Token";
import { WalletTxOverlay } from "../overlays/WalletTxOverlay";
import {
  APPROVE_ROUTER,
  BUY_ETH,
  ENTER_AMOUNT,
  FILL,
  REFRESH_QUOTE,
  SELL_ETH,
  SLIPPAGE,
  TOO_MANY_DECIMALS,
  TRADING_AS,
  YOU_PAY,
  YOU_RECEIVE,
} from "../copy/en";
import { ERRORS } from "../copy/errors";
import { formatEth, formatWadUsd, type DeskBook } from "../desk/book";
import { emptyConfig } from "../desk/fixture/state";
import { useBook } from "../hooks/useBook";
import { useWalletLabel } from "../hooks/useCanAct";
import { formatCountdown, useClock } from "../hooks/useClock";
import { useDeskPort, useLiveStrategy } from "../hooks/useDesk";
import { useQuote } from "../hooks/useQuote";
import { formatPrice, formatUsdc, formatWeth } from "../lib/format";

// Trade (IA: "Can I trade now, at what price, and how much?").
// L1 follows DeskPage (the Astryx `dashboard` template): a Grid of Cards with Heading level 4
// titles. L2 is the order form: FormLayout + SegmentedControl (SegmentedControlFillLayout),
// NumberInput with units (NumberInputWithUnits), MetadataList (MetadataListBasicMetadata),
// Collapsible (CollapsibleWithoutCard) and one primary Button.

type Side = "buy" | "sell";
type Unit = "ETH" | "USDC";
type Refusal = { title: string; hint: string };

const MODE_LIVE = import.meta.env.VITE_DESK_MODE === "live";
const WINDOW_SECONDS = 600;
const ZERO = "0x0000000000000000000000000000000000000000";
const SOURCE_LABEL: Record<NonNullable<DeskBook["quote"]>["source"], string> = {
  spread: "Agent spread",
  terms: "Terms",
  router: "Router",
};

export function parseAmount(text: string, decimals: number): { ok: true; value: bigint } | { ok: false; reason: "empty" | "decimals" } {
  if (text === "" || text === ".") return { ok: false, reason: "empty" };
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, reason: "decimals" };
  const [whole, frac = ""] = text.split(".");
  if (frac.length > decimals) return { ok: false, reason: "decimals" };
  const digits = `${whole}${frac.padEnd(decimals, "0")}`;
  return { ok: true, value: BigInt(digits) };
}

export function legFor(side: Side, unit: Unit): { leg: "weth" | "usdc"; exact: "exactIn" | "exactOut" } {
  if (side === "buy" && unit === "ETH") return { leg: "weth", exact: "exactOut" };
  if (side === "buy" && unit === "USDC") return { leg: "usdc", exact: "exactIn" };
  if (side === "sell" && unit === "ETH") return { leg: "weth", exact: "exactIn" };
  return { leg: "usdc", exact: "exactOut" };
}

// The title and hint from web/src/copy/errors.ts. DeskPriceTargetReached is not in that file
// yet, so its fallback is the copy from ts/src/lib/client/errors.ts.
function errorCopy(code: string, fallback: Refusal): Refusal {
  const copy = ERRORS[code];
  return copy ? { title: copy.title, hint: copy.hint } : fallback;
}

// USDC base units (6 decimals) for an ETH amount (wei) at a wad price.
function usdcFor(wei: bigint, priceWad: bigint): bigint {
  return (wei * priceWad) / 10n ** 30n;
}

export function TradePage() {
  const { address } = useAccount();
  const label = useWalletLabel();
  const book = useBook();
  const now = useClock();
  const strategy = useLiveStrategy();
  const port = useDeskPort();
  const client = usePublicClient();
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState<number | null>(null);
  const [slippage, setSlippage] = useState<number | null>(10);
  const [overlay, setOverlay] = useState<"approve" | "fill" | null>(null);
  const parsed = amount === null ? parseAmount("", 18) : parseAmount(String(amount), 18);
  const wei = parsed.ok && parsed.value > 0n ? parsed.value : null;
  const route = legFor(side, "ETH");
  const approvals = useQuery({
    queryKey: ["approvals", address],
    queryFn: () => port.planMmApprovals({ client, cfg: emptyConfig() }, address as `0x${string}`),
    enabled: address !== undefined,
  });
  const quote = useQuote({
    strategy: strategy.data ?? null,
    mm: address ?? null,
    side,
    leg: route.leg,
    amount: wei,
  });

  if (book.isLoading) return <Text type="body">Reading the desk…</Text>;
  if (!book.data) {
    return <EmptyState title="The desk could not be read" description="Check the Sepolia RPC in web/.env and reload." />;
  }

  const b = book.data;
  const updatedAt = Number(b.oracle.updatedAt);
  const windowLeft = updatedAt > now ? 0 : updatedAt + WINDOW_SECONDS - now;
  const entry = address
    ? b.names.find((name) => name.addr.toLowerCase() === address.toLowerCase() || name.name === label)
    : undefined;
  const expired = entry !== undefined && (!entry.live || (entry.expiry > 0n && Number(entry.expiry) <= now));

  // Who you are: can this wallet trade at all right now?
  let nameRefusal: Refusal | null = null;
  if (address && !entry) {
    nameRefusal = errorCopy("EnsGateTakerMismatch", {
      title: "This wallet isn't on the desk's list",
      hint: "Only the address in a client name's ENS record can trade under that name.",
    });
  } else if (expired) {
    nameRefusal = errorCopy("EnsGateNameExpired", {
      title: "Your name has expired",
      hint: "Ask the treasury to renew your name to trade again.",
    });
  }
  const windowRefusal =
    windowLeft > 0
      ? null
      : errorCopy("DeskPriceOracleStale", {
          title: "The price feed is too old",
          hint: "Trading pauses when the price is older than the limit. It resumes on the next update.",
        });

  // This order: the desk-side guards on side and size, then the quote's own refusal.
  let refusal: Refusal | null = nameRefusal ?? windowRefusal;
  if (!refusal && side === "buy" && b.inventory.wBps <= b.inventory.wStarBps) {
    refusal = errorCopy("DeskPriceTargetReached", {
      title: "The desk has reached its ETH target",
      hint: "A sale of ETH stops at the target share. A purchase of ETH still fills.",
    });
  }
  if (!refusal && b.terms && wei !== null && wei > b.terms.cap) {
    const copy = errorCopy("DeskPriceCapExceeded", { title: "Over your cap per fill", hint: "" });
    refusal = { title: copy.title, hint: `One fill is capped at ${formatEth(b.terms.cap)}. Split the trade.` };
  }
  if (!refusal && quote.data && !quote.data.ok) {
    refusal = { title: quote.data.error.title, hint: quote.data.error.hint };
  }

  const canTrade = address !== undefined && nameRefusal === null && windowRefusal === null;
  const tradeReason = !address
    ? "Connect a wallet to trade."
    : (nameRefusal?.title ?? windowRefusal?.title ?? "Your name is live and the price window is open.");

  // What you pay and receive: the exact quote when there is one, else the book's quote.
  const exact = quote.data?.ok ? quote.data : null;
  const bookPrice = b.quote ? (side === "buy" ? b.quote.ask : b.quote.bid) : null;
  let pay = "—";
  let receive = "—";
  let price = bookPrice === null ? "—" : `$${formatWadUsd(bookPrice)} · indicative`;
  if (exact) {
    pay = side === "buy" ? formatUsdc(exact.amountIn) : formatWeth(exact.amountIn);
    receive = side === "buy" ? formatWeth(exact.amountOut) : formatUsdc(exact.amountOut);
    price =
      quote.secondsLeft > 0
        ? `$${formatPrice(exact.priceWad)} · quote valid ${formatCountdown(quote.secondsLeft)}`
        : `$${formatPrice(exact.priceWad)} · quote expired`;
  } else if (wei !== null && bookPrice !== null) {
    pay = side === "buy" ? `≈ ${formatUsdc(usdcFor(wei, bookPrice))}` : formatWeth(wei);
    receive = side === "buy" ? formatWeth(wei) : `≈ ${formatUsdc(usdcFor(wei, bookPrice))}`;
  }

  const slippageBps = slippage ?? 0;
  const needsApproval = (approvals.data?.length ?? 0) > 0;
  const swapTx =
    strategy.data && exact
      ? port.buildSwapTx({ client, cfg: emptyConfig() }, strategy.data, exact, { slippageBps, deadlineSec: 120 })
      : null;
  const fillWired = !MODE_LIVE || (swapTx !== null && swapTx.to.toLowerCase() !== ZERO);
  let blocked: string | null = null;
  if (!address) blocked = "Connect a wallet to trade.";
  else if (refusal) blocked = refusal.title;
  else if (wei === null) blocked = `${ENTER_AMOUNT}.`;
  else if (!exact) blocked = "Waiting for a quote.";
  else if (quote.secondsLeft <= 0) blocked = "The quote expired. Refresh it.";
  else if (!needsApproval && !fillWired) blocked = "Filling from this page is not wired to Sepolia yet.";

  return (
    <VStack gap={6}>
      <VStack gap={2}>
        <Heading level={1}>Trade</Heading>
        <Text type="body" color="secondary">
          {`WETH/USDC against ${b.name}, priced at the oracle mid plus the desk's widths.`}
        </Text>
      </VStack>

      <Grid columns={{ minWidth: 320, repeat: "fit" }} gap={4}>
        <Card>
          <VStack gap={4}>
            <Heading level={4}>{TRADING_AS}</Heading>
            <Text type="large" maxLines={1}>
              {entry?.name ?? (label || "No wallet connected")}
            </Text>
            <HStack gap={2} vAlign="center">
              <StatusDot variant={canTrade ? "success" : "error"} label={canTrade ? "Can trade" : "Can't trade"} />
              <Text type="body">{canTrade ? "Can trade" : "Can't trade"}</Text>
            </HStack>
            <Text type="supporting" color="secondary">
              {tradeReason}
            </Text>
            {entry && entry.expiry > 0n ? (
              <HStack gap={1} vAlign="center">
                <Text type="supporting" color="secondary">
                  Name valid until
                </Text>
                <Timestamp value={Number(entry.expiry)} format="date" />
              </HStack>
            ) : null}
          </VStack>
        </Card>

        <Card>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={4}>Quote</Heading>
              {b.quote ? <Token label={SOURCE_LABEL[b.quote.source]} /> : null}
            </HStack>
            {b.quote ? (
              <HStack gap={8}>
                <VStack gap={1}>
                  <Text type="supporting" color="secondary">
                    Ask · you buy ETH
                  </Text>
                  <Heading level={2}>{`$${formatWadUsd(b.quote.ask)}`}</Heading>
                </VStack>
                <VStack gap={1}>
                  <Text type="supporting" color="secondary">
                    Bid · you sell ETH
                  </Text>
                  <Heading level={2}>{`$${formatWadUsd(b.quote.bid)}`}</Heading>
                </VStack>
              </HStack>
            ) : (
              <Text type="body">No quote: the terms on the client names disagree or are missing.</Text>
            )}
            <HStack gap={2} vAlign="center">
              <StatusDot
                variant={windowLeft > 0 ? "success" : "warning"}
                label={windowLeft > 0 ? "Price window open" : "Price window closed"}
              />
              <Text type="body">
                {windowLeft > 0
                  ? `Price window closes in ${formatCountdown(windowLeft)}`
                  : "Price window closed until the next oracle update"}
              </Text>
            </HStack>
          </VStack>
        </Card>
      </Grid>

      <Card>
        <VStack gap={4}>
          <Heading level={4}>Order</Heading>
          <FormLayout>
            <SegmentedControl value={side} onChange={(value) => setSide(value === "sell" ? "sell" : "buy")} label="Side" layout="fill">
              <SegmentedControlItem value="buy" label={BUY_ETH} />
              <SegmentedControlItem value="sell" label={SELL_ETH} />
            </SegmentedControl>
            <NumberInput
              label="Amount"
              placeholder={ENTER_AMOUNT}
              min={0}
              units="ETH"
              value={amount}
              onChange={setAmount}
              {...(!parsed.ok && parsed.reason === "decimals" ? { status: { type: "error" as const, message: TOO_MANY_DECIMALS } } : {})}
            />
          </FormLayout>
          <MetadataList>
            <MetadataListItem label={YOU_PAY}>{pay}</MetadataListItem>
            <MetadataListItem label={YOU_RECEIVE}>{receive}</MetadataListItem>
            <MetadataListItem label="Price">{price}</MetadataListItem>
            <MetadataListItem label="Your limits">
              {b.terms ? `Up to ${formatEth(b.terms.cap)} per fill` : "No terms on the client names"}
            </MetadataListItem>
          </MetadataList>
          <Collapsible
            trigger={
              <Text type="body" weight="semibold">
                {SLIPPAGE}
              </Text>
            }
            defaultIsOpen={false}
          >
            <NumberInput
              label="Slippage"
              isLabelHidden
              description="The fill reverts if the price moves more than this."
              min={0}
              max={500}
              units="bps"
              value={slippage}
              onChange={setSlippage}
            />
          </Collapsible>
          {refusal ? <Banner status="error" container="card" title={refusal.title} description={refusal.hint} /> : null}
          <HStack gap={2} vAlign="center">
            <Button
              variant="primary"
              label={needsApproval ? APPROVE_ROUTER : FILL}
              isDisabled={blocked !== null}
              {...(blocked !== null ? { tooltip: blocked } : {})}
              onClick={() => setOverlay(needsApproval ? "approve" : "fill")}
            />
            {exact && quote.secondsLeft <= 0 ? <Button label={REFRESH_QUOTE} onClick={() => void quote.refetch()} /> : null}
          </HStack>
        </VStack>
      </Card>

      {overlay && strategy.data && exact && swapTx ? (
        <WalletTxOverlay
          kind={overlay}
          tx={overlay === "approve" ? (approvals.data?.[0] ?? swapTx) : swapTx}
          onClose={() => setOverlay(null)}
        />
      ) : null}
    </VStack>
  );
}
