import { useState } from "react";
import { Link } from "react-router-dom";
import sepoliaConfig from "@config";
import type { DeskBook } from "../desk/book";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { formatAddr, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { SpreadStrip } from "../ui/cells";
import { Badge, Card, Dl, Header, Metric, Metrics, Page, type Tone } from "../ui/v";
import { SafeDialog } from "./open/SafeDialog";

// Risk agent (IA: "What spread is the agent setting, and inside which limits?"). Vercel-style:
// the spread in one metrics card, then Spread and Policy cards, then Identity and Permissions.
// Read-only except the policy edit, which opens the Safe signing overlay (O1).

type SpreadState = { label: string; tone: Tone };

const CAN_WRITE: readonly (readonly [string, string])[] = [
  ["desk.spread", "Two widths and a valid-until time"],
  ["desk.stats", "The last write, as text"],
];

const CANNOT = ["Policy", "Terms", "Addresses", "Caps", "Expiry", "Oracle", "Ship or stop the desk"];

function spreadState(book: DeskBook, now: number): SpreadState {
  if (book.spread === null) return { label: "No spread", tone: "gray" };
  if (book.spread.live) return { label: "Live", tone: "green" };
  if (Number(book.spread.validUntil) <= now) return { label: "Expired", tone: "amber" };
  return { label: "Outside fence", tone: "amber" };
}

function formatDateTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AgentPage() {
  const book = useBook();
  const now = useClock();
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);

  if (!book.data) {
    return (
      <Page>
        <Header
          title="Risk agent"
          description={book.isLoading ? "Reading the agent…" : "The agent could not be read. Check the Sepolia RPC in web/.env and reload."}
        />
      </Page>
    );
  }

  const b = book.data;
  const state = spreadState(b, now);
  const validUntil = b.spread ? Number(b.spread.validUntil) : 0;
  const live = b.spread?.live === true;
  // The widths the quote uses now: the agent spread while it is live, otherwise the terms.
  const widthsNow = live && b.spread ? b.spread : b.terms;
  // The strip draws the agent's spread (even when it is outside the fence) against the terms.
  const sell = b.spread?.sellBps ?? b.terms?.sellBps ?? 0;
  const buy = b.spread?.buyBps ?? b.terms?.buyBps ?? 0;

  return (
    <Page>
      <Header title="Risk agent" description={b.agent.name} actions={<Badge tone={state.tone}>{state.label}</Badge>} />

      <Card flush>
        <Metrics>
          <Metric label="Bid width" value={b.spread ? `−${b.spread.buyBps} bp` : "—"} />
          <Metric label="Ask width" value={b.spread ? `+${b.spread.sellBps} bp` : "—"} />
          <Metric
            label="Valid until"
            value={b.spread ? formatWhen(validUntil, now) : "—"}
            hint={b.spread ? <time dateTime={new Date(validUntil * 1000).toISOString()}>{formatDateTime(validUntil)}</time> : undefined}
          />
          <Metric label="Source" value={live ? "Agent spread" : b.terms ? "Terms widths" : "No quote"} />
        </Metrics>
      </Card>

      <div className="v-grid">
        <Card
          className="v-col-7"
          title="Spread"
          actions={
            <Link className="v-btn v-btn-secondary" to="/counterparties">
              Counterparties
            </Link>
          }
          footer={<span>A spread counts only inside the terms. Otherwise the quote uses the terms.</span>}
        >
          <div className="v-stack v-stack-24">
            <SpreadStrip sellBps={sell} buyBps={buy} fenceSellBps={b.terms?.sellBps} fenceBuyBps={b.terms?.buyBps} />
            <Dl
              items={[
                ["Widths now", widthsNow ? `bid −${widthsNow.buyBps} bp · ask +${widthsNow.sellBps} bp` : "—"],
                [
                  "Terms fence",
                  b.terms
                    ? `bid −${b.terms.buyBps} bp · ask +${b.terms.sellBps} bp · cap ${formatWeth(b.terms.cap)}`
                    : "None · the client names disagree or are missing",
                ],
              ]}
            />
          </div>
        </Card>

        <Card
          className="v-col-5"
          title="Policy"
          actions={
            <button type="button" className="v-btn v-btn-secondary" onClick={() => setIsPolicyOpen(true)}>
              Edit policy
            </button>
          }
          footer={<span>Plain English the Safe writes to desk.policy. The agent follows it.</span>}
        >
          <div>{b.policy || "The Safe has not written a policy yet."}</div>
        </Card>
      </div>

      <div className="v-grid">
        <Card className="v-col-6" title="Identity">
          <div className="v-stack">
            <Dl
              items={[
                ["ENS name", b.agent.name],
                [
                  "Address",
                  <a className="v-mono" href={`${sepoliaConfig.explorer}/address/${b.agent.addr}`} target="_blank" rel="noreferrer">
                    {formatAddr(b.agent.addr)}
                  </a>,
                ],
              ]}
            />
            <details className="v-details">
              <summary>Show raw</summary>
              <div className="v-code">{`addr ${b.agent.addr}`}</div>
            </details>
          </div>
        </Card>

        <Card className="v-col-6" title="Permissions">
          <div className="v-grid">
            <div className="v-col-6 v-stack v-stack-8">
              <p className="v-label">Can write</p>
              {CAN_WRITE.map(([record, what]) => (
                <div key={record} className="v-stack v-stack-4">
                  <span className="v-mono">{record}</span>
                  <span className="v-muted">{what}</span>
                </div>
              ))}
            </div>
            <div className="v-col-6 v-stack v-stack-8">
              <p className="v-label">Cannot</p>
              {CANNOT.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <SafeDialog
        isOpen={isPolicyOpen}
        onOpenChange={setIsPolicyOpen}
        title="Edit policy"
        description="The new policy is written to desk.policy on the desk name as a Safe transaction."
      />
    </Page>
  );
}
