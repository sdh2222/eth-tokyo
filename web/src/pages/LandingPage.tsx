import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LANDING } from "../copy/en";
import { CLIENT_SUFFIX, clientName } from "../ens/names";
import "./landing.css";

// Squares on a time axis. "dump" is the whole amount in the first columns; "fills" is the
// same 36 squares as small fills across the axis.
const COLUMNS = 36;
const ROWS = 8;
const CELL = 10;
const STEP = 14;
const DUMP = [8, 8, 8, 7, 5];
const FILLS = [1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 1, 2];

function Timeline({ kind }: { kind: "dump" | "fills" }) {
  const heightAt = (col: number) => (kind === "dump" ? DUMP[col] : FILLS[col % FILLS.length]) ?? 0;
  const cells = [];
  for (let col = 0; col < COLUMNS; col += 1) {
    const filled = heightAt(col);
    for (let row = 0; row < ROWS; row += 1) {
      const on = row >= ROWS - filled;
      const x = col * STEP;
      const y = row * STEP;
      // The dump lands in one beat, bottom row first. The fills arrive column by column.
      const delay = kind === "dump" ? (ROWS - row) * 24 : col * 70 + (ROWS - row) * 20;
      cells.push(
        on ? (
          <rect
            key={`${col}-${row}`}
            className="wm-cell-on"
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            style={{ transitionDelay: `${delay}ms` }}
          />
        ) : (
          <rect key={`${col}-${row}`} className="wm-cell-off" x={x + 4} y={y + 4} width={2} height={2} />
        ),
      );
    }
  }
  return (
    <svg className={`wm-timeline wm-timeline-${kind}`} viewBox={`0 0 ${COLUMNS * STEP - 4} ${ROWS * STEP - 4}`} aria-hidden="true">
      {cells}
    </svg>
  );
}

// One comparison, row by row: how it sells, signatures, who prices it, and the result.
function CompareTable() {
  const copy = LANDING.compare;
  const { when, signatures, price } = copy.rows;
  return (
    <div className="wm-table" role="table" aria-label={copy.label}>
      <div className="wm-row wm-row-head" role="row">
        <span role="columnheader" />
        <p className="wm-panel-label" role="columnheader">
          {copy.today}
        </p>
        <p className="wm-panel-label" role="columnheader">
          {copy.ours}
        </p>
      </div>
      <div className="wm-row" role="row">
        <p className="wm-row-label" role="rowheader">
          {when.label}
        </p>
        <figure className="wm-figure" role="cell">
          <Timeline kind="dump" />
          <figcaption>{when.today}</figcaption>
        </figure>
        <figure className="wm-figure" role="cell">
          <Timeline kind="fills" />
          <figcaption>{when.ours}</figcaption>
        </figure>
      </div>
      <div className="wm-row" role="row">
        <p className="wm-row-label" role="rowheader">
          {signatures.label}
        </p>
        <p className="wm-value" role="cell">
          {signatures.today}
        </p>
        <p className="wm-value" role="cell">
          {signatures.ours}
        </p>
      </div>
      <div className="wm-row" role="row">
        <p className="wm-row-label" role="rowheader">
          {price.label}
        </p>
        <p className="wm-value" role="cell">
          {price.today}
        </p>
        <p className="wm-value wm-value-ours" role="cell">
          {price.ours}
        </p>
      </div>
    </div>
  );
}

// The hero clouds are baked at three widths (landing-dither.mjs), so the dots stay whole
// and each screen loads the one that is at least as wide as it is. 1920 is the fallback.
const SKY_WIDTHS = [
  [1280, "(max-width: 1280px)"],
  [1600, "(max-width: 1600px)"],
] as const;

// Takers arrive at the desk one lane at a time. A name that passes the ENS check goes
// through to the DAO's price; no name, or an expired one, is turned back at the gate.
const GATE_LANES = [
  { who: clientName("mm-a"), pass: true },
  { who: "0x7a3f…c21e", why: LANDING.gate.noName, pass: false },
  { who: clientName("mm-b"), pass: true },
  { who: clientName("mm-c"), why: LANDING.gate.expired, pass: false },
  { who: "0x91c2…04ab", why: LANDING.gate.noName, pass: false },
] as const;

