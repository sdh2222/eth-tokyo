import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import sepoliaConfig from "@config";
import { formatBpsShare, formatWadUsd } from "../desk/book";
import { FIXTURE_OWNERS } from "../desk/fixture/state";
import { useBook } from "../hooks/useBook";
import { useCanAct } from "../hooks/useCanAct";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatAddr, formatWeth } from "../lib/format";
import { InventoryCells } from "../ui/cells";
import { Card, Dl, Empty, Header, Note, Page, Picture, Status } from "../ui/v";
import { SafeDialog } from "./open/SafeDialog";

// Open a desk (IA: the six-step wizard). Vercel-style: the steps card 3 columns, the step card 9
// with the step's question as its title, its fields in the body, and Back and Continue in the
// card foot (SC-18). ?step=N deep-links to a step (1-based).

const STEPS = [
  { label: "Safe", question: "Which Safe signs and holds the tokens?" },
  { label: "Market", question: "Which market does the program fix?" },
  { label: "Inventory and target", question: "How much of the Safe backs the desk?" },
  { label: "Counterparties", question: "Who may trade with the desk?" },
  { label: "Agent policy", question: "What policy does the agent read?" },
  { label: "Review", question: "Is this the proposal to sign?" },
];

const TARGET_BPS = sepoliaConfig.desk.wStarBps;
const WINDOW_BLOCKS = sepoliaConfig.desk.maxBlocks;
const TTL_DAYS = sepoliaConfig.desk.strategyTtlDays;
const liveMode = import.meta.env.VITE_DESK_MODE === "live";
// Fixture mode has no Safe balances until a desk is open; these match the fixture Safe.
const FIXTURE_SAFE = { weth: 900, usdc: 400_000 };

// The policy template main ships (ts/src/scripts/demo.ts, PR #34). The keeper parses its
// inventory and suspicion sentences; POLICY_RULES says the same in English.
const POLICY_TEMPLATE =
  "이미 장부에 있는 상대는 게시된 약정보다 좁은 폭을 받을 수 있다. 크고 처음인 거래는 매도 3 bp, 매수 10 bp에 머문다. 그 약정 밖으로는 호가하지 않는다. 오라클 중간가는 움직이지 않는다. ETH 비중이 70%보다 높으면 에이전트는 고른 매도 폭에서 1 bp를 빼고 매수 폭에 1 bp를 더한다. 70%보다 낮으면 매도 폭에 1 bp를 더하고 매수 폭에서 1 bp를 뺀다. 매도 폭은 1 bp 아래로 내려가지 않고, 둘 다 그 이름의 약정 안에 둔다. 체결 뒤에 오라클이 그 이름에 유리하게 1 bp 이상 움직이거나, 같은 이름이 50블록 안에 다시 오거나, 이번 크기가 직전보다 크면 의심해서 고른 폭을 1 bp 깎는다.";

const POLICY_RULES: [string, string][] = [
  ["Above 70% ETH", "Sell −1 bp, buy +1 bp"],
  ["Below 70% ETH", "Sell +1 bp, buy −1 bp"],
  ["Floor", "Sell never below 1 bp; both widths stay inside that name's terms"],
  [
    "Suspicion",
    "+1 bp on both widths when, after a fill, the oracle moved 1 bp or more in the taker's favour, the same name is back within 50 blocks, or the size is larger than last time",
  ],
];

// The raw values the program is built from, one per line, labels padded for the mono face.
const RAW_LINES: [string, string][] = [
  ["SAFE", sepoliaConfig.safe],
  ["ORACLE", sepoliaConfig.oracle],
  ["WETH", sepoliaConfig.tokens.weth],
  ["USDC", sepoliaConfig.tokens.usdc],
  ["W_STAR_BPS", String(TARGET_BPS)],
  ["MAX_BLOCKS", String(WINDOW_BLOCKS)],
  ["TTL_DAYS", String(TTL_DAYS)],
  ["NAMES", `*.${sepoliaConfig.ens.suffix}`],
];

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
    <span className="v-error" role="alert">
      {message}
    </span>
  );
}

