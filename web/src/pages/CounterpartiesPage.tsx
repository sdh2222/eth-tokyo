import { Fragment, useState, type FormEvent } from "react";
import sepoliaConfig from "@config";
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import { formatUnits } from "viem";
import type { DeskBook } from "../desk/book";
import { CLIENT_SUFFIX } from "../ens/names";
import { useBook } from "../hooks/useBook";
import { useClock } from "../hooks/useClock";
import { formatAddr, formatWeth } from "../lib/format";
import { Empty, Facts, Page, PageHead, Pill, Section, Stat, Window } from "../ui/plain";
import { SafeDialog } from "./open/SafeDialog";

// Counterparties (IA: "Who can trade with my desk, and on what terms?"). Plain page kit.
// Screens SC-20: one 12-column table. SC-10: the edit fields expand in the row, and saving
// opens the Safe signing overlay (O1). Cut off shows one confirm sentence first (SC-05).

const SAFE_WALLET = "Safe{Wallet}";
const COLUMNS = 3;

type NameStatus = "Live" | "Expired" | "Can't trade";

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

function nowNote(book: DeskBook, side: "sellBps" | "buyBps"): string {
  if (book.spread?.live) return `Now ${book.spread[side]} bp · agent spread`;
  return "Now the terms width";
}

function toRows(book: DeskBook, now: number): NameRow[] {
  const terms = termsText(book.terms);
  return book.names.map((entry) => {
    const expiry = Number(entry.expiry);
    const expired = expiry > 0 && expiry <= now;
    const status: NameStatus = expired ? "Expired" : entry.live ? "Live" : "Can't trade";
    let reason = "Its address is the wallet, it has terms, and it has not expired.";
    if (status === "Expired") reason = "The name has expired. The Safe renews it before it can trade again.";
    else if (status === "Can't trade" && !book.terms) reason = "The client names do not store the same valid desk.terms.";
    else if (status === "Can't trade") reason = "Its address or resolver does not pass the gate.";
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

// A break chance before each dot, so a long ENS name wraps at its labels on a phone.
function NameText({ name }: { name: string }) {
  return (
    <>
      {name.split(".").map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? <wbr /> : null}
          {index > 0 ? `.${part}` : part}
        </Fragment>
      ))}
    </>
  );
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
    <div className="wm-grid">
      <div className="wm-span-5 wm-stack">
        <Facts
          items={[
            ["Can trade", row.reason],
            ["Address", <span className="wm-num">{formatAddr(row.addr)}</span>],
            ["Terms now", row.terms],
          ]}
        />
        <details className="wm-raw">
          <summary>Show raw</summary>
          <Window title="ENS records" meta={row.name}>
            <div>{`addr ${row.addr}`}</div>
            <div>{`expiry ${row.expiry > 0 ? String(row.expiry) : "none"}`}</div>
          </Window>
        </details>
      </div>

      <form className="wm-span-7 wm-stack wm-stack-24" onSubmit={submit} aria-label={`Terms for ${row.name}`}>
        <div className="wm-grid">
          <label className="wm-field wm-span-4">
            <span>Sell width (bp)</span>
            <input
              className="wm-input"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={draft.sell}
              onChange={(event) => onDraft({ ...draft, sell: event.target.value })}
            />
          </label>
          <label className="wm-field wm-span-4">
            <span>Buy width (bp)</span>
            <input
              className="wm-input"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={draft.buy}
              onChange={(event) => onDraft({ ...draft, buy: event.target.value })}
            />
          </label>
          <label className="wm-field wm-span-4">
            <span>Cap per fill (WETH)</span>
            <input
              className="wm-input"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={draft.cap}
              onChange={(event) => onDraft({ ...draft, cap: event.target.value })}
            />
          </label>
        </div>
        <p className="wm-muted">{`Saving proposes the new desk.terms to the Safe in ${SAFE_WALLET}.`}</p>
        <div className="wm-row wm-between">
          <div className="wm-row wm-row-24">
            <button type="submit" className="wm-btn" disabled={!isDraftValid(draft)}>
              Save terms
            </button>
            <button type="button" className="wm-link" onClick={onCancel}>
              Cancel
            </button>
          </div>
          <button type="button" className="wm-btn wm-btn-danger" onClick={onCutOff}>
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

  if (book.isLoading) {
    return (
      <Page>
        <PageHead title="Counterparties" lede="Reading the client names…" />
      </Page>
    );
  }
  if (!book.data) {
    return (
      <Page>
        <PageHead title="Counterparties" />
        <Empty title="The client names could not be read. Check the Sepolia RPC in web/.env and reload." />
      </Page>
    );
  }

  const b = book.data;
  const rows = toRows(b, now);
  const liveCount = rows.filter((row) => row.status === "Live").length;

  return (
    <Page>
      <PageHead kicker={b.name} title="Counterparties" lede={`Names under ${CLIENT_SUFFIX} that can fill against the desk.`} />

      <div className="wm-stats">
        <Stat label="Can trade" value={`${liveCount} of ${rows.length}`} note="Names that pass the gate now." />
        {b.terms ? (
          <>
            <Stat label="Sell width limit" value={`${b.terms.sellBps} bp`} note={nowNote(b, "sellBps")} />
            <Stat label="Buy width limit" value={`${b.terms.buyBps} bp`} note={nowNote(b, "buyBps")} />
            <Stat label="Cap per fill" value={formatWeth(b.terms.cap)} />
          </>
        ) : (
          <Stat label="Terms" value="None" note="The client names disagree or are missing." />
        )}
      </div>

      <div className="wm-grid">
        <Section title="Client book" className="wm-span-12">
          {rows.length === 0 ? (
            <Empty title={`No counterparties yet. The Safe adds a name under ${CLIENT_SUFFIX} with an address, terms and an expiry.`} />
          ) : (
            <div className="wm-table-wrap">
              <table className="wm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th className="wm-right" aria-label="Edit" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isOpen = openId === row.id;
                    const panelId = `terms-${row.id.replace(/\./g, "-")}`;
                    return (
                      <Fragment key={row.id}>
                        <tr data-selected={isOpen ? "true" : undefined}>
                          <td>
                            <div className="wm-stack wm-stack-4">
                              <span className="wm-label">
                                <NameText name={row.name} />
                              </span>
                              <span className="wm-muted wm-num">
                                {row.expiry > 0 ? "Expires " : null}
                                <Expiry seconds={row.expiry} />
                              </span>
                            </div>
                          </td>
                          <td>
                            <Pill tone={row.status === "Live" ? "success" : "danger"}>{row.status}</Pill>
                          </td>
                          <td className="wm-right">
                            <button
                              type="button"
                              className="wm-link"
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
          <p className="wm-muted">Adding a counterparty is an ENS change made by the Safe.</p>
          <details className="wm-raw">
            <summary>How the gate checks a name</summary>
            <ul className="wm-list">
              <li>The name&apos;s address must match the wallet that signs the fill.</li>
              <li>The name must not be expired.</li>
              <li>
                <span>
                  {"The name's resolver must be the desk's resolver, "}
                  <span className="wm-num">{formatAddr(sepoliaConfig.ens.resolver)}</span>.
                </span>
              </li>
            </ul>
          </details>
        </Section>
      </div>

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
