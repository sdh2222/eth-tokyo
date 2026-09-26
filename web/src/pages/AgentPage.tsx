import { useState } from "react";
import { Link } from "react-router-dom";
import sepoliaConfig from "@config";
import type { DeskBook } from "../desk/book";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { formatAddr, formatWeth } from "../lib/format";
import { Empty, Facts, Page, PageHead, Pill, Section, Window, type Tone } from "../ui/plain";
import { SafeDialog } from "./open/SafeDialog";

// Risk agent (IA: "What spread is the agent setting, and inside which limits?"). Plain page kit.
// Screens SC-24: every section is 12 columns. The page is read-only except the policy edit,
// which opens the Safe signing overlay (O1).

type SpreadState = { label: string; tone: Tone };

const CAN_WRITE: readonly (readonly [string, string])[] = [
  ["desk.spread", "Two widths and a valid-until time"],
  ["desk.stats", "The last write, as text"],
];

const CANNOT = ["Policy", "Terms", "Addresses", "Caps", "Expiry", "Oracle", "Ship or stop the desk"];

function spreadState(book: DeskBook, now: number): SpreadState {
  if (book.spread === null) return { label: "No spread · quoting on terms", tone: "neutral" };
  if (book.spread.live) return { label: "Live", tone: "success" };
  if (Number(book.spread.validUntil) <= now) return { label: "Expired · quoting on terms", tone: "warning" };
  return { label: "Outside terms · quoting on terms", tone: "warning" };
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

  if (book.isLoading) {
    return (
      <Page>
        <PageHead title="Risk agent" lede="Reading the agent…" />
      </Page>
    );
  }
  if (!book.data) {
    return (
      <Page>
        <PageHead title="Risk agent" />
        <Empty title="The agent could not be read. Check the Sepolia RPC in web/.env and reload." />
      </Page>
    );
  }

  const b = book.data;
  const state = spreadState(b, now);
  const termsWidths = b.terms ? `sell ${b.terms.sellBps} bp · buy ${b.terms.buyBps} bp` : null;
  const validUntil = b.spread ? Number(b.spread.validUntil) : 0;

  return (
    <Page>
      <PageHead kicker={b.agent.name} title="Risk agent" lede="What spread is the agent setting, and inside which limits?" />

      <div className="wk-grid">
        <Section title="Live spread" className="wk-span-12" aside={<Pill tone={state.tone}>{state.label}</Pill>}>
          {b.spread ? (
            <>
              <div className="wk-quote">
                <div className="wk-stack wk-stack-4">
                  <span className="wk-label">Sell width</span>
                  <span className="wk-big">
                    <span className="wk-mark">{`${b.spread.sellBps} bp`}</span>
                  </span>
                  {b.terms ? <span className="wk-muted">{`Limit ${b.terms.sellBps} bp`}</span> : null}
                </div>
                <div className="wk-stack wk-stack-4">
                  <span className="wk-label">Buy width</span>
                  <span className="wk-big">
                    <span className="wk-mark">{`${b.spread.buyBps} bp`}</span>
                  </span>
                  {b.terms ? <span className="wk-muted">{`Limit ${b.terms.buyBps} bp`}</span> : null}
                </div>
              </div>
              <Facts
                items={[
                  [
                    "Valid until",
                    <time dateTime={new Date(validUntil * 1000).toISOString()}>{formatDateTime(validUntil)}</time>,
                  ],
                ]}
              />
            </>
          ) : (
            <p>{`The agent has not written desk.spread on ${b.name}.`}</p>
          )}
          <p className="wk-muted">
            {b.spread?.live
              ? "Both counterparties pay these widths until the time above."
              : termsWidths
                ? `The quote uses the terms: ${termsWidths}.`
                : "No quote: the terms on the client names disagree or are missing."}
          </p>
        </Section>

        <Section title="Policy" className="wk-span-12">
          <Window title="desk.policy" meta={b.name}>
            <p>{b.policy || "The Safe has not written a policy yet."}</p>
          </Window>
          <p className="wk-muted">Plain English the Safe writes. The agent follows it.</p>
          <div className="wk-row">
            <button type="button" className="wk-btn" onClick={() => setIsPolicyOpen(true)}>
              Edit policy
            </button>
          </div>
        </Section>

        <Section
          title="Fence"
          className="wk-span-12"
          aside={
            <Link className="wk-link" to="/counterparties">
              See counterparties
            </Link>
          }
        >
          {b.terms ? (
            <Facts
              items={[
                ["Sell width limit", `${b.terms.sellBps} bp`],
                ["Buy width limit", `${b.terms.buyBps} bp`],
                ["Cap per fill", formatWeth(b.terms.cap)],
              ]}
            />
          ) : (
            <p>No terms: the client names disagree or are missing.</p>
          )}
          <p className="wk-muted">A spread counts only inside these terms. Otherwise the quote uses the terms.</p>
        </Section>

        <Section title="Identity and permissions" className="wk-span-12">
          <Facts
            items={[
              ["ENS name", b.agent.name],
              [
                "Address",
                <a className="wk-link" href={`${sepoliaConfig.explorer}/address/${b.agent.addr}`} target="_blank" rel="noreferrer">
                  {formatAddr(b.agent.addr)}
                </a>,
              ],
            ]}
          />
          <details className="wk-raw">
            <summary>Show raw</summary>
            <Window title="Agent" meta={b.agent.name}>
              <div>{`addr ${b.agent.addr}`}</div>
            </Window>
          </details>
          <div className="wk-grid">
            <div className="wk-span-6 wk-stack wk-stack-8">
              <h3 className="wk-label">Can write</h3>
              <ul className="wk-list">
                {CAN_WRITE.map(([record, what]) => (
                  <li key={record}>
                    <span>{record}</span>
                    <span className="wk-muted">{what}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="wk-span-6 wk-stack wk-stack-8">
              <h3 className="wk-label">Cannot</h3>
              <ul className="wk-list">
                {CANNOT.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
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
