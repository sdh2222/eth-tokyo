import { useParams } from "react-router-dom";
import { MATCHES, NO_MATCH, RECOMPUTED } from "../copy/en";
import { useDeskPort, useFills, useLiveStrategy } from "../hooks/useDesk";
import { emptyConfig } from "../desk/fixture/state";

export function VerifyPage() {
  const { tx } = useParams();
  const live = useLiveStrategy();
  const fills = useFills(live.data ?? null);
  const port = useDeskPort();
  const fill = (fills.data ?? []).find((row) => row.tx === tx);
  if (!fill) return <p className="text-body">{NO_MATCH}</p>;
  const check = port.verifyFill(fill, emptyConfig());
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body">{check.matches ? MATCHES : NO_MATCH}</p>
      <p className="text-small text-muted">{RECOMPUTED}</p>
      <ol>
        {check.steps.map((step) => (
          <li key={step.label}>
            {step.label} {step.value}
          </li>
        ))}
      </ol>
    </div>
  );
}
