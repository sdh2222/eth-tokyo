import { Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CHECK_SETTING, KAPPA_HELP, RANGE_HELP, TARGET_HELP, TARGET_LABEL } from "../../copy/en";
import { useDeskPort } from "../../hooks/useDesk";
import { formatBpsPct, formatPrice, formatVsMidBps } from "../../lib/format";
import type { WizardState } from "./types";

const MID = 4000000000000000000000n;

export function policyInvalid(wizard: WizardState): boolean {
  return wizard.sMin > wizard.sMax || wizard.sMax >= 10000 || wizard.sMin < 0 || wizard.targetPct < 50 || wizard.targetPct > 90;
}

export function PolicyStep({ wizard, onChange }: { wizard: WizardState; onChange: (next: WizardState) => void }) {
  const port = useDeskPort();
  const points = port.previewCurve(wizard.kappa);
  const share = 90;
  const nearest = points.reduce((best, point) =>
    Math.abs(point.sharePct - share) < Math.abs(best.sharePct - share) ? point : best,
  );
  const under = nearest ? -formatVsMidBps(nearest.askWad, MID) : 0n;
  const bad = policyInvalid(wizard);
  const chart = points.map((point) => ({
    share: point.sharePct,
    ask: Number(point.askWad / 10n ** 16n) / 100,
    bid: Number(point.bidWad / 10n ** 16n) / 100,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className="text-body">
          {TARGET_LABEL}
          <input
            type="range"
            min={50}
            max={90}
            step={5}
            value={wizard.targetPct}
            onChange={(event) => onChange({ ...wizard, targetPct: Number(event.target.value) })}
          />
          <span>{wizard.targetPct}%</span>
        </label>
        <p className="text-small text-muted">{TARGET_HELP}</p>
        <div className="flex gap-2">
          {([
            [100, "1%"],
            [200, "2%"],
            [400, "4%"],
          ] as const).map(([kappa, label]) => (
            <button key={kappa} type="button" aria-pressed={wizard.kappa === kappa} className="text-body" onClick={() => onChange({ ...wizard, kappa })}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-small text-muted">{KAPPA_HELP}</p>
        <label className={bad && wizard.sMin > wizard.sMax ? "text-danger" : "text-body"}>
          sMin
          <input
            className="ml-2 rounded-control border border-border px-3 py-2"
            value={String(wizard.sMin)}
            onChange={(event) => onChange({ ...wizard, sMin: digits(event.target.value) })}
          />
          <span className="text-muted"> {formatBpsPct(wizard.sMin)}</span>
        </label>
        <label className={bad ? "text-danger" : "text-body"}>
          sMax
          <input
            className="ml-2 rounded-control border border-border px-3 py-2"
            value={String(wizard.sMax)}
            onChange={(event) => onChange({ ...wizard, sMax: digits(event.target.value) })}
          />
          <span className="text-muted"> {formatBpsPct(wizard.sMax)}</span>
        </label>
        <p className="text-small text-muted">{RANGE_HELP}</p>
        <div className="flex gap-2">
          {([
            [900, "15 min"],
            [3600, "60 min"],
            [10800, "3 h"],
          ] as const).map(([sec, label]) => (
            <button key={sec} type="button" aria-pressed={wizard.maxAgeSec === sec} className="text-body" onClick={() => onChange({ ...wizard, maxAgeSec: sec })}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-body">Desk open for</p>
        <div className="flex gap-2">
          {([
            [7, "7 days"],
            [30, "30 days"],
            [90, "90 days"],
          ] as const).map(([days, label]) => (
            <button key={days} type="button" aria-pressed={wizard.ttlDays === days} className="text-body" onClick={() => onChange({ ...wizard, ttlDays: days })}>
              {label}
            </button>
          ))}
        </div>
        {bad ? <p className="text-body">{CHECK_SETTING}</p> : null}
      </div>
      <div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chart}>
            <XAxis dataKey="share" />
            <YAxis />
            <Line dataKey="ask" stroke="var(--ask)" dot={false} />
            <Line dataKey="bid" stroke="var(--bid)" dot={false} />
            <ReferenceLine x={wizard.targetPct} stroke="var(--text)" strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-body">
          Right now mm-a would buy 1 ETH at {formatPrice(nearest.askWad)} USDC ({under.toString()} bps under mid).
        </p>
      </div>
    </div>
  );
}

function digits(text: string): number {
  let value = 0;
  for (const char of text.replace(/\D/g, "")) value = value * 10 + (char.charCodeAt(0) - 48);
  return value;
}
