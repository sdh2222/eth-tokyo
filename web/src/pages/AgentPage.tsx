import { useState } from "react";
import { Link } from "react-router-dom";
import sepoliaConfig from "@config";
import { nameQuote, shortName, type AgentWrite } from "../desk/book";
import { useAgentWrites, writeFor } from "../hooks/useAgentWrites";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { useLiveStrategy } from "../hooks/useDesk";
import { formatAddr } from "../lib/format";
import { formatWhen } from "../lib/time";
import { widthsFor } from "@desk/counterparty";
import { englishPolicy, readPolicy } from "../desk/policy";
import { Badge, Card, Dl, Empty, Header, Page, Status, type Tone } from "../ui/v";
import { SafeDialog } from "./open/SafeDialog";

// Risk agent (IA: "What spread is the agent setting, and inside which limits?"). Main's flow
// (PR #34): after each fill the agent rewrites that counterparty's own desk.spread and
// desk.stats from desk.policy. Vercel-style: metrics, spreads by counterparty, how it
// decides, the policy, then identity and permissions. Read-only except the policy edit,
// which opens the Safe signing overlay (O1).

// The keeper's note in words. The note reads "markout 2bp repeat 12 sizeUp true cut 1"
// (ts/src/lib/counterparty.ts signNote); anything else is shown as written.
// The size tiers in the keeper (localTier: up to 1 ETH tight, up to 10 ETH standard, else the
// fence); their widths come from its widthsFor, so the table cannot drift from the code. The
// keeper (ts/src/bot/react.ts) asks Jev for the tier and keeps Jev's pick at confidence 0.6 or
// more (chooseTier), and writes each spread valid for 600 s.
const TIERS: [string, "tight" | "standard" | "fence"][] = [
  ["Fill up to 1 ETH", "tight"],
  ["Fill up to 10 ETH", "standard"],
  ["Larger fill", "fence"],
];

// Amber when the agent widened for a warning sign, green when it saw none.
function humanWhy(write: AgentWrite): { text: string; tone?: Tone } {
  const size = write.tier === "tight" ? "Small fill" : write.tier === "standard" ? "Mid-size fill" : write.tier ? "Large fill" : "";
  const match = /markout (\d+)bp repeat (\w+) sizeUp (true|false) cut (\d+)/.exec(write.note ?? "");
  if (!match) return { text: [size, write.note].filter(Boolean).join(" · ") || "—" };
  const [, markout, repeat, sizeUp, cut] = match;
  const signs = [
    Number(markout) > 0 ? `taker gained ${markout} bp` : "",
    repeat && repeat !== "none" ? `back after ${repeat} blocks` : "",
    sizeUp === "true" ? "sized up" : "",
  ].filter(Boolean);
  const widened = signs.length > 0 && Number(cut) > 0;
  const why = widened ? `${signs.join(", ")}: ${cut} bp wider` : "no warning signs";
  return { text: [size, why].filter(Boolean).join(" · "), tone: widened ? "amber" : "green" };
}

function Why({ write, onTerms }: { write: AgentWrite | undefined; onTerms: boolean }) {
  if (onTerms) return <>On its terms</>;
  if (!write) return <>No write yet</>;
  const why = humanWhy(write);
  return why.tone ? <Status tone={why.tone}>{why.text}</Status> : <>{why.text}</>;
}

function headerState(agentCount: number, liveCount: number): { label: string; tone: Tone } {
  if (agentCount === 0) return { label: "No live spread", tone: "amber" };
  if (agentCount < liveCount) return { label: `${agentCount} of ${liveCount} live`, tone: "amber" };
  return { label: "Live", tone: "green" };
}

