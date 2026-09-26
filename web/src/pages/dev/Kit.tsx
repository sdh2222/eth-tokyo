import { useState } from "react";
import "../../styles/font-compare.css";
import { useQueryClient } from "@tanstack/react-query";
import { AddressCell } from "../../components/AddressCell";
import { AmountInput } from "../../components/AmountInput";
import { Countdown } from "../../components/Countdown";
import { EmptyState } from "../../components/EmptyState";
import { ShareBar } from "../../components/ShareBar";
import { ShowRaw } from "../../components/ShowRaw";
import { Skeleton } from "../../components/Skeleton";
import { SourceBadge } from "../../components/SourceBadge";
import { StatTile } from "../../components/StatTile";
import { StatusBadge, type StatusKind } from "../../components/StatusBadge";
import { Stepper } from "../../components/Stepper";
import { TxLink } from "../../components/TxLink";
import { seedOneFill } from "../../desk/fixture";
import { clientName } from "../../ens/names";
import { FIXTURE_MMS, FIXTURE_OWNERS } from "../../desk/fixture/state";
import { labelFor } from "../../hooks/useCanAct";

const FIELDS = [
  { name: "Pink", swatch: "var(--field-pink)", ink: "var(--ink)" },
  { name: "Sky", swatch: "var(--field-sky)", ink: "var(--ink)" },
  { name: "Ink", swatch: "var(--ink)", ink: "var(--on-ink)" },
  { name: "Paper", swatch: "var(--paper)", ink: "var(--ink)" },
  { name: "Chip", swatch: "var(--chip)", ink: "var(--ink)" },
] as const;

const MARKS = [
  { name: "Treasury", color: "var(--treasury)" },
  { name: "Counterparty", color: "var(--mm)" },
  { name: "Program", color: "var(--program)" },
  { name: "Aqua", color: "var(--aqua)" },
  { name: "ENS", color: "var(--ens)" },
  { name: "Oracle", color: "var(--oracle)" },
  { name: "Agent", color: "var(--agent)" },
  { name: "Bid", color: "var(--bid)" },
  { name: "Ask", color: "var(--ask)" },
  { name: "Success", color: "var(--success)" },
  { name: "Warning", color: "var(--warning)" },
  { name: "Danger", color: "var(--danger)" },
] as const;

const GAPS = [4, 8, 12, 16, 24, 32, 48] as const;

const DISPLAY_LINE = "An OTC desk";
const BODY_LINE = "Tokens stay in the multisig until each fill.";
const NUMBER_LINE = "3,987.98";

const PAGE_FACES = [
  {
    name: "Die Grotesk C",
    where: "TypeSafe page type",
    family: '"Desk Compare Die Grotesk C", sans-serif',
    displayWeight: 500,
    note: "Klim test cut. Letters, digits, space, and . , - only.",
  },
  {
    name: "Pretendard",
    where: "What the kit uses now",
    family: '"Desk Compare Pretendard", sans-serif',
    displayWeight: 500,
    note: "Regular at 16px, Medium at display.",
  },
] as const;

const DRAWN_WINDOW_FACES = [
  {
    name: "Pitch Sans",
    where: "Klim, same foundry as Die Grotesk",
    family: '"Desk Compare Pitch Sans", monospace',
    displayWeight: 400,
    note: "Monospaced sans. Klim test cut. Paid to ship.",
  },
  {
    name: "Söhne Mono",
    where: "Klim grotesque, fixed width",
    family: '"Desk Compare Söhne Mono", monospace',
    displayWeight: 400,
    note: "Book weight. Klim test cut. Paid to ship.",
  },
  {
    name: "Founders Grotesk Mono",
    where: "Klim, a bit more mechanical",
    family: '"Desk Compare Founders Grotesk Mono", monospace',
    displayWeight: 400,
    note: "Klim test cut. Paid to ship.",
  },
  {
    name: "Fragment Mono",
    where: "Free. Drawn, not a coding default",
    family: '"Desk Compare Fragment Mono", monospace',
    displayWeight: 400,
    note: "Free to ship.",
  },
  {
    name: "Geist Mono",
    where: "Free. Quiet and current",
    family: '"Desk Compare Geist Mono", monospace',
    displayWeight: 400,
    note: "Free to ship.",
  },
  {
    name: "IBM Plex Mono",
    where: "Free. Humanist, calmer",
    family: '"Desk Compare IBM Plex Mono", monospace',
    displayWeight: 400,
    note: "Free to ship.",
  },
  {
    name: "Martian Mono",
    where: "Free. Wider, more mechanical",
    family: '"Desk Compare Martian Mono", monospace',
    displayWeight: 400,
    note: "Free to ship.",
  },
  {
    name: "JetBrains Mono",
    where: "What numbers use now",
    family: '"Desk Compare JetBrains Mono", monospace',
    displayWeight: 400,
    note: "Free to ship. The generic coding face.",
  },
] as const;

