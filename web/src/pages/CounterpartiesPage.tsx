import { Fragment, useState, type FormEvent } from "react";
import sepoliaConfig from "@config";
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import { formatUnits } from "viem";
import type { DeskBook } from "../desk/book";
import { CLIENT_SUFFIX } from "../ens/names";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { formatAddr, formatWeth } from "../lib/format";
import { Badge, Card, Dl, Empty, Header, Metric, Metrics, Page, Status, type Tone } from "../ui/v";
import { SafeDialog } from "./open/SafeDialog";

// Counterparties (IA: "Who can trade with my desk, and on what terms?"). Vercel-style: the
// terms in one metrics card, then the client names in a flush table card. Edit expands the
// row (SC-10) and saving opens the Safe signing overlay (O1). Cut off shows one confirm
// sentence first (SC-05).

const SAFE_WALLET = "Safe{Wallet}";
const COLUMNS = 6;

type NameStatus = "Live" | "Expired" | "Cut off";

const STATUS_TONE: Record<NameStatus, Tone> = { Live: "green", Expired: "red", "Cut off": "gray" };

type NameRow = {
  id: string;
  name: string;
  addr: string;
  expiry: number;
  status: NameStatus;
  terms: string;
  reason: string;
};

type Draft = { sell: string; buy: string; cap: string };
type Proposal = { isOpen: boolean; title: string; description: string };

function termsText(terms: DeskBook["terms"]): string {
  if (!terms) return "No agreed terms";
  return `sell ${terms.sellBps} bp · buy ${terms.buyBps} bp · cap ${formatWeth(terms.cap)}`;
}

// The widths a live name pays now: the agent spread while it is live, otherwise the terms.
function widthNow(book: DeskBook): { widths: string; source: string } | null {
  if (book.spread?.live) return { widths: `sell ${book.spread.sellBps} · buy ${book.spread.buyBps} bp`, source: "agent spread" };
  if (book.terms) return { widths: `sell ${book.terms.sellBps} · buy ${book.terms.buyBps} bp`, source: "terms" };
  return null;
}

function toRows(book: DeskBook, now: number): NameRow[] {
  const terms = termsText(book.terms);
  return book.names.map((entry) => {
    const expiry = Number(entry.expiry);
    const expired = expiry > 0 && expiry <= now;
    const status: NameStatus = expired ? "Expired" : entry.live ? "Live" : "Cut off";
    let reason = "Its address is the wallet, it has terms, and it has not expired.";
    if (status === "Expired") reason = "The name has expired. The Safe renews it before it can trade again.";
    else if (status === "Cut off" && !book.terms) reason = "The client names do not store the same valid desk.terms.";
    else if (status === "Cut off") reason = "Its address or resolver does not pass the gate.";
    return { id: entry.name, name: entry.name, addr: entry.addr, expiry, status, terms, reason };
  });
}

function draftFrom(terms: DeskBook["terms"]): Draft {
  if (!terms) return { sell: "", buy: "", cap: "" };
  return { sell: String(terms.sellBps), buy: String(terms.buyBps), cap: formatUnits(terms.cap, 18) };
}

function isDraftValid(draft: Draft): boolean {
  const whole = /^\d+$/;
  const amount = /^\d+(\.\d{1,18})?$/;
  return whole.test(draft.sell.trim()) && whole.test(draft.buy.trim()) && amount.test(draft.cap.trim());
}

function Expiry({ seconds }: { seconds: number }) {
  if (seconds <= 0) return <>No expiry set</>;
  const date = new Date(seconds * 1000);
  return (
    <time dateTime={date.toISOString()}>
      {date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
    </time>
  );
}

function TermsEditor({
  row,
  draft,
  onDraft,
  onSave,
  onCancel,
  onCutOff,
}: {
  row: NameRow;
  draft: Draft;
  onDraft: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  onCutOff: () => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDraftValid(draft)) onSave();
  }

  return (
    <div className="v-card-body v-stack v-stack-24">
      <div className="v-stack">
        <Dl
          items={[
            ["Can trade", row.reason],
            ["Terms now", row.terms],
          ]}
        />
        <details className="v-details">
          <summary>Show raw</summary>
          <div className="v-code">
            <div>{`addr ${row.addr}`}</div>
            <div>{`expiry ${row.expiry > 0 ? String(row.expiry) : "none"}`}</div>
          </div>
        </details>
      </div>

      <form className="v-stack" onSubmit={submit} aria-label={`Terms for ${row.name}`}>
        <div className="v-row">
          <label className="v-field">
            <span>Sell width (bp)</span>
            <input
              className="v-input"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={draft.sell}
              onChange={(event) => onDraft({ ...draft, sell: event.target.value })}
            />
          </label>
          <label className="v-field">
            <span>Buy width (bp)</span>
            <input
              className="v-input"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={draft.buy}
              onChange={(event) => onDraft({ ...draft, buy: event.target.value })}
            />
          </label>
          <label className="v-field">
            <span>Cap per fill (WETH)</span>
            <input
              className="v-input"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={draft.cap}
              onChange={(event) => onDraft({ ...draft, cap: event.target.value })}
            />
          </label>
        </div>
        <p className="v-muted">{`Saving proposes the new desk.terms to the Safe in ${SAFE_WALLET}.`}</p>
        <div className="v-row v-between">
          <div className="v-row v-row-8">
            <button type="submit" className="v-btn" disabled={!isDraftValid(draft)}>
              Save terms
            </button>
            <button type="button" className="v-btn v-btn-tertiary" onClick={onCancel}>
              Cancel
            </button>
          </div>
          <button type="button" className="v-btn v-btn-error" onClick={onCutOff}>
            Cut off
          </button>
        </div>
      </form>
    </div>
  );
}