// The policy: the text the Safe wrote to desk.policy. Edit opens the text; while you type, the
// card says what the agent will read from it (the keeper's parser). Propose hands it to the
// Safe dialog; an empty text or one the agent reads nothing from is stopped here.
function PolicyCard({ className, policy }: { className: string; policy: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [isSafeOpen, setIsSafeOpen] = useState(false);
  const editing = draft !== null;
  const text = draft ?? policy;
  const reading = readPolicy(text);
  const error =
    text.trim() === ""
      ? "Write a policy before proposing it."
      : reading.lines.length === 0
        ? "The agent reads nothing from this text: it keeps the tier widths."
        : null;

  function cancel() {
    setDraft(null);
    setTried(false);
  }

  function propose() {
    setTried(true);
    if (error === null) setIsSafeOpen(true);
  }

  return (
    <Card
      className={className}
      title="Policy"
      actions={
        editing ? null : (
          <button type="button" className="v-btn v-btn-secondary" onClick={() => setDraft(policy)}>
            Edit
          </button>
        )
      }
      footer={
        editing ? (
          <>
            <span>{draft === policy ? "No changes yet." : "Not written until the Safe signs."}</span>
            <span className="v-actions">
              <button type="button" className="v-btn v-btn-secondary" onClick={cancel}>
                Cancel
              </button>
              <button type="button" className="v-btn" onClick={propose} disabled={draft === policy}>
                Propose to Safe
              </button>
            </span>
          </>
        ) : null
      }
    >
      {editing ? (
        <div className="v-stack">
          <label className="v-field">
            <span className="v-label">Stored text · the agent reads its Korean sentences</span>
            <textarea
              className="v-input"
              lang="ko"
              rows={8}
              value={draft}
              aria-invalid={tried && error !== null}
              onChange={(event) => setDraft(event.target.value)}
            />
            {tried && error ? <span className="v-error">{error}</span> : null}
          </label>
          <div className="v-stack v-stack-8">
            <span className="v-label">What the agent reads</span>
            {reading.lines.length > 0 ? <Dl items={reading.lines} /> : null}
            {reading.missing.map((rule) => (
              <span key={rule} className="v-muted">{`No ${rule} found: the agent keeps the tier widths for it.`}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="v-stack v-stack-8">
          <p>{policy ? englishPolicy(policy) || "The agent reads no rule from this policy." : "The Safe has not written a policy yet."}</p>
          {policy ? (
            <details className="v-details">
              <summary>Stored text</summary>
              <p lang="ko" className="v-muted">
                {policy}
              </p>
            </details>
          ) : null}
        </div>
      )}
      <SafeDialog
        isOpen={isSafeOpen}
        onOpenChange={setIsSafeOpen}
        title="Propose the new policy"
        description="The Safe writes this text to desk.policy on the desk name. The agent reads it from the next fill on."
      />
    </Card>
  );
}

export function AgentPage() {
  const book = useBook();
  const now = useClock();
  const writes = useAgentWrites();
  const strategy = useLiveStrategy();

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
  // With no desk open nothing fills, so the agent has nothing to rewrite: say so instead of
  // showing widths. Rules and the policy stay, since the policy can be set before opening.
  const noDesk = !strategy.isLoading && !strategy.data;
  const state = noDesk ? { label: "No desk", tone: "gray" as Tone } : headerState(agentCount, liveCount);

  const above = b.inventory.wBps > b.inventory.wStarBps;
  const below = b.inventory.wBps < b.inventory.wStarBps;
  // The inventory and suspicion rows come from desk.policy, read with the keeper's own parser.
  const reading = readPolicy(b.policy);

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

      {noDesk ? (
        <Card>
          <Empty
            title="No desk is open"
            description="The agent rewrites a counterparty's widths after each of its fills. With no desk open there are no fills to react to."
            action={
              <Link className="v-btn v-btn-secondary" to="/open">
                Open a desk
              </Link>
            }
          />
        </Card>
      ) : (
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
                      <td className="v-muted v-wrap">
                        <Why write={write} onTerms={q?.source === "terms"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="v-grid">
        <Card
          className="v-col-7"
          title="Rules"
          flush
          footer="Jev picks the size tier when it is at least 60% sure, else the size rule does. Rewritten after each fill for that counterparty only, valid 10 minutes, always inside its terms."
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
                {TIERS.map(([when, tier]) => {
                  const w = widthsFor(tier);
                  return (
                    <tr key={tier}>
                      <td>{when}</td>
                      <td className="v-right">{`−${w.buyBps} / +${w.sellBps} bp`}</td>
                    </tr>
                  );
                })}
                {reading.lines.map(([when, then], index) => {
                  const isNow = reading.step !== null && ((index === 0 && above) || (index === 1 && below));
                  return (
                    <tr key={when}>
                      <td className="v-wrap">
                        {when}
                        {isNow ? (
                          <>
                            {" "}
                            <Badge tone="blue">Now</Badge>
                          </>
                        ) : null}
                      </td>
                      <td className="v-right">{then}</td>
                    </tr>
                  );
                })}
                {reading.missing.map((rule) => (
                  <tr key={rule}>
                    <td className="v-muted v-wrap" colSpan={2}>{`The policy has no ${rule}.`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <PolicyCard className="v-col-5" policy={b.policy} />
      </div>
    </Page>
  );
}
