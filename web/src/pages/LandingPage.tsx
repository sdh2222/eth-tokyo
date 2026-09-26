import { useEffect, useRef, useState } from "react";
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

// The DAO's quote around an example mark. Each square is one basis point.
const SPREAD_CELLS = 16;
const QUOTE = { buy: "3,996.00", buyBps: 10, sell: "4,001.20", sellBps: 3 };

function SpreadStrip() {
  const cells = [];
  for (let bp = -SPREAD_CELLS; bp <= SPREAD_CELLS; bp += 1) {
    const x = (bp + SPREAD_CELLS) * STEP;
    const on = (bp > 0 && bp <= QUOTE.sellBps) || (bp < 0 && -bp <= QUOTE.buyBps);
    // The squares open outward from the mark, one basis point at a time.
    const delay = Math.abs(bp) * 60;
    cells.push(
      bp === 0 ? (
        <rect key={bp} className="wm-cell-mark" x={x} y={0} width={CELL} height={CELL} />
      ) : on ? (
        <rect
          key={bp}
          className="wm-cell-on wm-cell-spread"
          x={x}
          y={0}
          width={CELL}
          height={CELL}
          style={{ transitionDelay: `${delay}ms` }}
        />
      ) : (
        <rect key={bp} className="wm-cell-off" x={x + 4} y={4} width={2} height={2} />
      ),
    );
  }
  return (
    <svg className="wm-spread" viewBox={`0 0 ${(SPREAD_CELLS * 2 + 1) * STEP - 4} ${CELL}`} aria-hidden="true">
      {cells}
    </svg>
  );
}

function WhoPanel({ side }: { side: "today" | "ours" }) {
  const copy = LANDING.price[side];
  return (
    <article className={`wm-panel wm-panel-${side}`}>
      <p className="wm-panel-label">{copy.label}</p>
      <p className="wm-number">{copy.who}</p>
      <p className="wm-who-body">{copy.body}</p>
    </article>
  );
}

function QuoteStrip() {
  const copy = LANDING.price;
  return (
    <div className="wm-board">
      <p className="wm-panel-label">{copy.quote}</p>
      <div className="wm-quote-row">
        <div className="wm-quote">
          <p className="wm-quote-side">{copy.buy}</p>
          <p className="wm-quote-price">{QUOTE.buy}</p>
          <p className="wm-quote-bps">−{QUOTE.buyBps} bp</p>
        </div>
        <div className="wm-quote-mid">
          <SpreadStrip />
          <p className="wm-spread-mark">{copy.mark}</p>
        </div>
        <div className="wm-quote">
          <p className="wm-quote-side">{copy.sell}</p>
          <p className="wm-quote-price">{QUOTE.sell}</p>
          <p className="wm-quote-bps">+{QUOTE.sellBps} bp</p>
        </div>
      </div>
      <p className="wm-close">{copy.close}</p>
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
  const [priceRef, priceSeen] = useSeen<HTMLDivElement>();

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
          <img src="/landing/hero-dither-still.png" alt="" />
          <picture>
            <source srcSet="/landing/hero-dither-still.png" media="(prefers-reduced-motion: reduce)" />
            <img
              className="wm-sky-moving"
              src="/landing/hero-dither.png"
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
          <ComparePanel side="today" kind="dump" />
          <ComparePanel side="ours" kind="fills" />
        </div>
      </section>

      <section className="wm-section">
        <p className="wm-label">{LANDING.price.label}</p>
        <h2 className="wm-h2">{LANDING.price.title}</h2>
        <div className="wm-seen" ref={priceRef} data-seen={priceSeen}>
          <div className="wm-compare">
            <WhoPanel side="today" />
            <WhoPanel side="ours" />
          </div>
          <QuoteStrip />
        </div>
      </section>
    </div>
  );
}
