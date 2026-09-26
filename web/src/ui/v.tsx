import type { ReactNode } from "react";

// The app kit (styles: v.css), modelled on Vercel's Geist system. Pages are built only from
// these pieces plus plain table markup with the v-table classes.

export type Tone = "gray" | "green" | "amber" | "red" | "blue";

export function Page({ children }: { children: ReactNode }) {
  return <div className="v-page">{children}</div>;
}

export function Header({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="v-header">
      <div className="v-header-text">
        <h1 className="v-title">{title}</h1>
        {description ? <p className="v-desc">{description}</p> : null}
      </div>
      {actions ? <div className="v-actions">{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  actions,
  footer,
  flush,
  className,
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className ? `v-card ${className}` : "v-card"}>
      {title || actions ? (
        <div className="v-card-head">
          {title ? <h2 className="v-card-title">{title}</h2> : <span />}
          {actions ? <div className="v-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={flush ? "v-card-body-flush" : "v-card-body"}>{children}</div>
      {footer ? <div className="v-card-foot">{footer}</div> : null}
    </section>
  );
}

export function Metrics({ children }: { children: ReactNode }) {
  return <div className="v-metrics">{children}</div>;
}

export function Metric({ label, value, hint, large }: { label: ReactNode; value: ReactNode; hint?: ReactNode; large?: boolean }) {
  return (
    <div className="v-metric">
      <span className="v-label">{label}</span>
      <span className={large ? "v-figure-lg" : "v-figure"}>{value}</span>
      {hint ? <span className="v-label">{hint}</span> : null}
    </div>
  );
}

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="v-badge" data-tone={tone}>
      {children}
    </span>
  );
}

export function Status({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="v-status" data-tone={tone}>
      {children}
    </span>
  );
}

export function Note({ tone, children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="v-note" data-tone={tone} role={tone === "red" ? "alert" : undefined}>
      <span>{children}</span>
      {action}
    </div>
  );
}

export function Dl({ items }: { items: readonly (readonly [ReactNode, ReactNode])[] }) {
  return (
    <dl className="v-dl">
      {items.map(([key, value], index) => (
        <DlRow key={index} k={key} v={value} />
      ))}
    </dl>
  );
}

function DlRow({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}

// Dither pictures: Higgsfield images run through web/scripts/landing-dither.mjs (blue
// noise, 2 px dots, #6ec1ea), 960 x 412, shown at their own size and cropped from the bottom.
export type PictureName = "sea" | "pier" | "lighthouse";

export function Picture({ name, height = 240 }: { name: PictureName; height?: number }) {
  return (
    <div className="v-picture" data-height={height} aria-hidden="true">
      <img src={`/app/${name}.png`} alt="" width={960} height={412} />
    </div>
  );
}

// An empty state with a dither picture: the sea for "No desk is open", the pier for
// "No fills yet".
export function Empty({
  title,
  description,
  action,
  picture,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  picture?: boolean | PictureName;
}) {
  return (
    <div className="v-empty">
      {picture ? <Picture name={picture === true ? "sea" : picture} /> : null}
      <p className="v-card-title">{title}</p>
      {description ? <p className="v-muted">{description}</p> : null}
      {action}
    </div>
  );
}