const PIXEL_WINDOW_FACES = [
  {
    name: "LisaTerminal Paper",
    where: "Pixel. This is the gaming one",
    family: '"Desk Compare LisaTerminal Paper", monospace',
    displayWeight: 400,
    note: "One weight. Kreative Korp. Free to ship.",
  },
] as const;

function FontSpecimen({
  name,
  where,
  family,
  displayWeight,
  note,
}: {
  name: string;
  where: string;
  family: string;
  displayWeight: number;
  note: string;
}) {
  return (
    <article className="flex flex-col gap-4 border border-ink bg-paper p-5">
      <p className="text-body font-medium">
        {name}
        <span className="font-normal"> · {where}</span>
      </p>
      <p
        className="font-specimen"
        style={{
          fontFamily: family,
          fontWeight: displayWeight,
          fontSize: "var(--text-display-size)",
          lineHeight: 0.9,
          letterSpacing: "var(--track-display)",
        }}
      >
        {DISPLAY_LINE}
      </p>
      <p className="font-specimen text-body" style={{ fontFamily: family, fontWeight: 400 }}>
        {BODY_LINE}
      </p>
      <p className="font-specimen text-body" style={{ fontFamily: family, fontWeight: 400 }}>
        {NUMBER_LINE}
      </p>
      <p className="text-micro" style={{ color: "var(--text-muted)" }}>
        {note}
      </p>
    </article>
  );
}

function FontMix() {
  const page = "var(--font-ui)";
  const windowFace = "var(--font-window)";
  return (
    <div className="flex flex-wrap items-end gap-6">
      <p
        className="font-specimen"
        style={{
          fontFamily: page,
          fontWeight: 500,
          fontSize: "var(--text-section-size)",
          lineHeight: 0.9,
          letterSpacing: "var(--track-display)",
        }}
      >
        An OTC desk
      </p>
      <div className="w-[304px] border border-ink">
        <p className="font-specimen bg-ink px-3 py-2 text-body font-medium text-onfocus" style={{ fontFamily: page }}>
          Quote
        </p>
        <div className="flex flex-col gap-2 bg-paper px-3 py-4">
          <p className="font-specimen text-body" style={{ fontFamily: windowFace }}>
            Ask 3,987.98
          </p>
          <p className="font-specimen text-body" style={{ fontFamily: windowFace }}>
            Bid 3,980.02
          </p>
          <p className="font-specimen text-body" style={{ fontFamily: windowFace }}>
            Tokens stay in the multisig until each fill.
          </p>
        </div>
      </div>
    </div>
  );
}

function FontCompare() {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-body font-medium" style={{ letterSpacing: "var(--track-kicker)" }}>
          One mix
        </p>
        <p className="text-body">Die Grotesk C on the headline and the window title. Lisa at 16px inside the window.</p>
      </div>
      <FontMix />
      <div className="flex flex-col gap-2">
        <p className="text-body font-medium" style={{ letterSpacing: "var(--track-kicker)" }}>
          Fonts
        </p>
        <p className="text-body">Same words in each face. The large line is 96px. The two under it are 16px.</p>
      </div>
      <p className="text-body font-medium">Page type</p>
      {PAGE_FACES.map((face) => (
        <FontSpecimen key={face.name} {...face} />
      ))}
      <p className="text-body font-medium">Window, drawn</p>
      <p className="text-body">These are fixed-width, and the letters are drawn. No pixel grid.</p>
      {DRAWN_WINDOW_FACES.map((face) => (
        <FontSpecimen key={face.name} {...face} />
      ))}
      <p className="text-body font-medium">Window, pixel</p>
      {PIXEL_WINDOW_FACES.map((face) => (
        <FontSpecimen key={face.name} {...face} />
      ))}
    </section>
  );
}

