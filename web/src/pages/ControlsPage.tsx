import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { useBook } from "../hooks/useBook";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatWeth } from "../lib/format";
import { Empty, Facts, Page, PageHead, Pill, Section } from "../ui/plain";
import { SafeDialog } from "./open/SafeDialog";

// Controls (IA: "What does it take to change or stop the desk?"). Plain page kit.
// Screens SC-21: the live program 12 columns, then Change (the one primary) and the Stop
// outline, then the "what changes how" table 12. Stop asks one sentence (AlertDialog), then
// the Safe dialog (SC-05).

// The oracle owner, from docs/agent-design.md ("Live chain"). The agent must not be it.
const ORACLE_OWNER = "0x1AC95a5e4CD739D01130f705f93D3bE070407c2b";
const CHANGE_HREF = "/open?step=2";

type ChangeRow = { id: string; how: string; what: string; linkLabel: string; href: string };
type Check = { id: string; label: string; ok: boolean; pass: string; fail: string };

function formatWhen(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function ControlsPage() {
  const live = useLiveStrategy();
  const strategy = live.data ?? null;
  const desk = useDeskState(strategy);
  const book = useBook();
  const [isStopAsked, setIsStopAsked] = useState(false);
  const [isSafeOpen, setIsSafeOpen] = useState(false);

  if (live.isLoading) {
    return (
      <Page>
        <PageHead title="Controls" lede="Reading the desk…" />
      </Page>
    );
  }
  if (!strategy) {
    return (
      <Page>
        <PageHead title="Controls" lede="What it takes to change or stop the desk." />
        <Empty
          title="No desk is open. No program is shipped to Aqua; open a desk from the Safe to start quoting."
          action={
            <Link className="wm-link" to="/open">
              Open a desk
            </Link>
          }
        />
      </Page>
    );
  }

  const deadline = desk.data?.deadline ?? Number(strategy.decoded.deadline);
  const terms = book.data?.terms ?? null;
  const agentAddr = book.data?.agent.addr;
  const oracleOk = agentAddr !== undefined && agentAddr.toLowerCase() !== ORACLE_OWNER.toLowerCase();
  const oneLive = strategy.warning !== "MULTIPLE_LIVE";

  const rows: ChangeRow[] = [
    {
      id: "agent",
      how: "Agent moves it",
      what: "The spread: the sell and buy widths, inside the terms.",
      linkLabel: "Agent",
      href: "/agent",
    },
    {
      id: "signature",
      how: "One Safe signature",
      what: terms
        ? `Terms (sell ${terms.sellBps} bp, buy ${terms.buyBps} bp), cap (${formatWeth(terms.cap)}), names, policy, agent. The desk stays open.`
        : "Terms, cap, names, policy, agent. The desk stays open.",
      linkLabel: "Counterparties",
      href: "/counterparties",
    },
    {
      id: "reopen",
      how: "Reopen the desk",
      what: "Pair, oracle, 70% ETH target, 10-minute window, inventory, deadline.",
      linkLabel: "Change",
      href: CHANGE_HREF,
    },
  ];

  const checks: Check[] = [
    {
      id: "oracle",
      label: "Oracle owner is not the agent",
      ok: oracleOk,
      pass: "The agent can move the spread, not the price.",
      fail: "Check the oracle owner before the next fill.",
    },
    {
      id: "one-live",
      label: "One program live",
      ok: oneLive,
      pass: "Aqua holds one live program for this Safe.",
      fail: "More than one program is live. Stop the extra one.",
    },
  ];

  return (
    <Page>
      <PageHead title="Controls" lede="What it takes to change or stop the desk." />

      <div className="wm-grid">
        <Section
          title="Live program"
          className="wm-span-12"
          aside={
            <Link className="wm-link" to="/program">
              See the program
            </Link>
          }
        >
          <Facts
            items={[
              ["Status", <Pill tone="success">Live</Pill>],
              ["Shipped", `Block ${strategy.shippedAt.block.toLocaleString("en-US")}`],
              ["Closes", formatWhen(deadline)],
              ["Strategy hash", formatHash(strategy.strategyHash)],
            ]}
          />
        </Section>

        <div className="wm-span-12 wm-stack">
          <div className="wm-row wm-row-24">
            <Link className="wm-btn" to={CHANGE_HREF}>
              Change
            </Link>
            <button type="button" className="wm-btn wm-btn-danger" onClick={() => setIsStopAsked(true)}>
              Stop the desk
            </button>
          </div>
          <p className="wm-note">
            Change docks this program and ships a new one in one Safe transaction. Stop docks it.
          </p>
        </div>

        <Section title="What changes how" className="wm-span-12">
          <div className="wm-table-wrap">
            <table className="wm-table">
              <thead>
                <tr>
                  <th>How</th>
                  <th>What it changes</th>
                  <th>Where</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.how}</td>
                    <td>{row.what}</td>
                    <td>
                      <Link className="wm-link" to={row.href}>
                        {row.linkLabel}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Checks" className="wm-span-12">
          <ul className="wm-list">
            {checks.map((check) => (
              <li key={check.id}>
                <span className="wm-stack wm-stack-4">
                  <span>{check.label}</span>
                  <span className="wm-muted">{check.ok ? check.pass : check.fail}</span>
                </span>
                <Pill tone={check.ok ? "success" : "danger"}>{check.ok ? "Passes" : "Fails"}</Pill>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <AlertDialog
        isOpen={isStopAsked}
        onOpenChange={setIsStopAsked}
        title="Stop the desk?"
        description="Counterparties can't trade until a new desk opens. Tokens stay in the Safe."
        actionLabel="Stop the desk"
        onAction={() => {
          setIsStopAsked(false);
          setIsSafeOpen(true);
        }}
      />
      <SafeDialog
        isOpen={isSafeOpen}
        onOpenChange={setIsSafeOpen}
        title="Stop the desk"
        description="This proposal docks the live program on Aqua. Counterparties can't trade until a new desk opens. Tokens stay in the Safe."
      />
    </Page>
  );
}