function Gate() {
  const copy = LANDING.gate;
  return (
    <div className="wm-gate">
      <div className="wm-gate-head" aria-hidden="true">
        <p>{copy.takers}</p>
        <div className="wm-gate-track">
          <p className="wm-gate-at-check">
            {copy.check} · {CLIENT_SUFFIX}
          </p>
          <p className="wm-gate-at-price">{copy.price}</p>
        </div>
        <p />
      </div>
      {GATE_LANES.map((lane, index) => (
        <div
          key={lane.who}
          className={`wm-lane ${lane.pass ? "wm-lane-pass" : "wm-lane-block"}`}
          style={{ ["--lane" as string]: index }}
        >
          <p className="wm-lane-who">
            {lane.who}
            {"why" in lane ? <span> · {lane.why}</span> : null}
          </p>
          <div className="wm-gate-track" aria-hidden="true">
            <span className="wm-lane-rail" />
            <span className="wm-lane-gate" />
            <span className="wm-lane-token" />
          </div>
          <p className="wm-lane-result">{lane.pass ? copy.filled : copy.refused}</p>
        </div>
      ))}
    </div>
  );
}

// True once the element has been a third on screen. It stays true.
function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setSeen(true);
      },
      { threshold: 0.33 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

export function LandingPage() {
  const [skyLoaded, setSkyLoaded] = useState(false);
  const [compareRef, compareSeen] = useSeen<HTMLDivElement>();
  const [gateRef, gateSeen] = useSeen<HTMLDivElement>();

  return (
    <div className="wm-landing">
      <header className="wm-top">
        <Link className="wm-mark" to="/" aria-label="watermark">
          <span className="wm-word-water">water</span>
          <span className="wm-word-mark">mark</span>
        </Link>
        <nav className="wm-top-links" aria-label="Site">
          <a href="#how">{LANDING.how}</a>
          <Link to="/desk">{LANDING.open}</Link>
        </nav>
      </header>

      <section className="wm-hero">
        <div className="wm-sky" aria-hidden="true">
          <picture>
            {SKY_WIDTHS.map(([width, media]) => (
              <source key={width} media={media} srcSet={`/landing/clouds-${width}-still.png`} />
            ))}
            <img src="/landing/clouds-1920-still.png" alt="" />
          </picture>
          <picture>
            {SKY_WIDTHS.map(([width, media]) => (
              <source
                key={`still-${width}`}
                media={`(prefers-reduced-motion: reduce) and ${media}`}
                srcSet={`/landing/clouds-${width}-still.png`}
              />
            ))}
            <source media="(prefers-reduced-motion: reduce)" srcSet="/landing/clouds-1920-still.png" />
            {SKY_WIDTHS.map(([width, media]) => (
              <source key={width} media={media} srcSet={`/landing/clouds-${width}.png`} />
            ))}
            <img
              className="wm-sky-moving"
              src="/landing/clouds-1920.png"
              alt=""
              data-loaded={skyLoaded}
              onLoad={() => setSkyLoaded(true)}
            />
          </picture>
        </div>
        <div className="wm-hero-text">
          <h1 className="wm-headline">{LANDING.headline}</h1>
          <p className="wm-via">{LANDING.via}</p>
          <div className="wm-actions">
            <Link className="wm-button" to="/desk">
              {LANDING.open}
            </Link>
            <a className="wm-link" href="#how">
              {LANDING.how}
            </a>
          </div>
        </div>
      </section>

      <section id="how" className="wm-section">
        <p className="wm-label">{LANDING.compare.label}</p>
        <h2 className="wm-h2">{LANDING.compare.title}</h2>
        <div className="wm-compare" ref={compareRef} data-seen={compareSeen}>
          <CompareTable />
        </div>
        <p className="wm-leak">{LANDING.compare.leak}</p>
      </section>

      <section className="wm-section">
        <p className="wm-label">{LANDING.gate.label}</p>
        <h2 className="wm-h2">{LANDING.gate.title}</h2>
        <div className="wm-gate-wrap" ref={gateRef} data-seen={gateSeen}>
          <Gate />
        </div>
        <p className="wm-caption">{LANDING.gate.caption}</p>
      </section>
    </div>
  );
}
