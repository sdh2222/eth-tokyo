import { useState } from "react";
import { Link } from "react-router-dom";
import sepoliaConfig from "@config";
import { formatBpsShare, nameQuote, shortName, type AgentWrite, type DeskBook } from "../desk/book";
import { useAgentWrites, writeFor, type AgentWrites } from "../hooks/useAgentWrites";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { formatAddr } from "../lib/format";
import { formatWhen } from "../lib/time";
import { SpreadStrip } from "../ui/cells";
import { Badge, Card, Dl, Header, Metric, Metrics, Page, type Tone } from "../ui/v";
import { SafeDialog } from "./open/SafeDialog";

// Risk agent (IA: "What spread is the agent setting, and inside which limits?"). Main's flow
// (PR #34): after each fill the agent rewrites that counterparty's own desk.spread and
// desk.stats from desk.policy. Vercel-style: metrics, spreads by counterparty, how it
// decides, the policy, then identity and permissions. Read-only except the policy edit,
// which opens the Safe signing overlay (O1).

const CAN_WRITE: readonly (readonly [string, string])[] = [
  ["desk.spread", "Two widths and a valid-until time"],
  ["desk.stats", "The last write, as text"],
];

const CANNOT = ["Policy", "Terms", "Addresses", "Caps", "Expiry", "Oracle", "Ship or stop the desk"];

const SOURCE_LABEL: Record<AgentWrites["source"], string> = {
  index: "Keeper index",
  ens: "ENS desk.stats",
  fixture: "Fixture",
};

// Widths as ask / bid around the mid, e.g. "+1 / −9 bp".
function widths(sellBps: number, buyBps: number): string {
  return `+${sellBps} / −${buyBps} bp`;
}

function headerState(agentCount: number, liveCount: number): { label: string; tone: Tone } {
  if (agentCount === 0) return { label: "No live spread", tone: "amber" };
  if (agentCount < liveCount) return { label: `${agentCount} of ${liveCount} live`, tone: "amber" };
  return { label: "Live", tone: "green" };
}

// The inventory step desk.policy applies now: above the target the agent sells tighter and
// buys wider, below it the other way round.
function policyStep(book: DeskBook): { value: string; hint: string } {
  const { wBps, wStarBps } = book.inventory;
  const target = `${wStarBps / 100}%`;
  const share = `ETH ${formatBpsShare(wBps)}`;
  if (wBps > wStarBps) return { value: `Above ${target}`, hint: `${share} · sell −1 / buy +1 bp` };
  if (wBps < wStarBps) return { value: `Below ${target}`, hint: `${share} · sell +1 / buy −1 bp` };
  return { value: `At ${target}`, hint: `${share} · no step` };
}

function latestWrite(writes: AgentWrite[]): AgentWrite | undefined {
  return writes.reduce<AgentWrite | undefined>((last, write) => (!last || write.writtenAt > last.writtenAt ? write : last), undefined);
}

export function AgentPage() {
  const book = useBook();
  const now = useClock();
  const writes = useAgentWrites();
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
  const liveCount = b.names.filter((name) => name.live).length;
  const agentCount = b.names.filter((name) => name.live && name.spread?.live).length;
  const state = headerState(agentCount, liveCount);
  const step = policyStep(b);
  const last = latestWrite(writes.data?.writes ?? []);

  return (
    <Page>
      <Header title="Risk agent" description={b.agent.name} actions={<Badge tone={state.tone}>{state.label}</Badge>} />

      <Card flush>
        <Metrics>
          <Metric label="Names it prices" value={String(b.names.length)} />
          <Metric
            label="Last write"
            value={last ? formatWhen(last.writtenAt, now) : "—"}
            hint={last ? shortName(last.name) : "No write yet"}
          />
          <Metric label="Source" value={writes.data ? SOURCE_LABEL[writes.data.source] : "—"} />
          <Metric label="Policy step now" value={step.value} hint={step.hint} />
        </Metrics>
      </Card>

      <Card
        title="Spreads by counterparty"
        flush
        actions={
          <Link className="v-btn v-btn-secondary" to="/counterparties">
            Counterparties
          </Link>
        }
      >
        <div className="v-table-wrap">
          <table className="v-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Widths now</th>
                <th>Against its terms</th>
                <th>Valid until</th>
                <th>Last write</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {b.names.map((name) => {
                const q = nameQuote(b, name);
                const write = writeFor(writes.data, name.name);
                return (
                  <tr key={name.name}>
                    <td>{shortName(name.name)}</td>
                    <td>
                      {q ? (
                        <>
                          {widths(q.sellBps, q.buyBps)}
                          {q.source === "terms" ? <span className="v-muted"> · terms</span> : null}
                        </>
                      ) : (
                        <span className="v-muted">—</span>
                      )}
                    </td>
                    <td>
                      {q ? (
                        <SpreadStrip sellBps={q.sellBps} buyBps={q.buyBps} fenceSellBps={name.terms?.sellBps} fenceBuyBps={name.terms?.buyBps} />
                      ) : null}
                    </td>
                    <td className={name.spread?.live ? undefined : "v-muted"}>
                      {name.spread ? formatWhen(Number(name.spread.validUntil), now) : "—"}
                    </td>
                    <td className="v-muted">{write ? formatWhen(write.writtenAt, now) : "No write yet"}</td>
                    <td>
                      {write?.tier || write?.note ? (
                        <span className="v-row v-row-8">
                          {write.tier ? <Badge>{write.tier}</Badge> : null}
                          {write.note ? <span className="v-muted">{write.note}</span> : null}
                        </span>
                      ) : (
                        <span className="v-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="v-grid">
        <Card className="v-col-7" title="How the agent decides">
          <Dl
            items={[
              ["After each fill", "Rewrites that counterparty's desk.spread and desk.stats."],
              ["Tier by size", "Tight +1 / −4 bp up to 1 ETH, standard +2 / −8 bp up to 10 ETH, else the fence, +3 / −10 bp."],
              ["Inventory step", "Above 70% ETH: sell −1, buy +1 bp. Below: sell +1, buy −1 bp. Sell stays at 1 bp or more."],
              ["Suspicion", "The oracle moved 1 bp or more in the taker's favour, the same name is back within 50 blocks, or the size grew: both widths 1 bp wider."],
              ["Limits", "Always inside that name's terms. Valid for 10 minutes."],
            ]}
          />
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
              <p className="v-label">Can write, on each client name</p>
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
