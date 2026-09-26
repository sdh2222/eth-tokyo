import { useEffect, useRef, useState } from "react";
import { LANDING } from "../copy/en";
import { blueNoise, packed } from "./landing-dots";

// Two rows on one time axis, the same 60 cells of treasury in each. Dump: the whole amount
// lands at once, and on impact a few cells break off and spray out of the frame, the
// slippage paid away; their places stay empty. Quote: one signature at the start, then the
// same amount goes out as small fills across the axis.

const H = 340;
const DOT = 2;
const GH = H / DOT;
const CELL = 6;
const GAP = 2;
const LOOP = 9;
const FADE = 0.5;
const LEFT = 30;
const DUMP_BASE = 70;
const QUOTE_BASE = 150;
const DUMP = { cols: 10, rows: 6, at: 0.4 };
// The cells the impact knocks off: the top right corner of the block.
const LOST = new Set([7, 8, 9, 18, 19]);
// Wide screens spread the 60 cells over 60 columns; phones draw half as wide and stack
// them twice as high, so the picture keeps its size instead of shrinking.
const WIDE = { w: 1120, cols: 60, fills: [1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 1, 2] };
const NARROW = { w: 560, cols: 30, fills: [2, 1, 3, 2, 1, 2, 3, 1, 2, 2, 2, 3] };
type Layout = typeof WIDE;
const SIGN_AT = 0.5;
const FILL_START = 1.0;
const FILL_STEP = 0.11;
const SPRAY_LIFE = 3.2;
const NARROW_QUERY = "(max-width: 600px)";

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

// A fixed spray, so every loop throws the same pieces.
const SPRAY = Array.from({ length: 90 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const cell = [...LOST][i % LOST.size]!;
  return {
    x: (cell % DUMP.cols) * (CELL + GAP) + r(3) * CELL,
    y: Math.floor(cell / DUMP.cols) * (CELL + GAP) + r(5) * CELL,
    vx: 30 + r(1) * 170,
    vy: -30 - r(2) * 70,
    size: 1 + Math.round(r(4) * 2),
  };
});

let GW = WIDE.w / DOT;
let ink = new Float32Array(GW * GH);
let sky = new Float32Array(GW * GH);

function block(buffer: Float32Array, x0: number, y0: number, w: number, h: number, tone: number) {
  for (let y = Math.max(0, Math.round(y0)); y < Math.min(GH, Math.round(y0 + h)); y += 1) {
    for (let x = Math.max(0, Math.round(x0)); x < Math.min(GW, Math.round(x0 + w)); x += 1) {
      const i = y * GW + x;
      if (tone > buffer[i]!) buffer[i] = tone;
    }
  }
}

