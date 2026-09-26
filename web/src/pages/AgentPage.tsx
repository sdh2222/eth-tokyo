import { useState } from "react";
import sepoliaConfig from "@config";
import { formatBpsShare, nameQuote, shortName, type DeskBook } from "../desk/book";
import { useAgentWrites, writeFor } from "../hooks/useAgentWrites";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { formatAddr } from "../lib/format";
import { formatWhen } from "../lib/time";
import { Badge, Card, Dl, Header, Page, type Tone } from "../ui/v";
import { SafeDialog } from "./open/SafeDialog";

// Risk agent (IA: "What spread is the agent setting, and inside which limits?"). Main's flow
// (PR #34): after each fill the agent rewrites that counterparty's own desk.spread and
// desk.stats from desk.policy. Vercel-style: metrics, spreads by counterparty, how it
// decides, the policy, then identity and permissions. Read-only except the policy edit,
// which opens the Safe signing overlay (O1).

// Widths as bid / ask around the mid, e.g. "−9 / +1 bp" (the Dashboard's order).
function widths(sellBps: number, buyBps: number): string {
  return `−${buyBps} / +${sellBps} bp`;
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

  return (
    <Page>
      <Header
        title="Risk agent"
        description={
          <>
            {`${b.agent.name} · `}
            <a className="v-mono" href={`${sepoliaConfig.explorer}/address/${b.agent.addr}`} target="_blank" rel="noreferrer">
              {formatAddr(b.agent.addr)}
            </a>
          </>
        }
        actions={<Badge tone={state.tone}>{state.label}</Badge>}
      />

      <Card title="Spreads by counterparty" flush>
        <div className="v-table-wrap">
          <table className="v-table">
            <thead>
              <tr>
                <th>Counterparty</th>
                <th className="v-right">Widths now</th>
                <th className="v-right">Terms</th>
                <th className="v-right">Set</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {b.names.map((name) => {
                const q = nameQuote(b, name);
                const write = writeFor(writes.data, name.name);
                return (
                  <tr key={name.name}>
                    <td>{shortName(name.name)}</td>
                    <td className="v-right">{q ? widths(q.sellBps, q.buyBps) : "—"}</td>
                    <td className="v-right v-muted">{name.terms ? widths(name.terms.sellBps, name.terms.buyBps) : "—"}</td>
                    <td className="v-right v-muted">{write ? formatWhen(write.writtenAt, now) : "—"}</td>
                    <td className="v-muted">{write ? write.note || write.tier || "—" : q?.source === "terms" ? "On its terms" : "No write yet"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="v-grid">
        <Card className="v-col-7" title="How it decides">
          <Dl
            items={[
              ["When", "After each fill, for that counterparty only. The new widths hold for 10 minutes."],
              ["Size", "Up to 1 ETH −4 / +1 bp, up to 10 ETH −8 / +2 bp, larger at the terms."],
              ["Inventory", `Above 70% ETH it sells 1 bp tighter and buys 1 bp wider. Now: ${step.value.toLowerCase()} (${step.hint.split(" · ")[0]}).`],
              ["Suspicion", "Oracle moved in the taker's favour, the same name back within 50 blocks, or a larger size: 1 bp wider."],
              ["Limits", "Always inside that counterparty's terms. It writes desk.spread and desk.stats only; terms, policy and the desk stay with the Safe."],
            ]}
          />
        </Card>

        <Card
          className="v-col-5"
          title="Policy"
          actions={
            <button type="button" className="v-btn v-btn-secondary" onClick={() => setIsPolicyOpen(true)}>
              Edit
            </button>
          }
        >
          <div className="v-muted">{b.policy || "The Safe has not written a policy yet."}</div>
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
