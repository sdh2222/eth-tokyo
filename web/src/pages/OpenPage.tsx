import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import sepoliaConfig from "@config";
import { formatBpsShare, formatWadUsd } from "../desk/book";
import { FIXTURE_OWNERS } from "../desk/fixture/state";
import { useBook } from "../hooks/useBook";
import { useCanAct } from "../hooks/useCanAct";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatAddr, formatWeth } from "../lib/format";
import { Callout, Empty, Facts, Page, PageHead, Pill, Section, Window } from "../ui/plain";
import { SafeDialog } from "./open/SafeDialog";

// Open a desk (IA: the six-step wizard). Plain page kit.
// Screens SC-18: the stepper 3 columns, the step 9; on Policy the controls 6 and the preview 6.
// Back and Continue sit at the bottom of the step. ?step=N deep-links to a step (1-based).

const STEPS = [
  { label: "Safe", description: "Check the Safe that signs the program and holds the tokens." },
  { label: "Market", description: "See the pair, oracle and fill window the program fixes." },
  { label: "Inventory and target", description: "Choose how much of the Safe's WETH and USDC backs the desk." },
  { label: "Counterparties", description: "See the ENS names that may trade with the desk." },
  { label: "Agent policy", description: "Write the policy the agent reads when it moves the spread." },
  { label: "Review", description: "Check the proposal before the Safe owners sign it." },
];

const TARGET_BPS = sepoliaConfig.desk.wStarBps;
const WINDOW_BLOCKS = sepoliaConfig.desk.maxBlocks;
const liveMode = import.meta.env.VITE_DESK_MODE === "live";
// Fixture mode has no Safe balances until a desk is open; these match the fixture Safe.
const FIXTURE_SAFE = { weth: 900, usdc: 400_000 };

type NameRow = { id: string; name: string; addr: string; expiry: number; live: boolean };

function startStep(param: string | null): number {
  const n = Number(param ?? "1");
  return Number.isInteger(n) && n >= 1 && n <= STEPS.length ? n - 1 : 0;
}

// An amount field's text: empty or invalid reads as 0, and amounts are never negative.
function amount(text: string): number {
  const n = Number(text);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString("en-US", { dateStyle: "medium" });
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <span className="wm-row wm-row-8" role="alert">
      <Pill tone="danger">Fix</Pill>
      {message}
    </span>
  );
}