export function CounterpartiesPage() {
  const book = useBook();
  const now = useClock();
  const alert = useImperativeAlertDialog();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ sell: "", buy: "", cap: "" });
  const [proposal, setProposal] = useState<Proposal>({ isOpen: false, title: "", description: "" });

  function toggle(row: NameRow) {
    if (openId === row.id) {
      setOpenId(null);
      return;
    }
    setDraft(draftFrom(book.data?.terms ?? null));
    setOpenId(row.id);
  }

  function saveTerms(row: NameRow) {
    setProposal({
      isOpen: true,
      title: "Edit terms",
      description: `New terms for ${row.name}: sell ${draft.sell.trim()} bp · buy ${draft.buy.trim()} bp · cap ${draft.cap.trim()} WETH. The Safe writes them to its desk.terms record.`,
    });
  }

  function cutOff(row: NameRow) {
    const label = row.name.split(".")[0];
    alert.show({
      title: `Cut off ${row.name}?`,
      description: `The Safe clears this name's desk.terms. Once 2 of 3 owners sign in ${SAFE_WALLET}, fills from ${label} fail the gate. Other names keep trading.`,
      actionLabel: `Cut off ${label}`,
      onAction: () => {
        alert.hide();
        setProposal({ isOpen: true, title: "Cut off", description: `The Safe transaction clears desk.terms on ${row.name}.` });
      },
    });
  }

  if (!book.data) {
    return (
      <Page>
        <Header
          title="Counterparties"
          description={
            book.isLoading ? "Reading the client names…" : "The client names could not be read. Check the Sepolia RPC in web/.env and reload."
          }
        />
      </Page>
    );
  }

  const b = book.data;
  const rows = toRows(b, now);
  const liveCount = rows.filter((row) => row.status === "Live").length;
  const width = widthNow(b);

  return (
    <Page>
      <Header title="Counterparties" description={`Names under ${CLIENT_SUFFIX} that can fill against the desk.`} />

      <Card flush>
        <Metrics>
          <Metric label="Can trade" value={`${liveCount} of ${rows.length}`} hint="Names that pass the gate now." />
          {b.terms ? (
            <>
              <Metric label="Sell width limit" value={`${b.terms.sellBps} bp`} />
              <Metric label="Buy width limit" value={`${b.terms.buyBps} bp`} />
              <Metric label="Cap per fill" value={formatWeth(b.terms.cap)} />
            </>
          ) : (
            <Metric label="Terms" value="None" hint="The client names disagree or are missing." />
          )}
        </Metrics>
      </Card>

      <Card title="Client names" flush footer={<span>Adding a counterparty is an ENS change made by the Safe.</span>}>
        {rows.length === 0 ? (
          <Empty title="No counterparties yet" description={`The Safe adds a name under ${CLIENT_SUFFIX} with an address, terms and an expiry.`} />
        ) : (
          <div className="v-table-wrap">
            <table className="v-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Width now</th>
                  <th>Address</th>
                  <th className="v-right">
                    <span className="v-sr">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isOpen = openId === row.id;
                  const panelId = `terms-${row.id.replace(/\./g, "-")}`;
                  return (
                    <Fragment key={row.id}>
                      <tr>
                        <td>{row.name}</td>
                        <td>
                          <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
                        </td>
                        <td>
                          <Expiry seconds={row.expiry} />
                        </td>
                        <td>
                          {row.status === "Live" && width ? (
                            <>
                              {width.widths}
                              <span className="v-muted">{` · ${width.source}`}</span>
                            </>
                          ) : (
                            <span className="v-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className="v-mono">{formatAddr(row.addr)}</span>
                        </td>
                        <td className="v-right">
                          <button
                            type="button"
                            className="v-btn v-btn-secondary"
                            aria-label={`${isOpen ? "Close" : "Edit"} ${row.name}`}
                            aria-expanded={isOpen}
                            aria-controls={isOpen ? panelId : undefined}
                            onClick={() => toggle(row)}
                          >
                            {isOpen ? "Close" : "Edit"}
                          </button>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr id={panelId}>
                          <td colSpan={COLUMNS}>
                            <TermsEditor
                              row={row}
                              draft={draft}
                              onDraft={setDraft}
                              onSave={() => saveTerms(row)}
                              onCancel={() => setOpenId(null)}
                              onCutOff={() => cutOff(row)}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="How the gate checks a name">
        <div className="v-stack v-stack-8">
          <Status>The name&apos;s address must match the wallet that signs the fill.</Status>
          <Status>The name must not be expired.</Status>
          <Status>
            <span>
              {"The name's resolver must be the desk's resolver, "}
              <span className="v-mono">{formatAddr(sepoliaConfig.ens.resolver)}</span>.
            </span>
          </Status>
        </div>
      </Card>

      <SafeDialog
        isOpen={proposal.isOpen}
        onOpenChange={(isOpen) => setProposal((prev) => ({ ...prev, isOpen }))}
        title={proposal.title}
        description={proposal.description}
      />
      {alert.element}
    </Page>
  );
}
