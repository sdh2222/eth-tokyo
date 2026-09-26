import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { useDeskPort, useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatHash, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { Card, Empty, Header, Metric, Metrics, Page, Status } from "../ui/v";
import { SafeDialog } from "./open/SafeDialog";
import { programLines } from "./ProgramPage";

// Controls (IA: "What does it take to change or stop the desk?"). Vercel-style: Change (the
// one primary) and Stop in the header, the metrics card, then the program and the checks, then
// "what changes how" (SC-21). Stop asks one sentence (AlertDialog), then the Safe dialog (SC-05).

// The oracle owner, from docs/agent-design.md ("Live chain"). The agent must not be it.
const ORACLE_OWNER = "0x1AC95a5e4CD739D01130f705f93D3bE070407c2b";
const CHANGE_HREF = "/open?step=2";

type ChangeRow = { id: string; how: string; what: string; linkLabel: string; href: string };
type Check = { id: string; label: string; ok: boolean; pass: string; fail: string };

// Time left on the program: hours and minutes inside a day, whole days after that.
function closesIn(deadline: number, now: number): string {
  const left = deadline - now;
  if (left <= 0) return "Closed";
  if (left < 86400) return formatWhen(deadline, now);
  const days = Math.floor(left / 86400);
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}

export function ControlsPage() {
  const port = useDeskPort();
  const live = useLiveStrategy();
  const strategy = live.data ?? null;
  const desk = useDeskState(strategy);
  const book = useBook();
  const now = useClock();
  const [isStopAsked, setIsStopAsked] = useState(false);
  const [isSafeOpen, setIsSafeOpen] = useState(false);

  if (live.isLoading) {
    return (
      <Page>
        <Header title="Controls" description="Reading the desk…" />
      </Page>
    );
  }
  if (!strategy) {
    return (
      <Page>
        <Header title="Controls" description="What it takes to change or stop the desk." />
        <Card>
          <Empty
            picture
            title="No desk is open"
            description="There is nothing to change or stop. Opening a desk ships the program to Aqua in one Safe transaction."
            action={
              <Link className="v-btn" to="/open">
                Open a desk
              </Link>
            }
          />
        </Card>
      </Page>
    );
  }

  const deadline = desk.data?.deadline ?? Number(strategy.decoded.deadline);
  const terms = book.data?.terms ?? null;
  const agentAddr = book.data?.agent.addr;
  const oracleOk = agentAddr !== undefined && agentAddr.toLowerCase() !== ORACLE_OWNER.toLowerCase();
  const oneLive = strategy.warning !== "MULTIPLE_LIVE";
  const lines = programLines(port, strategy);

  const rows: ChangeRow[] = [
    {
      id: "agent",
      how: "Agent moves it",
      what: "Each counterparty's desk.spread and desk.stats, written after that counterparty's fills, inside that name's terms.",
      linkLabel: "Risk agent",
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
      <Header
        title="Controls"
        description={book.data?.name ?? "The desk"}
        actions={
          <>
            <Link className="v-btn" to={CHANGE_HREF}>
              Change
            </Link>
            <button type="button" className="v-btn v-btn-error" onClick={() => setIsStopAsked(true)}>
              Stop the desk
            </button>
          </>
        }
      />

      <Card flush>
        <Metrics>
          <Metric label="Desk" value={<Status tone="green">Live</Status>} />
          <Metric label="Closes" value={closesIn(deadline, now)} />
          <Metric label="Shipped in block" value={strategy.shippedAt.block.toLocaleString("en-US")} />
          <Metric
            label="Strategy"
            value={
              <span className="v-mono" title={strategy.strategyHash}>
                {formatHash(strategy.strategyHash)}
              </span>
            }
          />
        </Metrics>
      </Card>

      <div className="v-grid">
        <Card
          className="v-col-7"
          title="Program"
          actions={
            <Link className="v-btn v-btn-secondary" to="/program">
              See the program
            </Link>
          }
        >
          <ol className="v-stack v-stack-8">
            {lines.map((line, index) => (
              <li key={line}>
                <span className="v-muted v-num">{`${index + 1}.`}</span> {line}
              </li>
            ))}
          </ol>
        </Card>

        <Card className="v-col-5" title="Checks">
          <div className="v-stack v-stack-24">
            {checks.map((check) => (
              <div key={check.id} className="v-stack v-stack-4">
                <div className="v-row v-between">
                  <span>{check.label}</span>
                  <Status tone={check.ok ? "green" : "red"}>{check.ok ? "Passes" : "Fails"}</Status>
                </div>
                <span className="v-muted">{check.ok ? check.pass : check.fail}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="What changes how"
        flush
        footer="Change docks this program and ships a new one in one Safe transaction. Stop docks it."
      >
        <div className="v-table-wrap">
          <table className="v-table">
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
                    <Link to={row.href}>{row.linkLabel}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