function TokenSheet() {
  return (
    <section className="flex flex-col gap-7">
      <p className="text-body font-medium" style={{ letterSpacing: "var(--track-kicker)" }}>
        Tokens
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {FIELDS.map((field) => (
          <div key={field.name} className="border border-ink p-4" style={{ background: field.swatch, color: field.ink }}>
            <p className="text-body font-medium">{field.name}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {MARKS.map((mark) => (
          <p key={mark.name} className="flex items-center gap-2 text-body">
            <span className="inline-block h-2 w-2" style={{ background: mark.color }} />
            {mark.name}
          </p>
        ))}
      </div>
      <div className="flex flex-col gap-5">
        <p className="text-display font-medium">An OTC desk</p>
        <p className="text-section font-medium">The treasury quotes</p>
        <p className="text-h1 font-medium">Desk</p>
        <p className="text-field">Tokens stay in the multisig until each fill.</p>
        <p className="text-body">Forms, tables, and buttons stay at this size.</p>
        <p className="text-body font-medium" style={{ letterSpacing: "var(--track-kicker)" }}>
          Sepolia testnet
        </p>
        <p className="num text-body">3,987.98</p>
        <p className="num text-h2 font-medium">90.0%</p>
        <p>
          <span className="inline-block rounded-pill bg-ink px-2 py-1 text-micro font-medium text-onfocus">Live</span>
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {GAPS.map((gap) => (
          <p key={gap} className="flex items-center gap-4 text-body">
            <span className="inline-block h-2 bg-ink" style={{ width: gap }} />
            {gap}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-start gap-5">
        <span className="inline-block bg-ink px-4 py-3 text-body font-medium text-onfocus">Open the live demo</span>
        <span className="inline-block bg-paper p-5 text-body" style={{ boxShadow: "var(--shadow-overlay)" }}>
          Overlay
        </span>
      </div>
    </section>
  );
}

const KINDS: StatusKind[] = [
  "Live",
  "Stopped",
  "NotOpen",
  "Expired",
  "NoTerms",
  "WrongResolver",
  "NoAddress",
  "Stale",
];

export function Kit() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("1.5");
  const [step, setStep] = useState("policy");

  return (
    <div className="flex flex-col gap-7">
      <FontCompare />
      <TokenSheet />
      <h1 className="text-h1">Kit</h1>
      <button
        type="button"
        className="text-body"
        onClick={() => {
          seedOneFill();
          void queryClient.invalidateQueries({ queryKey: ["fills"] });
        }}
      >
        Seed one fill
      </button>
      <p>{labelFor(FIXTURE_OWNERS[0] ?? "", FIXTURE_OWNERS, FIXTURE_MMS)}</p>
      <p>{labelFor(FIXTURE_MMS[0]?.address ?? "", FIXTURE_OWNERS, FIXTURE_MMS)}</p>
      <p>{labelFor("0x0000000000000000000000000000000000000009", FIXTURE_OWNERS, FIXTURE_MMS)}</p>
      <StatTile label="Ready" value="400,000.00 USDC" delta="+1" />
      <StatTile label="Missing" value="—" />
      <EmptyState sentence="No desk is open." action={{ label: "Open a desk", onClick: () => undefined }} />
      <Skeleton className="h-8 w-full" />
      <div className="flex flex-wrap gap-2">
        {KINDS.map((kind) => (
          <StatusBadge key={kind} kind={kind} />
        ))}
      </div>
      <div className="flex gap-2">
        <SourceBadge source={0} />
        <SourceBadge source={1} />
        <SourceBadge source={2} />
      </div>
      <ShareBar shareWad={900000000000000000n} targetWad={700000000000000000n} caption="ETH share 90.0%" />
      <AddressCell address="0x0000000000000000000000000000000000000005" ens={clientName("mm-a")} />
      <TxLink hash="0x0000000000000000000000000000000000000000000000000000000000000001" />
      <TxLink hash="0x0000000000000000000000000000000000000000000000000000000000000002" pending />
      <AmountInput value={amount} onChange={setAmount} unit="WETH" max="900" />
      <Stepper
        steps={[
          { id: "treasury", label: "Treasury" },
          { id: "policy", label: "Policy" },
        ]}
        current={step}
        onJump={setStep}
      />
      <Countdown secondsLeft={15} />
      <Countdown secondsLeft={0} />
      <ShowRaw summary="Plain sentence">
        <pre>raw</pre>
      </ShowRaw>
    </div>
  );
}
