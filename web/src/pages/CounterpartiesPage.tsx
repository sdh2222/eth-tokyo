import { Fragment, useState, type FormEvent } from "react";
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import { formatUnits } from "viem";
import { nameQuote, shortName, type DeskBook, type NameQuote } from "../desk/book";
import { CLIENT_SUFFIX } from "../ens/names";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { formatAddr, formatWeth } from "../lib/format";
import { Badge, Card, Empty, Header, Page, type Tone } from "../ui/v";
import { DotSlider } from "../ui/slider";
import { SafeDialog } from "./open/SafeDialog";

// Counterparties (IA: "Who can trade with my desk, and on what terms?"). Main's flow (PR #34):
// each name has its own terms and its own agent spread, and is quoted from that spread while
// it is live, else from its terms. Vercel-style: metrics, then the client names in a flush
// table card. Edit expands the row (SC-10) and saving opens the Safe signing overlay (O1).
// Cut off shows one confirm sentence first (SC-05).

const SAFE_WALLET = "Safe{Wallet}";
const COLUMNS = 6;

type NameStatus = "Live" | "Expired" | "Cut off";

const STATUS_TONE: Record<NameStatus, Tone> = { Live: "green", Expired: "red", "Cut off": "gray" };

type Terms = DeskBook["names"][number]["terms"];
type Spread = DeskBook["names"][number]["spread"];

type NameRow = {
  id: string;
  name: string;
  addr: string;
  expiry: number;
  status: NameStatus;
  terms: Terms;
  spread: Spread;
  quote: NameQuote | null;
  reason: string;
};

type Draft = { sell: string; buy: string; cap: string };
type Proposal = { isOpen: boolean; title: string; description: string };

// Widths as bid / ask around the mid, e.g. "−10 / +3 bp" (the Dashboard's order).
function widths(sellBps: number, buyBps: number): string {
  return `−${buyBps} / +${sellBps} bp`;
}

function toRows(book: DeskBook, now: number): NameRow[] {
  return book.names.map((entry) => {
    const expiry = Number(entry.expiry);
    const expired = expiry > 0 && expiry <= now;
    const status: NameStatus = expired ? "Expired" : entry.live ? "Live" : "Cut off";
    let reason = "Its address is the wallet, it has terms, and it has not expired.";
    if (status === "Expired") reason = "The name has expired. The Safe renews it before it can trade again.";
    else if (status === "Cut off" && !entry.terms) reason = "The name has no valid desk.terms.";
    else if (status === "Cut off") reason = "Its address or resolver does not pass the gate.";
    return {
      id: entry.name,
      name: entry.name,
      addr: entry.addr,
      expiry,
      status,
      terms: entry.terms,
      spread: entry.spread,
      quote: nameQuote(book, entry),
      reason,
    };
  });
}

function draftFrom(terms: Terms): Draft {
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
    <div className="v-stack v-stack-24">
      <p className="v-muted">
        <span className="v-mono">{formatAddr(row.addr)}</span>
        {" · expires "}
        <Expiry seconds={row.expiry} />
        {row.status === "Live" ? "" : ` · ${row.reason}`}
      </p>

      <form className="v-stack" onSubmit={submit} aria-label={`Terms for ${row.name}`}>
        <div className="v-grid">
          <div className="v-col-4">
            <DotSlider
              label="Bid width"
              value={Number(draft.buy) || 0}
              min={1}
              max={25}
              step={1}
              display={`−${Number(draft.buy) || 0} bp`}
              onChange={(next) => onDraft({ ...draft, buy: String(next) })}
            />
          </div>
          <div className="v-col-4">
            <DotSlider
              label="Ask width"
              value={Number(draft.sell) || 0}
              min={1}
              max={25}
              step={1}
              display={`+${Number(draft.sell) || 0} bp`}
              onChange={(next) => onDraft({ ...draft, sell: String(next) })}
            />
          </div>
          <div className="v-col-4">
            <DotSlider
              label="Cap per fill"
              value={Number(draft.cap) || 0}
              min={1}
              max={100}
              step={1}
              display={`${Number(draft.cap) || 0} WETH`}
              onChange={(next) => onDraft({ ...draft, cap: String(next) })}
            />
          </div>
        </div>
        <div className="v-muted">{`Saving proposes the new desk.terms to the Safe in ${SAFE_WALLET}.`}</div>
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
    setDraft(draftFrom(row.terms));
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
    const label = shortName(row.name);
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

  return (
    <Page>
      <Header title="Counterparties" description={`Names under ${CLIENT_SUFFIX} that can fill against the desk.`} />

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
                  <th>Terms</th>
                  <th>Widths now</th>
                  <th>Expires</th>
                  <th className="v-right">
                    <span className="v-sr">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isOpen = openId === row.id;
                  const panelId = `terms-${row.id.replace(/\./g, "-")}`;
                  const q = row.status === "Live" ? row.quote : null;
                  return (
                    <Fragment key={row.id}>
                      <tr>
                        <td>{shortName(row.name)}</td>
                        <td>
                          <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
                        </td>
                        <td>{row.terms ? `${widths(row.terms.sellBps, row.terms.buyBps)} · cap ${formatWeth(row.terms.cap)}` : "—"}</td>
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
                        <td className="v-muted">
                          <Expiry seconds={row.expiry} />
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
                          <td className="v-expand" colSpan={COLUMNS}>
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
