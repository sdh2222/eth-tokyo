import { useState } from "react";
import sepoliaConfig from "@config";
import { nameQuote, shortName, type AgentWrite } from "../desk/book";
import { useAgentWrites, writeFor } from "../hooks/useAgentWrites";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { formatAddr } from "../lib/format";
import { formatWhen } from "../lib/time";
import { Badge, Card, Header, Page, type Tone } from "../ui/v";
import { SafeDialog } from "./open/SafeDialog";

// Risk agent (IA: "What spread is the agent setting, and inside which limits?"). Main's flow
// (PR #34): after each fill the agent rewrites that counterparty's own desk.spread and
// desk.stats from desk.policy. Vercel-style: metrics, spreads by counterparty, how it
// decides, the policy, then identity and permissions. Read-only except the policy edit,
// which opens the Safe signing overlay (O1).

// The keeper's note in words. The note reads "markout 2bp repeat 12 sizeUp true cut 1"
// (ts/src/lib/counterparty.ts signNote); anything else is shown as written.
function humanWhy(write: AgentWrite): string {
  const size = write.tier === "tight" ? "Small fill" : write.tier === "standard" ? "Mid-size fill" : write.tier ? "Large fill" : "";
  const match = /markout (\d+)bp repeat (\w+) sizeUp (true|false) cut (\d+)/.exec(write.note ?? "");
  if (!match) return [size, write.note].filter(Boolean).join(" · ") || "—";
  const [, markout, repeat, sizeUp, cut] = match;
  const signs = [
    Number(markout) > 0 ? `taker gained ${markout} bp` : "",
    repeat && repeat !== "none" ? `back after ${repeat} blocks` : "",
    sizeUp === "true" ? "sized up" : "",
  ].filter(Boolean);
  const why = signs.length > 0 && Number(cut) > 0 ? `${signs.join(", ")}: ${cut} bp wider` : "no warning signs";
  return [size, why].filter(Boolean).join(" · ");
}

function headerState(agentCount: number, liveCount: number): { label: string; tone: Tone } {
  if (agentCount === 0) return { label: "No live spread", tone: "amber" };
  if (agentCount < liveCount) return { label: `${agentCount} of ${liveCount} live`, tone: "amber" };
  return { label: "Live", tone: "green" };
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

  const above = b.inventory.wBps > b.inventory.wStarBps;

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

      <Card title="Widths now" flush>
        <div className="v-table-wrap">
          <table className="v-table">
            <thead>
              <tr>
                <th>Counterparty</th>
                <th className="v-right">Bid</th>
                <th className="v-right">Ask</th>
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
                    <td className="v-right">{q ? `−${q.buyBps} bp` : "—"}</td>
                    <td className="v-right">{q ? `+${q.sellBps} bp` : "—"}</td>
                    <td className="v-right v-muted">{name.terms ? `−${name.terms.buyBps} / +${name.terms.sellBps}` : "—"}</td>
                    <td className="v-right v-muted">{write ? formatWhen(write.writtenAt, now) : "—"}</td>
                    <td className="v-muted v-wrap">{q?.source === "terms" ? "On its terms" : write ? humanWhy(write) : "No write yet"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="v-grid">
        <Card
          className="v-col-7"
          title="Rules"
          flush
          footer="Rewritten after each fill, for that counterparty only. Valid 10 minutes, always inside its terms."
        >
          <div className="v-table-wrap">
            <table className="v-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th className="v-right">Widths</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fill up to 1 ETH</td>
                  <td className="v-right">−4 / +1 bp</td>
                </tr>
                <tr>
                  <td>Fill up to 10 ETH</td>
                  <td className="v-right">−8 / +2 bp</td>
                </tr>
                <tr>
                  <td>Larger fill</td>
                  <td className="v-right">Its terms</td>
                </tr>
                <tr>
                  <td>
                    ETH share above 70%
                    {above ? <span className="v-muted"> · now</span> : null}
                  </td>
                  <td className="v-right">Buy 1 bp wider, sell 1 bp tighter</td>
                </tr>
                <tr>
                  <td>Taker gained, came back fast or sized up</td>
                  <td className="v-right">Both 1 bp wider</td>
                </tr>
              </tbody>
            </table>
          </div>
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
          <p>{b.policy || "The Safe has not written a policy yet."}</p>
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
