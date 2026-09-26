import { useEffect, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { TopNavItem } from "@astryxdesign/core/TopNav";
import type { Role } from "../../app/role";
import { BANNER_NONE, BANNER_STALE, BANNER_STALE_TAIL, CONTROLS, NAV_LABEL } from "../../copy/en";
import { FIXTURE_MMS } from "../../desk/fixture/state";

export function DismissibleNotices() {
  return (
    <div className="mul-banners">
      <Banner
        status="warning"
        container="section"
        isDismissable
        title={`${BANNER_STALE} 60 ${BANNER_STALE_TAIL}`}
        endContent={<Button label={CONTROLS} variant="ghost" />}
      />
      <Banner
        status="info"
        container="section"
        isDismissable
        title={BANNER_NONE}
        endContent={<Button label={NAV_LABEL.open} variant="ghost" />}
      />
    </div>
  );
}

export const OPEN = "Open a desk";

const INTRO = "A desk is where this treasury quotes its own price.";

const INTRO_BLOCKS = [
  {
    label: "Price",
    value:
      "The price has two sides, and it is computed on-chain. Named counterparties trade against it. Anyone else can look, and the desk will not trade with them.",
  },
  {
    label: "Tokens",
    value:
      "Tokens stay in the Safe. Opening a desk does not move them. They move only when a named counterparty fills, and only for that fill.",
  },
  {
    label: "Six steps",
    value:
      "You confirm this wallet owns the Safe, choose how long the desk stays open, and set how much it may use. You read the names already on the book and write the policy in one sentence. Two owners sign once.",
  },
  {
    label: "Already set",
    value:
      "The pair is WETH and USDC. The oracle and the ten-minute window stay fixed. The 70% stop is shown beside the amounts. Terms live with each counterparty, and the agent sets the widths inside them.",
  },
] as const;

const OPEN_STEPS = [
  { label: "Verify Treasury Ownership", image: "/desk/step-1.png", alt: "A safe standing in water." },
  { label: "Set a Market", image: "/desk/step-2.png", alt: "An hourglass standing in water." },
  { label: "Set a Target", image: "/desk/step-3.png", alt: "A balance scale standing in water." },
  { label: "Read counterparties", image: "/desk/step-4.png", alt: "An open ledger on a desk in water." },
  { label: "Set the policy", image: "/desk/step-5.png", alt: "A pen on a blank sheet in water." },
  { label: "Review", image: "/desk/step-6.png", alt: "A sealed folder on a desk in water." },
] as const;

const SAFE_WETH = 900;
const SAFE_USDC = 400000;
const WALLET_SHORT = "0xA11c…e3F2";

function amount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export type OpenFocus = number | null;

export function OpenStepNav({
  focus,
  ahead,
  onPick,
}: {
  focus: OpenFocus;
  ahead: number;
  onPick: (next: OpenFocus) => void;
}) {
  return (
    <nav className="mul-pages desk-line" aria-label="Open a desk">
      <TopNavItem label="What's a desk?" isSelected={focus === null} onClick={() => onPick(null)} />
      {OPEN_STEPS.map((item, index) => {
        const locked = index > ahead;
        return (
          <TopNavItem
            key={item.label}
            label={`${index + 1}. ${item.label}`}
            isSelected={focus === index}
            isDisabled={locked}
            onClick={() => {
              if (locked) return;
              onPick(index);
            }}
          />
        );
      })}
    </nav>
  );
}

function Blocks({ rows }: { rows: readonly { label: string; value: string }[] }) {
  return (
    <div className="desk-blocks">
      {rows.map((row) => (
        <section key={`${row.label}:${row.value}`}>
          <h3>{row.label}</h3>
          <p>{row.value}</p>
        </section>
      ))}
    </div>
  );
}

function Move({
  focus,
  onFocus,
  canContinue,
  onContinue,
  onPropose,
}: {
  focus: OpenFocus;
  onFocus: (next: OpenFocus) => void;
  canContinue: boolean;
  onContinue: () => void;
  onPropose?: () => void;
}) {
  const last = focus === OPEN_STEPS.length - 1;
  return (
    <div className="desk-move">
      {focus !== null ? (
        <button type="button" className="desk-back" onClick={() => onFocus(focus === 0 ? null : focus - 1)}>
          Back
        </button>
      ) : null}
      <button
        type="button"
        className="desk-next"
        disabled={!canContinue}
        onClick={() => (last ? onPropose?.() : onContinue())}
      >
        {last ? "Propose to Safe" : "Continue"}
      </button>
    </div>
  );
}

export function ShellPages({
  role,
  page,
  focus = null,
  onFocus,
  onAhead,
}: {
  role: Role;
  page: string;
  focus?: OpenFocus;
  onFocus: (next: OpenFocus) => void;
  onAhead: (ahead: number) => void;
}) {
  void role;
  const [days, setDays] = useState("30");
  const [weth, setWeth] = useState("");
  const [usdc, setUsdc] = useState("");
  const [policy, setPolicy] = useState("");
  const [proposed, setProposed] = useState(false);
  const [passed, setPassed] = useState(-1);
  const dayCount = amount(days);
  const wethCount = amount(weth);
  const usdcCount = amount(usdc);
  const wethOver = wethCount !== null && wethCount > SAFE_WETH;
  const usdcOver = usdcCount !== null && usdcCount > SAFE_USDC;
  const marketOk = dayCount !== null && dayCount > 0;
  const targetOk = wethCount !== null && usdcCount !== null && !wethOver && !usdcOver;
  const policyOk = policy.trim() !== "";
  let ahead = passed;
  if (!marketOk) ahead = Math.min(ahead, 1);
  if (!targetOk) ahead = Math.min(ahead, 2);
  if (!policyOk) ahead = Math.min(ahead, 4);
  useEffect(() => {
    onAhead(ahead);
  }, [ahead, onAhead]);
  useEffect(() => {
    if (focus !== null && focus > ahead) onFocus(ahead < 0 ? null : ahead);
  }, [ahead, focus, onFocus]);
  if (page !== OPEN) return null;
  const step = focus === null ? undefined : OPEN_STEPS[focus];
  const canContinue =
    focus === null ||
    focus === 0 ||
    focus === 3 ||
    (focus === 1 && marketOk) ||
    (focus === 2 && targetOk) ||
    (focus === 4 && policyOk) ||
    (focus === 5 && marketOk && targetOk && policyOk);

  const picture = step ?? { image: "/desk/whats-a-desk.png", alt: "A desk standing in water." };
  const title = step?.label ?? "What's a desk?";
  const count = focus === null ? "0 of 6" : `${focus + 1} of 6`;
  const lead =
    focus === null
      ? INTRO
      : focus === 0
        ? "Confirm this wallet owns the treasury Safe. Two of three owners must sign, and none have signed yet."
        : focus === 1
          ? "The pair, the oracle, and the 10-minute window stay as they are. Choose how long the desk stays open."
          : focus === 2
            ? "Set how much the desk may use. The 70% stop is shown, and the amount cannot pass the Safe."
            : focus === 3
              ? "These names are already on the book. You don't add a name here."
              : focus === 4
                ? "Write the policy in one sentence. The agent sets the widths inside the terms."
                : "Read what the two owners will sign. Tokens stay in the Safe.";

  return (
    <div className="mul-page">
      <div className="desk-frame">
        <div className="desk-side">
          <p className="desk-progress">{count}</p>
          <h2 className="desk-title">{title}</h2>
          <p className="desk-lead">{lead}</p>
          <div className="desk-body">
            {focus === null ? <Blocks rows={INTRO_BLOCKS} /> : null}
            {focus === 0 ? (
              <>
                <ul className="desk-agree">
                  <li>
                    <span>
                      {WALLET_SHORT}
                      <small>This wallet</small>
                    </span>
                  <span className="desk-status">Not signed</span>
                </li>
                <li>
                  <span>Second owner</span>
                  <span className="desk-status">Not signed</span>
                </li>
                <li>
                  <span>Third owner</span>
                  <span className="desk-status">Not signed</span>
                </li>
                </ul>
                <p className="desk-note">0 signed. 2 of 3 required. The Safe holds 900 WETH and 400,000 USDC.</p>
              </>
            ) : null}
            {focus === 1 ? (
              <>
                <Blocks
                  rows={[
                    { label: "Pair", value: "WETH / USDC" },
                    { label: "Oracle", value: "Already set" },
                    { label: "Window", value: "10 minutes" },
                  ]}
                />
                <label className="desk-field">
                  How long the desk stays open
                  <input value={days} inputMode="numeric" onChange={(event) => setDays(event.target.value)} />
                  <span>days</span>
                </label>
              </>
            ) : null}
            {focus === 2 ? (
              <>
                <label className="desk-field">
                  WETH the desk may use
                  <input value={weth} inputMode="decimal" onChange={(event) => setWeth(event.target.value)} />
                  <span>Safe holds 900</span>
                </label>
                <label className="desk-field">
                  USDC the desk may use
                  <input value={usdc} inputMode="decimal" onChange={(event) => setUsdc(event.target.value)} />
                  <span>Safe holds 400,000</span>
                </label>
                {wethOver || usdcOver ? <p className="desk-note">This is more than the Safe holds.</p> : null}
              </>
            ) : null}
            {focus === 3 ? (
              <Blocks
                rows={[
                  ...FIXTURE_MMS.map((mm) => ({ label: "Name", value: mm.name })),
                  { label: "Terms", value: "Already on each name. Nothing to add here." },
                ]}
              />
            ) : null}
            {focus === 4 ? (
              <label className="desk-field">
                The policy, in one sentence
                <textarea value={policy} rows={4} onChange={(event) => setPolicy(event.target.value)} />
              </label>
            ) : null}
            {focus === 5 ? (
              <>
                <Blocks
                  rows={[
                    { label: "Owners", value: "Two of three sign once" },
                    { label: "Open for", value: marketOk ? `${dayCount} days` : "Not set" },
                    { label: "WETH", value: wethCount === null ? "Not set" : String(wethCount) },
                    { label: "USDC", value: usdcCount === null ? "Not set" : String(usdcCount) },
                    { label: "Stop", value: "70%, shown" },
                    { label: "Policy", value: policy.trim() === "" ? "Not set" : policy.trim() },
                    { label: "Tokens", value: "Stay in the Safe until a fill" },
                  ]}
                />
                {proposed ? <p className="desk-note">Waiting on the second owner. Tokens stay in the Safe.</p> : null}
              </>
            ) : null}
          </div>
          <Move
            focus={focus}
            onFocus={onFocus}
            canContinue={canContinue}
            onContinue={() => {
              const next = focus === null ? 0 : focus + 1;
              setPassed((current) => Math.max(current, next));
              onFocus(next);
            }}
            onPropose={() => setProposed(true)}
          />
        </div>
        <div className="desk-stage">
          <img className="desk-picture" src={picture.image} alt={picture.alt} />
        </div>
      </div>
    </div>
  );
}
