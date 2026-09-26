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

// Two panels, the same takers arriving in the same order. On the left anyone who reaches
// the DAO's price takes a piece of it. On the right an ENS ring stands around the price:
// named takers (sky) pass through, takers with no name (ink) bounce off.
const SWARM = { w: 560, h: 360, cell: 14, gap: 3, grid: 6, ring: 104, size: 10 };
const SKY = "#6ec1ea";
const INK = "#111111";
const RING = "#c8c8c8";

type Taker = { x: number; y: number; vx: number; vy: number; named: boolean; bounced: boolean };
type Panel = { gated: boolean; takers: Taker[]; cells: boolean[]; ringFlash: number; seed: number };

function makePanel(gated: boolean): Panel {
  return { gated, takers: [], cells: Array(SWARM.grid * SWARM.grid).fill(true), ringFlash: 0, seed: 7 };
}

function random(panel: Panel) {
  panel.seed = (Math.imul(panel.seed, 1664525) + 1013904223) >>> 0;
  return panel.seed / 4294967296;
}

function spawn(panel: Panel) {
  const { w, h } = SWARM;
  const edge = Math.floor(random(panel) * 4);
  const t = random(panel);
  const x = edge === 0 ? t * w : edge === 1 ? w : edge === 2 ? t * w : 0;
  const y = edge === 0 ? 0 : edge === 1 ? t * h : edge === 2 ? h : t * h;
  const angle = Math.atan2(h / 2 - y, w / 2 - x) + (random(panel) - 0.5) * 0.25;
  const speed = 110 + random(panel) * 60;
  panel.takers.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, named: random(panel) < 0.35, bounced: false });
}

function step(panel: Panel, dt: number) {
  const { w, h, cell, gap, grid, ring } = SWARM;
  const half = (grid * (cell + gap) - gap) / 2;
  for (const taker of panel.takers) {
    const beforeInside = Math.abs(taker.x - w / 2) < ring && Math.abs(taker.y - h / 2) < ring;
    taker.x += taker.vx * dt;
    taker.y += taker.vy * dt;
    const inside = Math.abs(taker.x - w / 2) < ring && Math.abs(taker.y - h / 2) < ring;
    if (panel.gated && !taker.named && !beforeInside && inside && !taker.bounced) {
      taker.vx = -taker.vx * 1.1 + (random(panel) - 0.5) * 30;
      taker.vy = -taker.vy * 1.1 + (random(panel) - 0.5) * 30;
      taker.x += taker.vx * dt * 2;
      taker.y += taker.vy * dt * 2;
      taker.bounced = true;
      panel.ringFlash = 1;
    }
  }
  panel.takers = panel.takers.filter((taker) => {
    const hit = Math.abs(taker.x - w / 2) < half && Math.abs(taker.y - h / 2) < half;
    if (hit) {
      const left = panel.cells.flatMap((on, i) => (on ? [i] : []));
      const pick = left[Math.floor(random(panel) * left.length)];
      if (pick !== undefined) panel.cells[pick] = false;
      return false;
    }
    return taker.x > -20 && taker.x < w + 20 && taker.y > -20 && taker.y < h + 20;
  });
  panel.ringFlash = Math.max(0, panel.ringFlash - dt * 3);
}

function draw(ctx: CanvasRenderingContext2D, panel: Panel, scale: number) {
  const { w, h, cell, gap, grid, ring, size } = SWARM;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const half = (grid * (cell + gap) - gap) / 2;
  panel.cells.forEach((on, i) => {
    const x = w / 2 - half + (i % grid) * (cell + gap);
    const y = h / 2 - half + Math.floor(i / grid) * (cell + gap);
    ctx.fillStyle = on ? SKY : "#ececec";
    ctx.fillRect(x, y, cell, cell);
  });
  if (panel.gated) {
    ctx.fillStyle = panel.ringFlash > 0.05 ? INK : RING;
    for (let d = -ring; d <= ring; d += 8) {
      ctx.fillRect(w / 2 + d - 2, h / 2 - ring - 2, 4, 4);
      ctx.fillRect(w / 2 + d - 2, h / 2 + ring - 2, 4, 4);
      ctx.fillRect(w / 2 - ring - 2, h / 2 + d - 2, 4, 4);
      ctx.fillRect(w / 2 + ring - 2, h / 2 + d - 2, 4, 4);
    }
  }
  for (const taker of panel.takers) {
    ctx.fillStyle = taker.named ? SKY : INK;
    ctx.fillRect(taker.x - size / 2, taker.y - size / 2, size, size);
  }
}

function Swarm() {
  const copy = LANDING.gate;
  const openRef = useRef<HTMLCanvasElement>(null);
  const namedRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvases = [openRef.current, namedRef.current];
    if (canvases.some((c) => !c)) return;
    const panels = [makePanel(false), makePanel(true)];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = 0;
    let spawnClock = 0;
    let regenClock = 0;
    let visible = false;

    const render = () => {
      canvases.forEach((canvas, i) => {
        if (!canvas) return;
        const ratio = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const scale = (width / SWARM.w) * ratio;
        if (canvas.width !== Math.round(SWARM.w * scale)) {
          canvas.width = Math.round(SWARM.w * scale);
          canvas.height = Math.round(SWARM.h * scale);
        }
        const ctx = canvas.getContext("2d");
        if (ctx) draw(ctx, panels[i]!, scale);
      });
    };

    const advance = (dt: number) => {
      spawnClock += dt;
      regenClock += dt;
      while (spawnClock > 0.12) {
        spawnClock -= 0.12;
        panels.forEach(spawn);
      }
      while (regenClock > 0.5) {
        regenClock -= 0.5;
        for (const panel of panels) {
          const gone = panel.cells.findIndex((on) => !on);
          if (gone >= 0) panel.cells[gone] = true;
        }
      }
      panels.forEach((panel) => step(panel, dt));
    };

    if (reduce) {
      for (let i = 0; i < 360; i += 1) advance(1 / 60);
      render();
      return;
    }

    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      advance(dt);
      render();
      frame = visible ? requestAnimationFrame(tick) : 0;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && !frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    });
    observer.observe(canvases[0]!);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="wm-swarm">
      <figure>
        <canvas ref={openRef} aria-hidden="true" />
        <figcaption>{copy.open}</figcaption>
      </figure>
      <figure>
        <canvas ref={namedRef} aria-hidden="true" />
        <figcaption>{copy.named}</figcaption>
      </figure>
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
        <Swarm />
        <p className="wm-caption">{LANDING.gate.caption}</p>
      </section>
    </div>
  );
}
