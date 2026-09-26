import { useEffect, useRef, useState } from "react";
import { LANDING } from "../copy/en";
import { blueNoise, packed } from "./landing-dots";

// The DAO's price sits in the middle. Each named taker circles it at its own distance, and
// that distance is its spread: closer is a better price. The dotted ring is the Safe's
// terms, the widest a taker can ever get. When a taker trades it dashes in to the price
// and back, and the agent sets how close it may come next time.

const W = 640;
const H = 400;
const DOT = 2;
const GW = W / DOT;
const GH = H / DOT;
const CX = GW / 2;
const CY = GH / 2;
const CELL = 6;
const GAP = 1;
const GRID = 6;
const HALF = (GRID * (CELL + GAP) - GAP) / 2;
const LOOP = 12.5;
const FADE = 0.5;
const DASH = 0.6;

type Tier = "tight" | "standard" | "limit";
const RADIUS: Record<Tier, number> = { tight: 36, standard: 58, limit: 86 };

type Taker = { name: string; start: Tier; angle: number; speed: number };
// All three start on the default spread. mm-a trades small and steady and is pulled in;
// mm-b trades big and the price jumps its way after, so it is pushed out to the limit.
const TAKERS: Taker[] = [
  { name: "mm-a", start: "standard", angle: 0.4, speed: 0.55 },
  { name: "mm-b", start: "standard", angle: 2.6, speed: 0.42 },
  { name: "mm-c", start: "standard", angle: 4.5, speed: 0.5 },
];

type Event = { at: number; who: number; trade: string; to: Tier };
const EVENTS: Event[] = [
  { at: 1.0, who: 0, trade: "0.8 ETH", to: "tight" },
  { at: 2.4, who: 1, trade: "22 ETH", to: "limit" },
  { at: 4.0, who: 2, trade: "3 ETH", to: "standard" },
  { at: 5.6, who: 0, trade: "0.5 ETH", to: "tight" },
  { at: 7.2, who: 1, trade: "25 ETH", to: "limit" },
  { at: 8.8, who: 0, trade: "0.7 ETH", to: "tight" },
  { at: 10.2, who: 2, trade: "2 ETH", to: "standard" },
];

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

// Where a taker is at time t in the loop: its tier and its current radius.
function state(who: number, t: number) {
  let tier = TAKERS[who]!.start;
  let radius = RADIUS[tier];
  let dash = 0;
  for (const event of EVENTS) {
    if (event.who !== who || t < event.at) continue;
    const phase = (t - event.at) / DASH;
    if (phase < 1) dash = Math.sin(Math.PI * phase);
    const from = RADIUS[tier];
    tier = event.to;
    radius = from + (RADIUS[tier] - from) * smooth((t - event.at - DASH) / 0.8);
  }
  return { tier, radius: radius * (1 - 0.82 * dash) };
}

function position(who: number, t: number) {
  const taker = TAKERS[who]!;
  const { radius } = state(who, t);
  const a = taker.angle + taker.speed * t;
  return { x: CX + Math.cos(a) * radius, y: CY + Math.sin(a) * radius * 0.92 };
}

function stamp(buffer: Float32Array, cx: number, cy: number, core: number, edge: number, tone: number) {
  for (let y = Math.floor(cy - edge); y <= Math.ceil(cy + edge); y += 1) {
    for (let x = Math.floor(cx - edge); x <= Math.ceil(cx + edge); x += 1) {
      if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
      const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
      const v = (d <= core ? 1 : Math.max(0, 1 - (d - core) / (edge - core)) * 0.6) * tone;
      const i = y * GW + x;
      if (v > buffer[i]!) buffer[i] = v;
    }
  }
}

const skyTone = new Float32Array(GW * GH);
const inkTone = new Float32Array(GW * GH);