function paint(image: ImageData, t: number, colors: { ink: string; sky: string }, layout: Layout) {
  if (GW !== layout.w / DOT) {
    GW = layout.w / DOT;
    ink = new Float32Array(GW * GH);
    sky = new Float32Array(GW * GH);
  }
  const RIGHT = GW - 12;
  ink.fill(0);
  sky.fill(0);
  // Axes: a dotted baseline under each row.
  for (let x = LEFT; x < RIGHT; x += 4) {
    block(ink, x, DUMP_BASE + 2, 1, 1, 1);
    block(ink, x, QUOTE_BASE + 2, 1, 1, 1);
  }
  // Dump: the block drops in, then sprays.
  const drop = smooth((t - DUMP.at) / 0.35);
  if (t >= DUMP.at) {
    const bh = DUMP.rows * (CELL + GAP) - GAP;
    const y0 = DUMP_BASE - bh - (1 - drop) * 60;
    const age = t - (DUMP.at + 0.35);
    for (let cell = 0; cell < DUMP.cols * DUMP.rows; cell += 1) {
      const x = LEFT + (cell % DUMP.cols) * (CELL + GAP);
      const y = y0 + Math.floor(cell / DUMP.cols) * (CELL + GAP);
      if (!LOST.has(cell) || age <= 0) block(ink, x, y, CELL, CELL, 1);
      // A knocked-off cell leaves its outline behind: the part of the treasury that is gone.
      else for (let k = 0; k < CELL; k += 2) {
        block(ink, x + k, y, 1, 1, 1);
        block(ink, x + k, y + CELL - 1, 1, 1, 1);
        block(ink, x, y + k, 1, 1, 1);
        block(ink, x + CELL - 1, y + k, 1, 1, 1);
      }
    }
    if (age > 0 && age < SPRAY_LIFE) {
      for (const piece of SPRAY) {
        const x = LEFT + piece.x + piece.vx * age;
        const y = DUMP_BASE - bh + piece.y + piece.vy * age + 45 * age * age;
        const tone = (1 - age / SPRAY_LIFE) * 0.95;
        if (x < RIGHT && y < DUMP_BASE) block(ink, x, y, piece.size, piece.size, tone);
      }
    }
  }
  // Quote: one signature, written left to right, then small fills across the axis.
  const written = smooth((t - SIGN_AT) / 0.45);
  for (let s = 0; s < written; s += 0.004) {
    const x = LEFT - 24 + s * 18;
    const y = QUOTE_BASE - 8 - Math.sin(s * Math.PI * 5) * 5 * (1 - s * 0.5) - s * 4;
    block(ink, x, y, 2, 2, 1);
  }
  const step = (FILL_STEP * WIDE.cols) / layout.cols;
  for (let col = 0; col < layout.cols; col += 1) {
    const at = FILL_START + col * step;
    if (t < at) break;
    const height = layout.fills[col % layout.fills.length]!;
    const pop = smooth((t - at) / 0.2);
    for (let r = 0; r < height; r += 1) {
      block(sky, LEFT + col * (CELL + GAP), QUOTE_BASE - (r + 1) * (CELL + GAP) + GAP + (1 - pop) * 6, CELL, CELL, 1);
    }
  }
  const noise = blueNoise();
  const pixels = new Uint32Array(image.data.buffer);
  const inkPx = packed(colors.ink);
  const skyPx = packed(colors.sky);
  for (let y = 0; y < GH; y += 1) {
    for (let x = 0; x < GW; x += 1) {
      const i = y * GW + x;
      const threshold = noise[(y % 64) * 64 + (x % 64)]!;
      pixels[i] = ink[i]! > threshold ? inkPx : sky[i]! > threshold ? skyPx : 0;
    }
  }
}

export function LandingDump() {
  const copy = LANDING.sell;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY);
    const change = () => setNarrow(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const layout = narrow ? NARROW : WIDE;
    const GW = layout.w / DOT;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const buffer = document.createElement("canvas");
    buffer.width = GW;
    buffer.height = GH;
    const bufferCtx = buffer.getContext("2d");
    const image = bufferCtx?.createImageData(GW, GH);
    const style = getComputedStyle(canvas);
    const colors = {
      ink: style.getPropertyValue("--wm-ink").trim() || "#111111",
      sky: style.getPropertyValue("--wm-dot").trim() || "#6ec1ea",
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let start = 0;
    let visible = false;

    const render = (t: number) => {
      if (!bufferCtx || !image) return;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(canvas.clientWidth * ratio);
      const height = Math.round((width * H) / layout.w);
      if (canvas.width !== width) {
        canvas.width = width;
        canvas.height = height;
      }
      paint(image, t, colors, layout);
      bufferCtx.putImageData(image, 0, 0);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.min(1, t / FADE, (LOOP - t) / FADE);
      ctx.drawImage(buffer, 0, 0, width, height);
      ctx.globalAlpha = 1;
    };

    if (reduce) {
      render(LOOP - FADE);
      return;
    }
    const tick = (time: number) => {
      if (!start) start = time;
      render(((time - start) / 1000) % LOOP);
      frame = visible ? requestAnimationFrame(tick) : 0;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && !frame) {
        start = 0;
        frame = requestAnimationFrame(tick);
      }
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [narrow]);

  return (
    <div className="wm-panel-field">
      <span className="wm-tag">{copy.tag}</span>
      <div className="wm-rows-labels" aria-hidden="true">
        <span>{copy.dump}</span>
        <span>{copy.quote}</span>
      </div>
      <canvas
        ref={canvasRef}
        className="wm-dump-canvas"
        style={{ aspectRatio: `${narrow ? NARROW.w : WIDE.w} / ${H}` }}
        aria-hidden="true"
      />
    </div>
  );
}
