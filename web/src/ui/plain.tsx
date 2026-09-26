import type { ReactNode } from "react";

// The plain page kit (styles: plain.css). Page bodies are plain HTML on these few pieces;
// Astryx stays for the header, banners, wallet popover and dialogs.

export type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

export function Page({ children }: { children: ReactNode }) {
  return <div className="wk-page">{children}</div>;
}

export function PageHead({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="wk-head">
      <div className="wk-head-text">
        {kicker ? <p className="wk-kicker">{kicker}</p> : null}
        <h1 className="wk-title">{title}</h1>
        {lede ? <p className="wk-lede">{lede}</p> : null}
      </div>
      {actions ? <div className="wk-row wk-row-24">{actions}</div> : null}
    </header>
  );
}

export function Section({
  title,
  aside,
  className,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className ? `wk-section ${className}` : "wk-section"}>
      <div className="wk-section-head">
        <h2 className="wk-section-title">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, note }: { label: ReactNode; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="wk-stat">
      <span className="wk-stat-label">{label}</span>
      <span className="wk-stat-value">{value}</span>
      {note ? <span className="wk-muted">{note}</span> : null}
    </div>
  );
}

export function Window({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children: ReactNode }) {
  return (
    <div className="wk-window">
      <div className="wk-window-bar">
        <span>{title}</span>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div className="wk-window-body">{children}</div>
    </div>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="wk-pill" data-tone={tone}>
      {children}
    </span>
  );
}

export function Facts({ items }: { items: readonly (readonly [ReactNode, ReactNode])[] }) {
  return (
    <dl className="wk-facts">
      {items.map(([label, value], index) => (
        <FactRow key={index} label={label} value={value} />
      ))}
    </dl>
  );
}

function FactRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

export function Bar({ label, value, mark, markLabel }: { label: string; value: number; mark?: number; markLabel?: string }) {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return (
    <div className="wk-stack wk-stack-8">
      <div className="wk-row wk-between">
        <span className="wk-label">{label}</span>
        <span className="wk-stat-value">{`${value.toFixed(1)}%`}</span>
      </div>
      <div className="wk-bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <div className="wk-bar-fill" style={{ width: `${clamp(value)}%` }} />
        {mark !== undefined ? <div className="wk-bar-mark" style={{ left: `${clamp(mark)}%` }} /> : null}
      </div>
      {markLabel ? <span className="wk-muted">{markLabel}</span> : null}
    </div>
  );
}

// An empty state. `picture` adds the dither clouds (SC-13: only "No desk is open" and
// "No fills yet").
export function Empty({ title, action, picture }: { title: ReactNode; action?: ReactNode; picture?: boolean }) {
  return (
    <div className="wk-empty">
      {picture ? (
        <div className="wk-empty-picture" aria-hidden="true">
          <img src="/app/empty-clouds.png" alt="" width={1280} height={550} />
        </div>
      ) : null}
      <p>{title}</p>
      {action}
    </div>
  );
}

// A dot and a word, for anything that is not a status (checks, notes).
export function Dot({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="wk-dot" data-tone={tone}>
      {children}
    </span>
  );
}

export function Callout({ tone = "neutral", children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="wk-callout" data-tone={tone} role={tone === "danger" ? "alert" : undefined}>
      <div className="wk-row wk-row-8">
        <span className="wk-dot" data-tone={tone} aria-hidden="true" />
        <div className="wk-stack wk-stack-4">{children}</div>
      </div>
      {action}
    </div>
  );
}