export function OpenPage() {
  const [params] = useSearchParams();

  const book = useBook();
  const live = useLiveStrategy();
  const desk = useDeskState(live.data ?? null);
  const { isOwner } = useCanAct();

  const [step, setStep] = useState(() => startStep(params.get("step")));
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(() => new Set());
  const [wethText, setWethText] = useState(String(FIXTURE_SAFE.weth));
  const [usdcText, setUsdcText] = useState(String(FIXTURE_SAFE.usdc));
  const [policyDraft, setPolicyDraft] = useState<string | null>(null);
  const [isSafeOpen, setIsSafeOpen] = useState(false);

  const weth = amount(wethText);
  const usdc = amount(usdcText);
  const b = book.data;
  const policy = policyDraft ?? b?.policy ?? "";
  const safeWeth = desk.data
    ? Number(desk.data.safeWallet.weth / 10n ** 14n) / 10_000
    : liveMode
      ? null
      : FIXTURE_SAFE.weth;
  const safeUsdc = desk.data
    ? Number(desk.data.safeWallet.usdc / 10n ** 4n) / 100
    : liveMode
      ? null
      : FIXTURE_SAFE.usdc;
  const mid = b ? Number(b.oracle.answer) / 1e8 : null;
  const ethShare = mid !== null && weth * mid + usdc > 0 ? (weth * mid) / (weth * mid + usdc) : null;
  const deskIsOpen = Boolean(live.data);

  // Validation is one derivation from the field values: Continue, the stepper's error mark
  // and the field errors all read it.
  const errorsByStep = useMemo<Array<Record<string, string>>>(() => {
    const inventory: Record<string, string> = {};
    if (safeWeth !== null && weth > safeWeth)
      inventory.weth = `The Safe holds ${safeWeth.toLocaleString("en-US")} WETH.`;
    if (safeUsdc !== null && usdc > safeUsdc)
      inventory.usdc = `The Safe holds ${safeUsdc.toLocaleString("en-US")} USDC.`;
    if (weth <= 0 && usdc <= 0) inventory.weth = "Put WETH or USDC behind the desk.";
    return [{}, {}, inventory, {}, {}, {}];
  }, [safeUsdc, safeWeth, usdc, weth]);

  const shownErrors = (index: number): Record<string, string> =>
    attempted.has(index) ? (errorsByStep[index] ?? {}) : {};
  const currentErrors = shownErrors(step);
  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step] ?? { label: "", description: "" };

  const markAttempted = (index: number) => setAttempted((prev) => new Set(prev).add(index));

  const goNext = () => {
    markAttempted(step);
    if (isLastStep) {
      const broken = errorsByStep.findIndex((errors) => Object.keys(errors).length > 0);
      if (broken >= 0) {
        markAttempted(broken);
        setStep(broken);
        return;
      }
      setIsSafeOpen(true);
      return;
    }
    if (Object.keys(errorsByStep[step] ?? {}).length === 0) setStep((s) => s + 1);
  };

  const goTo = (index: number) => {
    if (index > step) markAttempted(step);
    setStep(index);
  };

  const names: NameRow[] = (b?.names ?? []).map((name) => ({
    id: name.name,
    name: name.name,
    addr: name.addr,
    expiry: Number(name.expiry),
    live: name.live,
  }));
  const termsText = b?.terms
    ? `Sell ${b.terms.sellBps} bp · buy ${b.terms.buyBps} bp · cap ${formatWeth(b.terms.cap)} per fill`
    : "No shared terms on the client names";

  return (
    <Page>
      <PageHead title="Open a desk" lede="Six steps, then one proposal the Safe owners sign." />

      {deskIsOpen && !params.get("step") ? (
        <Callout
          tone="accent"
          action={
            <Link className="wm-link" to="/controls">
              Go to Controls
            </Link>
          }
        >
          <strong>A desk is already open</strong>
          <span>Proposing here docks it and ships the new program in one Safe transaction.</span>
        </Callout>
      ) : null}

      <div className="wm-grid">
        <nav className="wm-span-3" aria-label="Open a desk progress">
          <ol className="wm-steps">
            {STEPS.map((s, i) => {
              const hasError = Object.keys(shownErrors(i)).length > 0;
              return (
                <li key={s.label}>
                  <button
                    type="button"
                    aria-current={i === step ? "step" : undefined}
                    data-done={i < step ? "true" : undefined}
                    onClick={() => goTo(i)}
                  >
                    <span className="wm-num">{i + 1}</span>
                    <span>{s.label}</span>
                    {hasError ? <Pill tone="danger">Fix</Pill> : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="wm-span-9 wm-stack wm-stack-24">
          <Section title={`${step + 1}. ${current.label}`}>
            <p className="wm-muted">{current.description}</p>

            {step === 0 && (
              <>
                <Facts
                  items={[
                    ["Desk name", b?.name ?? "—"],
                    ["Threshold", "2 of 3 owners sign"],
                    ["Your wallet", isOwner ? "A Safe owner" : "Not a Safe owner: you can review, an owner proposes"],
                  ]}
                />
                <Window title="Safe" meta="Sepolia">
                  <div className="wm-window-line">
                    <span>SAFE</span>
                    <span>{sepoliaConfig.safe}</span>
                  </div>
                  {FIXTURE_OWNERS.map((owner, i) => (
                    <div className="wm-window-line" key={owner}>
                      <span>{`OWNER ${i + 1}`}</span>
                      <span>{owner}</span>
                    </div>
                  ))}
                </Window>
              </>
            )}

            {step === 1 && (
              <>
                <Facts
                  items={[
                    ["Pair", "WETH / USDC"],
                    [
                      "Oracle",
                      <a
                        key="oracle"
                        href={`${sepoliaConfig.explorer}/address/${sepoliaConfig.oracle}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {formatAddr(sepoliaConfig.oracle)}
                      </a>,
                    ],
                    ["Oracle mid", b ? `$${formatWadUsd(b.oracle.answer * 10n ** 10n)}` : "—"],
                    ["Fill window", `10 minutes after each oracle update (${WINDOW_BLOCKS} blocks)`],
                  ]}
                />
                <p className="wm-note">The program fixes these. Changing them means reopening the desk.</p>
              </>
            )}

            {step === 2 && (
              <>
                <div className="wm-grid">
                  <label className="wm-field wm-span-6">
                    <span>WETH</span>
                    <input
                      className="wm-input"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={wethText}
                      onChange={(e) => setWethText(e.target.value)}
                      aria-invalid={currentErrors.weth ? true : undefined}
                    />
                    {safeWeth !== null ? (
                      <span className="wm-muted">{`The Safe holds ${safeWeth.toLocaleString("en-US")} WETH.`}</span>
                    ) : null}
                    <FieldError message={currentErrors.weth} />
                  </label>
                  <label className="wm-field wm-span-6">
                    <span>USDC</span>
                    <input
                      className="wm-input"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={usdcText}
                      onChange={(e) => setUsdcText(e.target.value)}
                      aria-invalid={currentErrors.usdc ? true : undefined}
                    />
                    {safeUsdc !== null ? (
                      <span className="wm-muted">{`The Safe holds ${safeUsdc.toLocaleString("en-US")} USDC.`}</span>
                    ) : null}
                    <FieldError message={currentErrors.usdc} />
                  </label>
                  <label className="wm-field wm-span-6">
                    <span>ETH target</span>
                    <input className="wm-input" value={`${TARGET_BPS / 100}%`} readOnly />
                    <span className="wm-muted">
                      The desk stops selling ETH at or below this share. The program fixes it.
                    </span>
                  </label>
                </div>
                <p className="wm-note">
                  {ethShare !== null
                    ? `At the oracle mid these amounts are ${formatBpsShare(Math.round(ethShare * 10_000))} ETH. Tokens stay in the Safe until a fill.`
                    : "Tokens stay in the Safe until a fill."}
                </p>
              </>
            )}

            {step === 3 && (
              <>
                {names.length === 0 ? (
                  <Empty title={`No client names yet. Counterparties trade under ${sepoliaConfig.ens.suffix}.`} />
                ) : (
                  <div className="wm-table-wrap">
                    <table className="wm-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Address</th>
                          <th>Expires</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {names.map((row) => (
                          <tr key={row.id}>
                            <td>{row.name}</td>
                            <td className="wm-num">{formatAddr(row.addr)}</td>
                            <td>{formatDate(row.expiry)}</td>
                            <td>
                              <Pill tone={row.live ? "success" : "danger"}>{row.live ? "Can trade" : "Can't trade"}</Pill>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="wm-note">Adding or removing a name takes one Safe signature later. The desk stays open.</p>
              </>
            )}

            {step === 4 && (
              <div className="wm-grid">
                <label className="wm-field wm-span-6">
                  <span>Policy</span>
                  <textarea
                    className="wm-input"
                    rows={5}
                    value={policy}
                    onChange={(e) => setPolicyDraft(e.target.value)}
                  />
                  <span className="wm-muted">
                    The Safe writes this to desk.policy on the desk name. The agent reads it; the router does not.
                  </span>
                </label>
                <div className="wm-span-6 wm-stack">
                  <span className="wm-label">Terms fence</span>
                  <Facts
                    items={[
                      ["Sell width", b?.terms ? `${b.terms.sellBps} bp` : "—"],
                      ["Buy width", b?.terms ? `${b.terms.buyBps} bp` : "—"],
                      ["Cap per fill", b?.terms ? formatWeth(b.terms.cap) : "—"],
                      ["Agent", b?.agent.name ?? "—"],
                    ]}
                  />
                  <p className="wm-note">
                    The agent moves the spread inside this fence. The terms change with one Safe signature.
                  </p>
                </div>
              </div>
            )}

            {step === 5 && (
              <>
                <Facts
                  items={[
                    ["Safe", formatAddr(sepoliaConfig.safe)],
                    ["Desk name", b?.name ?? "—"],
                    ["Pair", "WETH / USDC"],
                    ["Oracle", formatAddr(sepoliaConfig.oracle)],
                    ["Fill window", "10 minutes after each update"],
                    ["ETH target", formatBpsShare(TARGET_BPS)],
                    ["WETH", `${weth.toLocaleString("en-US")} WETH`],
                    ["USDC", `${usdc.toLocaleString("en-US")} USDC`],
                    ["Counterparties", `${names.length} ENS names`],
                    ["Terms", termsText],
                    ["Agent", b?.agent.name ?? "—"],
                    ["Deadline", `${sepoliaConfig.desk.strategyTtlDays} days after shipping`],
                  ]}
                />
                <p className="wm-note">
                  {deskIsOpen
                    ? "One Safe transaction docks the live desk and ships this program to Aqua. Tokens stay in the Safe until a fill."
                    : "One Safe transaction ships this program to Aqua. Tokens stay in the Safe until a fill."}
                </p>
              </>
            )}
          </Section>

          <div className="wm-row wm-between">
            <button
              type="button"
              className="wm-link"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </button>
            <button type="button" className="wm-btn" onClick={goNext}>
              {isLastStep ? "Propose to Safe" : "Continue"}
            </button>
          </div>
        </div>
      </div>

      <SafeDialog
        isOpen={isSafeOpen}
        onOpenChange={setIsSafeOpen}
        title="Propose to Safe"
        description={
          deskIsOpen
            ? "This proposal docks the live desk and ships the new program to Aqua in one Safe transaction. Tokens stay in the Safe until a fill."
            : "This proposal ships the desk program to Aqua. Tokens stay in the Safe until a fill."
        }
      />
    </Page>
  );
}
