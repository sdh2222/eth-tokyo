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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">Verify</h1>
        <p className="text-body">{check.matches ? MATCHES : NO_MATCH}</p>
        <p className="text-small text-muted">{RECOMPUTED}</p>
      </header>
      <ol className="grid gap-3">
        {check.steps.map((step, index) => (
          <li key={step.label} className="flex gap-4 rounded-card border border-border bg-surface p-5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-program text-small text-onfocus">
              {index + 1}
            </span>
            <p className="text-body">
              {step.label} <span className="num">{step.value}</span>
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