// A labelled block inside the Review step.
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="v-stack v-stack-8">
      <h3 className="v-card-title">{title}</h3>
      {children}
    </section>
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
  // The live desk's policy when it has one, else the template main ships.
  const policy = policyDraft ?? (liveMode && b?.policy ? b.policy : POLICY_TEMPLATE);
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

  // Validation is one derivation from the field values: Continue, the steps card's Fix mark
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
  const current = STEPS[step] ?? { label: "", question: "" };

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
  const programLines = [
    `Open for ${TTL_DAYS} days after it ships`,
    `Only names under ${sepoliaConfig.ens.suffix} may trade`,
    "Price: the WETH / USDC oracle mid, with the taker's own desk.spread widths, else its desk.terms widths",
    `The desk stops selling ETH at or below a ${TARGET_BPS / 100}% ETH share`,
    `A fill is allowed for 10 minutes (${WINDOW_BLOCKS} blocks) after each oracle update`,
  ];
  const namesTable = step === 3 && names.length > 0;

  return (
    <Page>
      <Header title="Open a desk" description="One Safe transaction ships the desk. Nothing leaves the Safe until a fill." />

      {deskIsOpen && !params.get("step") ? (
        <Note
          tone="amber"
          action={
            <Link className="v-btn v-btn-secondary" to="/controls">
              Go to Controls
            </Link>
          }
        >
          A desk is already open. Proposing here docks it and ships the new program in one Safe transaction.
        </Note>
      ) : null}

      <div className="v-grid">
        <Card className="v-col-3" title="Steps">
          <nav aria-label="Open a desk progress">
            <ol className="v-stack v-stack-8">
              {STEPS.map((s, i) => {
                const hasError = Object.keys(shownErrors(i)).length > 0;
                return (
                  <li key={s.label} className="v-row v-row-8 v-between">
                    {i === step ? (
                      <strong aria-current="step">{`${i + 1}. ${s.label}`}</strong>
                    ) : (
                      <button type="button" className="v-link" onClick={() => goTo(i)}>
                        {`${i + 1}. ${s.label}`}
                      </button>
                    )}
                    {hasError ? (
                      <Status tone="red">Fix</Status>
                    ) : i < step ? (
                      <Status tone="green">Done</Status>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </nav>
        </Card>

        <Card
          className="v-col-9"
          title={current.question}
          flush={namesTable}
          footer={
            <>
              <button
                type="button"
                className="v-btn v-btn-secondary"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </button>
              <button type="button" className="v-btn" onClick={goNext}>
                {isLastStep ? "Propose to Safe" : "Continue"}
              </button>
            </>
          }
        >
          {step === 0 && (
            <div className="v-stack v-stack-24">
              <Picture name="lighthouse" height={200} />
              <Dl
                items={[
                  ["Desk name", b?.name ?? "—"],
                  ["Threshold", "2 of 3 owners sign"],
                  ["Your wallet", isOwner ? "A Safe owner" : "Not a Safe owner: you can review, an owner proposes"],
                ]}
              />
              <div className="v-code">
                <div>{`SAFE\u00a0\u00a0\u00a0 ${sepoliaConfig.safe}`}</div>
                {FIXTURE_OWNERS.map((owner, i) => (
                  <div key={owner}>{`OWNER ${i + 1} ${owner}`}</div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="v-stack v-stack-24">
              <Dl
                items={[
                  ["Pair", "WETH / USDC"],
                  [
                    "Oracle",
                    <a
                      key="oracle"
                      className="v-mono"
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
              <div className="v-muted">The program fixes these. Changing them means reopening the desk.</div>
            </div>
          )}

          {step === 2 && (
            <div className="v-stack v-stack-24">
              <div className="v-grid">
                <label className="v-field v-col-6">
                  <span>WETH</span>
                  <input
                    className="v-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={wethText}
                    onChange={(e) => setWethText(e.target.value)}
                    aria-invalid={currentErrors.weth ? true : undefined}
                  />
                  {safeWeth !== null && !currentErrors.weth ? (
                    <span className="v-muted">{`The Safe holds ${safeWeth.toLocaleString("en-US")} WETH.`}</span>
                  ) : null}
                  <FieldError message={currentErrors.weth} />
                </label>
                <label className="v-field v-col-6">
                  <span>USDC</span>
                  <input
                    className="v-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={usdcText}
                    onChange={(e) => setUsdcText(e.target.value)}
                    aria-invalid={currentErrors.usdc ? true : undefined}
                  />
                  {safeUsdc !== null && !currentErrors.usdc ? (
                    <span className="v-muted">{`The Safe holds ${safeUsdc.toLocaleString("en-US")} USDC.`}</span>
                  ) : null}
                  <FieldError message={currentErrors.usdc} />
                </label>
              </div>
              {ethShare !== null ? (
                <InventoryCells shareBps={Math.round(ethShare * 10_000)} stopBps={TARGET_BPS} />
              ) : null}
              <Dl
                items={[
                  ["ETH share at the oracle mid", ethShare !== null ? formatBpsShare(Math.round(ethShare * 10_000)) : "—"],
                  ["Stops selling ETH at", `${formatBpsShare(TARGET_BPS)} · the program fixes it`],
                ]}
              />
            </div>
          )}

          {step === 3 &&
            (namesTable ? (
              <>
                <div className="v-card-body">
                  <div className="v-muted">Adding or removing a name takes one Safe signature later. The desk stays open.</div>
                </div>
                <div className="v-table-wrap">
                  <table className="v-table">
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
                          <td className="v-mono">{formatAddr(row.addr)}</td>
                          <td>{formatDate(row.expiry)}</td>
                          <td>
                            <Status tone={row.live ? "green" : "red"}>{row.live ? "Can trade" : "Can't trade"}</Status>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <Empty
                title="No client names yet"
                description={`Counterparties trade under ${sepoliaConfig.ens.suffix}. Adding a name takes one Safe signature later.`}
              />
            ))}

          {step === 4 && (
            <div className="v-grid">
              <label className="v-field v-col-6">
                <span>Policy</span>
                <textarea className="v-input" rows={10} value={policy} onChange={(e) => setPolicyDraft(e.target.value)} />
                <span className="v-muted">
                  The Safe writes this to desk.policy on the desk name. The agent reads it; the router does not.
                </span>
              </label>
              <div className="v-col-6 v-stack v-stack-24">
                <Block title="How the agent reads this policy">
                  <Dl items={POLICY_RULES} />
                  <div className="v-muted">
                    After each fill the agent writes that name's desk.spread. A policy without these sentences leaves the tier widths.
                  </div>
                </Block>
                <Block title="Terms fence">
                  <Dl
                    items={[
                      ["Sell width", b?.terms ? `${b.terms.sellBps} bp` : "—"],
                      ["Buy width", b?.terms ? `${b.terms.buyBps} bp` : "—"],
                      ["Cap per fill", b?.terms ? formatWeth(b.terms.cap) : "—"],
                      ["Agent", b?.agent.name ?? "—"],
                    ]}
                  />
                  <div className="v-muted">The agent stays inside this fence. The terms change with one Safe signature.</div>
                </Block>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="v-stack v-stack-24">
              <Block title="What you sign">
                <Dl
                  items={[
                    [
                      "Transaction",
                      deskIsOpen ? "Docks the live desk and ships this program to Aqua" : "Ships this program to Aqua",
                    ],
                    ["Safe", <span key="safe" className="v-mono">{formatAddr(sepoliaConfig.safe)}</span>],
                    ["Desk name", b?.name ?? "—"],
                    ["WETH", `${weth.toLocaleString("en-US")} WETH`],
                    ["USDC", `${usdc.toLocaleString("en-US")} USDC`],
                    ["Counterparties", `${names.length} ENS names`],
                    ["Terms", termsText],
                    ["Agent", b?.agent.name ?? "—"],
                  ]}
                />
              </Block>
              <Block title="The program in plain English">
                <ol className="v-stack v-stack-8">
                  {programLines.map((line, index) => (
                    <li key={line}>
                      <span className="v-muted v-num">{`${index + 1}.`}</span> {line}
                    </li>
                  ))}
                </ol>
                <details className="v-details">
                  <summary>Show raw</summary>
                  <div className="v-code">
                    {RAW_LINES.map(([key, value]) => (
                      <div key={key}>{`${key.padEnd(11, "\u00a0")}${value}`}</div>
                    ))}
                  </div>
                </details>
              </Block>
              <Block title="What does not happen">
                <ul className="v-stack v-stack-8">
                  <li>The agent does not move the oracle mid. It moves the widths inside the terms.</li>
                  <li>The router does not read the policy. Only the agent does.</li>
                  <li>The new program does not run until two of the three owners sign.</li>
                </ul>
              </Block>
            </div>
          )}
        </Card>
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
