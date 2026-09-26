import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Icon } from "@astryxdesign/core/Icon";
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  LayoutPanel,
  StackItem,
  VStack,
} from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Table, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import sepoliaConfig from "@config";
import { formatBpsShare, formatWadUsd } from "../desk/book";
import { FIXTURE_OWNERS } from "../desk/fixture/state";
import { useBook } from "../hooks/useBook";
import { useCanAct } from "../hooks/useCanAct";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatAddr, formatWeth } from "../lib/format";
import { SafeDialog } from "./open/SafeDialog";

// Open a desk. The frame is the Astryx `form-wizard-vertical` template: a vertical Stepper in
// the Layout's start panel, the step in the content column, Back and Continue pinned in the
// LayoutFooter, and a horizontal Stepper in the header below 1000px. The template's guidance
// panel is left out (it is the first panel the template drops).

const STEPS = [
  { label: "Safe", description: "Check the Safe that signs the program and holds the tokens." },
  { label: "Market", description: "See the pair, oracle and fill window the program fixes." },
  { label: "Inventory and target", description: "Choose how much of the Safe's WETH and USDC backs the desk." },
  { label: "Counterparties", description: "See the ENS names that may trade with the desk." },
  { label: "Agent policy", description: "Write the policy the agent reads when it moves the spread." },
  { label: "Review", description: "Check the proposal before the Safe owners sign it." },
];

const MEASURE = 640;
const PANEL_WIDTH = 300;
const TARGET_BPS = sepoliaConfig.desk.wStarBps;
const WINDOW_BLOCKS = sepoliaConfig.desk.maxBlocks;
const liveMode = import.meta.env.VITE_DESK_MODE === "live";
// Fixture mode has no Safe balances until a desk is open; these match the fixture Safe.
const FIXTURE_SAFE = { weth: 900, usdc: 400_000 };

type NameRow = { id: string; name: string; addr: string; expiry: number; live: boolean };

const nameColumns: TableColumn<NameRow>[] = [
  { key: "name", header: "Name", width: proportional(3) },
  { key: "addr", header: "Address", width: proportional(2), renderCell: (row) => formatAddr(row.addr) },
  {
    key: "expiry",
    header: "Expires",
    width: proportional(2),
    renderCell: (row) => <Timestamp value={row.expiry} format="date" type="body" color="primary" />,
  },
  {
    key: "live",
    header: "Status",
    width: proportional(2),
    renderCell: (row) => (
      <HStack gap={2} vAlign="center">
        <StatusDot variant={row.live ? "success" : "error"} label={row.live ? "Can trade" : "Can't trade"} />
        <Text type="body">{row.live ? "Can trade" : "Can't trade"}</Text>
      </HStack>
    ),
  },
];

function startStep(param: string | null): number {
  const n = Number(param ?? "1");
  return Number.isInteger(n) && n >= 1 && n <= STEPS.length ? n - 1 : 0;
}

