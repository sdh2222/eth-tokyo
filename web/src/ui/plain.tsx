import type { ReactNode } from "react";

// The plain page kit (styles: plain.css). Page bodies are plain HTML on these few pieces;
// Astryx stays for the header, banners, wallet popover and dialogs.

export type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

export function Page({ children }: { children: ReactNode }) {
  return <div className="wm-page">{children}</div>;
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
    <header className="wm-head">
      <div className="wm-head-text">
        {kicker ? <p className="wm-kicker">{kicker}</p> : null}
        <h1 className="wm-title">{title}</h1>
        {lede ? <p className="wm-lede">{lede}</p> : null}
      </div>
      {actions ? <div className="wm-row wm-row-24">{actions}</div> : null}
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
    <section className={className ? `wm-section ${className}` : "wm-section"}>
      <div className="wm-section-head">
        <h2 className="wm-section-title">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, note }: { label: ReactNode; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="wm-stat">
      <span className="wm-muted">{label}</span>
      <span className="wm-stat-value">{value}</span>
      {note ? <span className="wm-muted">{note}</span> : null}
    </div>
  );
}

export function Window({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children: ReactNode }) {
  return (
    <div className="wm-window">
      <div className="wm-window-bar">
        <span>{title}</span>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div className="wm-window-body">{children}</div>
    </div>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="wm-pill" data-tone={tone}>
      {children}
    </span>
  );
}

export function Facts({ items }: { items: readonly (readonly [ReactNode, ReactNode])[] }) {
  return (
    <dl className="wm-facts">
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
    <div className="wm-stack wm-stack-8">
      <div className="wm-row wm-between">
        <span>{label}</span>
        <span className="wm-num">{`${value.toFixed(1)}%`}</span>
      </div>
      <div className="wm-bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <div className="wm-bar-fill" style={{ width: `${clamp(value)}%` }} />
        {mark !== undefined ? <div className="wm-bar-mark" style={{ left: `${clamp(mark)}%` }} /> : null}
      </div>
      {markLabel ? <span className="wm-muted">{markLabel}</span> : null}
    </div>
  );
}

export function Empty({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="wm-empty">
      <p>{title}</p>
      {action}
    </div>
  );
}

export function Callout({ tone = "neutral", children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="wm-callout" data-tone={tone} role={tone === "danger" ? "alert" : undefined}>
      <div className="wm-stack wm-stack-4">{children}</div>
      {action}
    </div>
  );
}