function paint(image: ImageData, t: number, colors: { price: string; ink: string }) {
  skyTone.fill(0);
  inkTone.fill(0);
  // The price: a block of sky squares. A square goes pale for a moment after each trade.
  const taken = new Set<number>();
  EVENTS.forEach((event, i) => {
    if (t >= event.at + DASH * 0.5 && t < event.at + 1.6) taken.add((i * 7 + 3) % (GRID * GRID));
  });
  for (let cell = 0; cell < GRID * GRID; cell += 1) {
    const x0 = Math.round(CX - HALF + (cell % GRID) * (CELL + GAP));
    const y0 = Math.round(CY - HALF + Math.floor(cell / GRID) * (CELL + GAP));
    for (let y = y0; y < y0 + CELL; y += 1) {
      for (let x = x0; x < x0 + CELL; x += 1) skyTone[y * GW + x] = taken.has(cell) ? 0.15 : 0.92;
    }
  }
  // The tier lanes, faint, and the Safe's terms as a dashed ink ring.
  for (let s = 0; s < 1400; s += 1) {
    const a = (s / 1400) * Math.PI * 2;
    for (const tier of ["tight", "standard"] as const) {
      const x = Math.round(CX + Math.cos(a) * RADIUS[tier]);
      const y = Math.round(CY + Math.sin(a) * RADIUS[tier] * 0.92);
      skyTone[y * GW + x] = Math.max(skyTone[y * GW + x]!, 0.3);
    }
    if (Math.floor(s / 10) % 2 === 0) {
      const x = Math.round(CX + Math.cos(a) * RADIUS.limit);
      const y = Math.round(CY + Math.sin(a) * RADIUS.limit * 0.92);
      inkTone[y * GW + x] = 1;
    }
  }
  // Each taker, with a short dotted trail behind it.
  TAKERS.forEach((_, who) => {
    for (let k = 10; k >= 0; k -= 1) {
      const p = position(who, t - k * 0.05);
      stamp(inkTone, p.x, p.y, k === 0 ? 2.5 : 1, k === 0 ? 4.5 : 2, k === 0 ? 1 : 0.55 - k * 0.045);
    }
  });
  // A sky burst where the agent writes a taker's new distance.
  for (const event of EVENTS) {
    const age = t - (event.at + DASH);
    if (age < 0 || age > 0.6) continue;
    const p = position(event.who, t);
    const r = 5 + age * 22;
    for (let a = 0; a < 28; a += 1) {
      const x = Math.round(p.x + Math.cos((a / 28) * Math.PI * 2) * r);
      const y = Math.round(p.y + Math.sin((a / 28) * Math.PI * 2) * r);
      if (x >= 0 && y >= 0 && x < GW && y < GH) skyTone[y * GW + x] = 1;
    }
  }
  const noise = blueNoise();
  const pixels = new Uint32Array(image.data.buffer);
  const sky = packed(colors.price);
  const ink = packed(colors.ink);
  for (let y = 0; y < GH; y += 1) {
    for (let x = 0; x < GW; x += 1) {
      const i = y * GW + x;
      const threshold = noise[(y % 64) * 64 + (x % 64)]!;
      pixels[i] = inkTone[i]! > threshold ? ink : skyTone[i]! > threshold ? sky : 0;
    }
  }
}

type Row = { name: string; tier: Tier; from: Tier | null };

function rowsAt(t: number): Row[] {
  return TAKERS.map((taker, who) => {
    let tier = taker.start;
    let from: Tier | null = null;
    for (const event of EVENTS) {
      if (event.who !== who || t < event.at + DASH) continue;
      // Keep the last move that changed the spread; a trade that keeps it is not a change.
      if (event.to !== tier) from = tier;
      tier = event.to;
    }
    return { name: taker.name, tier, from };
  });
}

export function LandingOrbit() {
  const copy = LANDING.orbit;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const buffer = document.createElement("canvas");
    buffer.width = GW;
    buffer.height = GH;
    const bufferCtx = buffer.getContext("2d");
    const image = bufferCtx?.createImageData(GW, GH);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const style = getComputedStyle(canvas);
    const colors = {
      price: style.getPropertyValue("--wm-dot").trim() || "#6ec1ea",
      ink: style.getPropertyValue("--wm-ink").trim() || "#111111",
    };
    let frame = 0;
    let start = 0;
    let visible = false;
    let lastWrites = -1;

    const render = (t: number) => {
      if (!bufferCtx || !image) return;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(canvas.clientWidth * ratio);
      const height = Math.round((width * H) / W);
      if (canvas.width !== width) {
        canvas.width = width;
        canvas.height = height;
      }
      paint(image, t, colors);
      bufferCtx.putImageData(image, 0, 0);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.min(1, t / FADE, (LOOP - t) / FADE);
      ctx.drawImage(buffer, 0, 0, width, height);
      // Names beside each taker, crisp rather than dithered.
      const scale = width / GW;
      ctx.fillStyle = colors.ink;
      ctx.font = `${Math.round(13 * ratio)}px "LisaTerminal Paper", monospace`;
      TAKERS.forEach((taker, who) => {
        const p = position(who, t);
        ctx.fillText(taker.name, (p.x + 6) * scale, (p.y - 5) * scale);
      });
      ctx.globalAlpha = 1;
      const writes = EVENTS.filter((event) => t >= event.at + DASH).length;
      if (writes !== lastWrites) {
        lastWrites = writes;
        setShown(t);
      }
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
  }, []);

  const rows = rowsAt(shown);

  return (
    <div className="wm-panel-field">
      <span className="wm-tag">{copy.tag}</span>
      <canvas ref={canvasRef} className="wm-orbit-canvas" aria-hidden="true" />
      <div className="wm-stats">
        {rows
          .filter((row) => row.name !== "mm-c")
          .map((row) => (
            <p key={row.name} className="wm-stat">
              <span className="wm-stat-name">
                {row.name} · {copy.style[row.name as keyof typeof copy.style]}
              </span>
              <span className="wm-stat-value">{copy.tier[row.tier]}</span>
              <span className="wm-stat-note">{copy.statNote}</span>
            </p>
          ))}
      </div>
    </div>
  );
}
