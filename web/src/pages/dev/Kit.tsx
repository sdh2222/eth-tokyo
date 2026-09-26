import { useState } from "react";
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
