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

// The price board. Widths are basis points from the mark; the numbers are an example.
const MARK = 4000;
const LOT = 100;
const SPREAD_CELLS = 30;
const usd = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

function SpreadStrip({ sellBps, buyBps }: { sellBps: number; buyBps: number }) {
  const cells = [];
  for (let bp = -SPREAD_CELLS; bp <= SPREAD_CELLS; bp += 1) {
    const x = (bp + SPREAD_CELLS) * STEP;
    const kind = bp === 0 ? "mark" : (bp > 0 && bp <= sellBps) || (bp < 0 && -bp <= buyBps) ? "on" : "off";
    cells.push(
      kind === "off" ? (
        <rect key={bp} className="wm-cell-off" x={x + 4} y={4} width={2} height={2} />
      ) : (
        <rect key={bp} className={kind === "mark" ? "wm-cell-mark" : "wm-cell-spread"} x={x} y={0} width={CELL} height={CELL} />
      ),
    );
  }
  return (
    <svg className="wm-spread" viewBox={`0 0 ${(SPREAD_CELLS * 2 + 1) * STEP - 4} ${CELL}`} aria-hidden="true">
      {cells}
    </svg>
  );
}

function PriceBoard() {
  const copy = LANDING.price;
  const [sellBps, setSellBps] = useState(3);
  const [buyBps, setBuyBps] = useState(10);
  const ask = (MARK * (10000 + sellBps)) / 10000;
  const bid = (MARK * (10000 - buyBps)) / 10000;
  const lotOurs = (LOT * MARK * sellBps) / 10000;
  const lotToday = LOT * MARK * 0.02;

  return (
    <div className="wm-board">
      <div className="wm-quotes">
        <div className="wm-quote">
          <p className="wm-panel-label">{copy.buy}</p>
          <p className="wm-quote-price">{usd(bid)}</p>
          <p className="wm-quote-bps">−{buyBps} bp</p>
        </div>
        <div className="wm-quote">
          <p className="wm-panel-label">{copy.sell}</p>
          <p className="wm-quote-price">{usd(ask)}</p>
          <p className="wm-quote-bps">+{sellBps} bp</p>
        </div>
      </div>
      <div className="wm-spread-wrap">
        <SpreadStrip sellBps={sellBps} buyBps={buyBps} />
        <p className="wm-spread-mark">{copy.mark}</p>
      </div>
      <div className="wm-sliders">
        <label className="wm-slider">
          <span>
            {copy.buyWidth} <output>{buyBps} bp</output>
          </span>
          <input type="range" min={1} max={SPREAD_CELLS} value={buyBps} onChange={(e) => setBuyBps(Number(e.target.value))} />
        </label>
        <label className="wm-slider">
          <span>
            {copy.sellWidth} <output>{sellBps} bp</output>
          </span>
          <input
            type="range"
            min={1}
            max={SPREAD_CELLS}
            value={sellBps}
            onChange={(e) => setSellBps(Number(e.target.value))}
          />
        </label>
      </div>
      <p className="wm-lot">
        {copy.lot}: <strong>+${whole(lotOurs)}</strong> {copy.lotOurs}. <span>−${whole(lotToday)}</span> {copy.lotToday}.
      </p>
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
        <PriceBoard />
        <div className="wm-three">
          {LANDING.price.points.map((point) => (
            <div key={point.title}>
              <p className="wm-three-title">{point.title}</p>
              <p className="wm-three-body">{point.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
