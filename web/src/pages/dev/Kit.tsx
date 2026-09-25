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
import { FIXTURE_MMS, FIXTURE_OWNERS } from "../../desk/fixture/state";
import { labelFor } from "../../hooks/useCanAct";

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
    <div className="flex flex-col gap-5">
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
      <AddressCell address="0x0000000000000000000000000000000000000005" ens="mm-a.clients.desk.eth" />
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
