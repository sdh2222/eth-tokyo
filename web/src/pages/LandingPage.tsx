import { Link } from "react-router-dom";
import { LANDING } from "../copy/en";
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
      cells.push(
        on ? (
          <rect key={`${col}-${row}`} className="wm-cell-on" x={x} y={y} width={CELL} height={CELL} />
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

function ComparePanel({ side, kind }: { side: "today" | "ours"; kind: "dump" | "fills" }) {
  const copy = LANDING.compare[side];
  return (
    <article className={`wm-panel wm-panel-${side}`}>
      <p className="wm-panel-label">{copy.label}</p>
      <figure className="wm-figure">
        <Timeline kind={kind} />
        <figcaption>{LANDING.compare.axis} →</figcaption>
      </figure>
      <div>
        <p className="wm-number">{copy.number}</p>
        <p className="wm-number-note">{copy.note}</p>
      </div>
      <ul className="wm-points">
        {copy.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </article>
  );
}

export function LandingPage() {
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
        <picture className="wm-sky" aria-hidden="true">
          <source srcSet="/landing/hero-dither-still.png" media="(prefers-reduced-motion: reduce)" />
          <img src="/landing/hero-dither.png" alt="" />
        </picture>
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
        <div className="wm-compare">
          <ComparePanel side="today" kind="dump" />
          <ComparePanel side="ours" kind="fills" />
        </div>
      </section>
    </div>
  );
}