export function OpenPage() {
  const [params] = useSearchParams();
  const hasRail = useMediaQuery("(min-width: 1000px)");
  const isNarrow = !hasRail;

  const book = useBook();
  const live = useLiveStrategy();
  const desk = useDeskState(live.data ?? null);
  const { isOwner } = useCanAct();

  const [step, setStep] = useState(() => startStep(params.get("step")));
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(() => new Set());
  const [weth, setWeth] = useState<number>(FIXTURE_SAFE.weth);
  const [usdc, setUsdc] = useState<number>(FIXTURE_SAFE.usdc);
  const [policyDraft, setPolicyDraft] = useState<string | null>(null);
  const [isSafeOpen, setIsSafeOpen] = useState(false);

  const b = book.data;
  const policy = policyDraft ?? b?.policy ?? "";
  const safeWeth = desk.data
    ? Number(desk.data.safeWallet.weth / 10n ** 14n) / 10_000
    : liveMode
      ? null
      : FIXTURE_SAFE.weth;
  const safeUsdc = desk.data
    ? Number(desk.data.safeWallet.usdc / 10n ** 4n) / 100
    : liveMode
      ? null
      : FIXTURE_SAFE.usdc;
  const mid = b ? Number(b.oracle.answer) / 1e8 : null;
  const ethShare = mid !== null && weth * mid + usdc > 0 ? (weth * mid) / (weth * mid + usdc) : null;
  const deskIsOpen = Boolean(live.data);

  // Validation is one derivation from the field values, as in the template: Continue, the
  // Stepper's error tint and the field status all read it.
  const errorsByStep = useMemo<Array<Record<string, string>>>(() => {
    const inventory: Record<string, string> = {};
    if (safeWeth !== null && weth > safeWeth)
      inventory.weth = `The Safe holds ${safeWeth.toLocaleString("en-US")} WETH.`;
    if (safeUsdc !== null && usdc > safeUsdc)
      inventory.usdc = `The Safe holds ${safeUsdc.toLocaleString("en-US")} USDC.`;
    if (weth <= 0 && usdc <= 0) inventory.weth = "Put WETH or USDC behind the desk.";
    return [{}, {}, inventory, {}, {}, {}];
  }, [safeUsdc, safeWeth, usdc, weth]);

  const shownErrors = (index: number): Record<string, string> =>
    attempted.has(index) ? (errorsByStep[index] ?? {}) : {};
  const currentErrors = shownErrors(step);
  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step] ?? { label: "", description: "" };

  const markAttempted = (index: number) => setAttempted((prev) => new Set(prev).add(index));

  const goNext = () => {
    markAttempted(step);
    if (isLastStep) {
      const broken = errorsByStep.findIndex((errors) => Object.keys(errors).length > 0);
      if (broken >= 0) {
        markAttempted(broken);
        setStep(broken);
        return;
      }
      setIsSafeOpen(true);
      return;
    }
    if (Object.keys(errorsByStep[step] ?? {}).length === 0) setStep((s) => s + 1);
  };

  const goTo = (index: number) => {
    if (index > step) markAttempted(step);
    setStep(index);
  };

  const stepNodes = (hasDescriptions: boolean) =>
    STEPS.map((s, i) => {
      const hasError = Object.keys(shownErrors(i)).length > 0;
      return (
        <Step
          key={s.label}
          step={i}
          label={s.label}
          {...(hasDescriptions ? { description: s.description } : {})}
          {...(hasError ? { status: "error" as const } : {})}
          indicator={hasError ? <Icon icon="warning" size="sm" /> : "number"}
        />
      );
    });

  const rail = (
    <Stepper activeStep={step} orientation="vertical" onStepClick={goTo} label="Open a desk progress">
      {stepNodes(true)}
    </Stepper>
  );

  const headerStepper = (
    <Stepper activeStep={step} orientation="horizontal" onStepClick={goTo} label="Open a desk progress">
      {stepNodes(false)}
    </Stepper>
  );

  const names: NameRow[] = (b?.names ?? []).map((name) => ({
    id: name.name,
    name: name.name,
    addr: name.addr,
    expiry: Number(name.expiry),
    live: name.live,
  }));
  const termsText = b?.terms
    ? `Sell ${b.terms.sellBps} bp · buy ${b.terms.buyBps} bp · cap ${formatWeth(b.terms.cap)} per fill`
    : "No shared terms on the client names";

  return (
    <>
      <Layout
        height="fill"
        padding={4}
        header={
          <LayoutHeader hasDivider>
            <VStack gap={4}>
              <HStack gap={3} vAlign="center">
                <StackItem size="fill">
                  <Text type="label">Open a desk</Text>
                </StackItem>
              </HStack>
              {!hasRail && headerStepper}
            </VStack>
          </LayoutHeader>
        }
        start={hasRail ? <LayoutPanel width={PANEL_WIDTH}>{rail}</LayoutPanel> : undefined}
        content={
          <LayoutContent>
            <Center axis="horizontal">
              <VStack gap={6} width="100%" maxWidth={MEASURE}>
                {deskIsOpen && !params.get("step") ? (
                  <Banner
                    status="info"
                    title="A desk is already open"
                    description="Proposing here docks it and ships the new program in one Safe transaction."
                    endContent={<Link href="/controls">Go to Controls</Link>}
                  />
                ) : null}

                <VStack gap={1}>
                  <Heading level={1}>{current.label}</Heading>
                  <Text type="body" color="secondary">
                    {current.description}
                  </Text>
                </VStack>

                {step === 0 && (
                  <MetadataList>
                    <MetadataListItem label="Safe">{formatAddr(sepoliaConfig.safe)}</MetadataListItem>
                    <MetadataListItem label="Owners">{FIXTURE_OWNERS.map(formatAddr).join(", ")}</MetadataListItem>
                    <MetadataListItem label="Threshold">2 of 3 owners sign</MetadataListItem>
                    <MetadataListItem label="Desk name">{b?.name ?? "—"}</MetadataListItem>
                    <MetadataListItem label="Your wallet">
                      {isOwner ? "A Safe owner" : "Not a Safe owner: you can review, an owner proposes"}
                    </MetadataListItem>
                  </MetadataList>
                )}

                {step === 1 && (
                  <VStack gap={4}>
                    <MetadataList>
                      <MetadataListItem label="Pair">WETH / USDC</MetadataListItem>
                      <MetadataListItem label="Oracle">
                        <Link href={`${sepoliaConfig.explorer}/address/${sepoliaConfig.oracle}`} isExternalLink>
                          {formatAddr(sepoliaConfig.oracle)}
                        </Link>
                      </MetadataListItem>
                      <MetadataListItem label="Oracle mid">
                        {b ? `$${formatWadUsd(b.oracle.answer * 10n ** 10n)}` : "—"}
                      </MetadataListItem>
                      <MetadataListItem label="Fill window">{`10 minutes after each oracle update (${WINDOW_BLOCKS} blocks)`}</MetadataListItem>
                    </MetadataList>
                    <Text type="supporting" color="secondary">
                      The program fixes these. Changing them means reopening the desk.
                    </Text>
                  </VStack>
                )}

                {step === 2 && (
                  <VStack gap={4}>
                    <FormLayout defaultOptionality="required">
                      <FormLayout direction={isNarrow ? "vertical" : "horizontal"} defaultOptionality="required">
                        <NumberInput
                          label="WETH"
                          value={weth}
                          onChange={setWeth}
                          min={0}
                          units="WETH"
                          {...(safeWeth !== null
                            ? { description: `The Safe holds ${safeWeth.toLocaleString("en-US")} WETH.` }
                            : {})}
                          {...(currentErrors.weth ? { status: { type: "error", message: currentErrors.weth } } : {})}
                        />
                        <NumberInput
                          label="USDC"
                          value={usdc}
                          onChange={setUsdc}
                          min={0}
                          units="USDC"
                          {...(safeUsdc !== null
                            ? { description: `The Safe holds ${safeUsdc.toLocaleString("en-US")} USDC.` }
                            : {})}
                          {...(currentErrors.usdc ? { status: { type: "error", message: currentErrors.usdc } } : {})}
                        />
                      </FormLayout>
                      <NumberInput
                        label="ETH target"
                        value={TARGET_BPS / 100}
                        onChange={() => {}}
                        units="%"
                        isReadOnly
                        description="The desk stops selling ETH at or below this share. The program fixes it."
                      />
                    </FormLayout>
                    <Text type="supporting" color="secondary">
                      {ethShare !== null
                        ? `At the oracle mid these amounts are ${formatBpsShare(Math.round(ethShare * 10_000))} ETH. Tokens stay in the Safe until a fill.`
                        : "Tokens stay in the Safe until a fill."}
                    </Text>
                  </VStack>
                )}

                {step === 3 && (
                  <VStack gap={4}>
                    <Table<NameRow>
                      data={names}
                      columns={nameColumns}
                      idKey="id"
                      density="compact"
                      dividers="rows"
                      emptyState={
                        <EmptyState
                          isCompact
                          title="No client names yet"
                          description={`Counterparties trade under ${sepoliaConfig.ens.suffix}.`}
                        />
                      }
                    />
                    <Text type="supporting" color="secondary">
                      Adding or removing a name takes one Safe signature later. The desk stays open.
                    </Text>
                  </VStack>
                )}

                {step === 4 && (
                  <VStack gap={6}>
                    <TextArea
                      label="Policy"
                      rows={5}
                      value={policy}
                      onChange={setPolicyDraft}
                      description="The Safe writes this to desk.policy on the desk name. The agent reads it; the router does not."
                    />
                    <MetadataList title="Terms fence">
                      <MetadataListItem label="Sell width">{b?.terms ? `${b.terms.sellBps} bp` : "—"}</MetadataListItem>
                      <MetadataListItem label="Buy width">{b?.terms ? `${b.terms.buyBps} bp` : "—"}</MetadataListItem>
                      <MetadataListItem label="Cap per fill">
                        {b?.terms ? formatWeth(b.terms.cap) : "—"}
                      </MetadataListItem>
                      <MetadataListItem label="Agent">{b?.agent.name ?? "—"}</MetadataListItem>
                    </MetadataList>
                    <Text type="supporting" color="secondary">
                      The agent moves the spread inside this fence. The terms change with one Safe signature.
                    </Text>
                  </VStack>
                )}

                {step === 5 && (
                  <VStack gap={5}>
                    <MetadataList columns="multi">
                      <MetadataListItem label="Safe">{formatAddr(sepoliaConfig.safe)}</MetadataListItem>
                      <MetadataListItem label="Desk name">{b?.name ?? "—"}</MetadataListItem>
                      <MetadataListItem label="Pair">WETH / USDC</MetadataListItem>
                      <MetadataListItem label="Oracle">{formatAddr(sepoliaConfig.oracle)}</MetadataListItem>
                      <MetadataListItem label="Fill window">10 minutes after each update</MetadataListItem>
                      <MetadataListItem label="ETH target">{formatBpsShare(TARGET_BPS)}</MetadataListItem>
                      <MetadataListItem label="WETH">{`${weth.toLocaleString("en-US")} WETH`}</MetadataListItem>
                      <MetadataListItem label="USDC">{`${usdc.toLocaleString("en-US")} USDC`}</MetadataListItem>
                      <MetadataListItem label="Counterparties">{`${names.length} ENS names`}</MetadataListItem>
                      <MetadataListItem label="Terms">{termsText}</MetadataListItem>
                      <MetadataListItem label="Agent">{b?.agent.name ?? "—"}</MetadataListItem>
                      <MetadataListItem label="Deadline">{`${sepoliaConfig.desk.strategyTtlDays} days after shipping`}</MetadataListItem>
                    </MetadataList>
                    <Divider />
                    <Text type="body">
                      {deskIsOpen
                        ? "One Safe transaction docks the live desk and ships this program to Aqua. Tokens stay in the Safe until a fill."
                        : "One Safe transaction ships this program to Aqua. Tokens stay in the Safe until a fill."}
                    </Text>
                  </VStack>
                )}
              </VStack>
            </Center>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} vAlign="center" width="100%">
              <Button
                label="Back"
                variant="secondary"
                isDisabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              />
              <StackItem size="fill" />
              <Button label={isLastStep ? "Propose to Safe" : "Continue"} variant="primary" onClick={goNext} />
            </HStack>
          </LayoutFooter>
        }
      />
      <SafeDialog
        isOpen={isSafeOpen}
        onOpenChange={setIsSafeOpen}
        title="Propose to Safe"
        description={
          deskIsOpen
            ? "This proposal docks the live desk and ships the new program to Aqua in one Safe transaction. Tokens stay in the Safe until a fill."
            : "This proposal ships the desk program to Aqua. Tokens stay in the Safe until a fill."
        }
      />
    </>
  );
}
