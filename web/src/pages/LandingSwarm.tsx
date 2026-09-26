import { useEffect, useRef, useState } from "react";
import { LANDING } from "../copy/en";
import { blueNoise, packed } from "./landing-dots";

// Two panels, the same takers arriving in the same order. On the left anyone who reaches
// the DAO's price takes a piece of it. On the right an ENS ring stands around the price:
// named takers (sky) pass through, takers with no name (ink) bounce off.
//
// Each frame is drawn as soft tone, then dithered with the same blue-noise threshold as the
// hero clouds, so the dots hold still where nothing moves and the takers leave dotted trails.

const W = 560;
const H = 360;
const DOT = 2;
const GW = W / DOT;
const GH = H / DOT;
const CELL = 14;
const GAP = 3;
const GRID = 6;
const RING = 104;
const HALF = (GRID * (CELL + GAP) - GAP) / 2;
// The two dot colours: one for the price, the ring and named takers, one for takers with no name.
type Colors = { named: string; unnamed: string };


type Taker = { x: number; y: number; vx: number; vy: number; named: boolean; bounced: boolean };
type Flash = { x: number; y: number; life: number };
type Panel = {
  gated: boolean;
  takers: Taker[];
  cells: boolean[];
  flashes: Flash[];
  seed: number;
  sky: Float32Array;
  ink: Float32Array;
  counts: { strangers: number; refused: number; named: number };
};

function makePanel(gated: boolean): Panel {
  return {
    gated,
    takers: [],
    cells: Array(GRID * GRID).fill(true),
    flashes: [],
    seed: 7,
    sky: new Float32Array(GW * GH),
    ink: new Float32Array(GW * GH),
    counts: { strangers: 0, refused: 0, named: 0 },
  };
}

function random(panel: Panel) {
  panel.seed = (Math.imul(panel.seed, 1664525) + 1013904223) >>> 0;
  return panel.seed / 4294967296;
}

function spawn(panel: Panel) {
  const edge = Math.floor(random(panel) * 4);
  const t = random(panel);
  const x = edge === 0 ? t * W : edge === 1 ? W : edge === 2 ? t * W : 0;
  const y = edge === 0 ? 0 : edge === 1 ? t * H : edge === 2 ? H : t * H;
  const angle = Math.atan2(H / 2 - y, W / 2 - x) + (random(panel) - 0.5) * 0.25;
  const speed = 110 + random(panel) * 60;
  panel.takers.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    named: random(panel) < 0.35,
    bounced: false,
  });
}

function step(panel: Panel, dt: number) {
  const inRing = (t: Taker) => Math.abs(t.x - W / 2) < RING && Math.abs(t.y - H / 2) < RING;
  for (const taker of panel.takers) {
    const before = inRing(taker);
    taker.x += taker.vx * dt;
    taker.y += taker.vy * dt;
    if (panel.gated && !taker.named && !before && inRing(taker) && !taker.bounced) {
      panel.flashes.push({ x: taker.x, y: taker.y, life: 1 });
      panel.counts.refused += 1;
      taker.vx = -taker.vx * 1.1 + (random(panel) - 0.5) * 30;
      taker.vy = -taker.vy * 1.1 + (random(panel) - 0.5) * 30;
      taker.x += taker.vx * dt * 2;
      taker.y += taker.vy * dt * 2;
      taker.bounced = true;
    }
  }
  panel.takers = panel.takers.filter((taker) => {
    if (Math.abs(taker.x - W / 2) < HALF && Math.abs(taker.y - H / 2) < HALF) {
      const left = panel.cells.flatMap((on, i) => (on ? [i] : []));
      const pick = left[Math.floor(random(panel) * left.length)];
      if (pick !== undefined) panel.cells[pick] = false;
      if (taker.named) panel.counts.named += 1;
      else panel.counts.strangers += 1;
      return false;
    }
    return taker.x > -20 && taker.x < W + 20 && taker.y > -20 && taker.y < H + 20;
  });
  for (const flash of panel.flashes) flash.life -= dt * 2.5;
  panel.flashes = panel.flashes.filter((flash) => flash.life > 0);

  // Trails fade, and each taker stamps a soft square where it is now.
  const fade = Math.pow(0.8, dt * 60);
  for (let i = 0; i < panel.sky.length; i += 1) {
    panel.sky[i]! *= fade;
    panel.ink[i]! *= fade;
  }
  for (const taker of panel.takers) stamp(taker.named ? panel.sky : panel.ink, taker.x / DOT, taker.y / DOT, 2.5, 5);
}

// A solid core and a soft edge, so the dither frays the square into dots as it moves.
function stamp(buffer: Float32Array, cx: number, cy: number, core: number, edge: number) {
  const x0 = Math.max(0, Math.floor(cx - edge));
  const x1 = Math.min(GW - 1, Math.ceil(cx + edge));
  const y0 = Math.max(0, Math.floor(cy - edge));
  const y1 = Math.min(GH - 1, Math.ceil(cy + edge));
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
      const v = d <= core ? 1 : Math.max(0, 1 - (d - core) / (edge - core)) * 0.6;
      const i = y * GW + x;
      if (v > buffer[i]!) buffer[i] = v;
    }
  }
}

// Tone for the price block and the ring, the parts that do not trail.
function stillTone(panel: Panel, x: number, y: number): [number, number] {
  const wx = x * DOT + DOT / 2;
  const wy = y * DOT + DOT / 2;
  let sky = 0;
  let ink = 0;
  const bx = wx - (W / 2 - HALF);
  const by = wy - (H / 2 - HALF);
  if (bx >= 0 && by >= 0 && bx < HALF * 2 && by < HALF * 2) {
    const cx = Math.floor(bx / (CELL + GAP));
    const cy = Math.floor(by / (CELL + GAP));
    const inCell = bx - cx * (CELL + GAP) < CELL && by - cy * (CELL + GAP) < CELL;
    if (inCell) sky = panel.cells[cy * GRID + cx] ? 0.92 : 0.1;
  }
  if (panel.gated) {
    const dx = Math.abs(wx - W / 2);
    const dy = Math.abs(wy - H / 2);
    const onRing = (Math.abs(dx - RING) < 3 && dy <= RING + 3) || (Math.abs(dy - RING) < 3 && dx <= RING + 3);
    if (onRing) sky = Math.max(sky, 0.75);
    for (const flash of panel.flashes) {
      const d = Math.hypot(wx - flash.x, wy - flash.y);
      if (d < 22) ink = Math.max(ink, flash.life * (1 - d / 22));
    }
  }
  return [sky, ink];
}

function paint(panel: Panel, image: ImageData, colors: Colors) {
  const noise = blueNoise();
  const pixels = new Uint32Array(image.data.buffer);
  const sky = packed(colors.named);
  const ink = packed(colors.unnamed);
  for (let y = 0; y < GH; y += 1) {
    for (let x = 0; x < GW; x += 1) {
      const i = y * GW + x;
      const threshold = noise[(y % 64) * 64 + (x % 64)]!;
      const [stillSky, stillInk] = stillTone(panel, x, y);
      if (Math.max(panel.ink[i]!, stillInk) > threshold) pixels[i] = ink;
      else if (Math.max(panel.sky[i]!, stillSky) > threshold) pixels[i] = sky;
      else pixels[i] = 0;
    }
  }
}

export function LandingSwarm({ named = "#6ec1ea", unnamed = "#111111" }: { named?: string; unnamed?: string }) {
  const copy = LANDING.gate;
  const openRef = useRef<HTMLCanvasElement>(null);
  const namedRef = useRef<HTMLCanvasElement>(null);
  const [counts, setCounts] = useState({ strangers: 0, gatedStrangers: 0, refused: 0, named: 0 });

  useEffect(() => {
    const canvases = [openRef.current, namedRef.current];
    if (canvases.some((c) => !c)) return;
    const panels = [makePanel(false), makePanel(true)];
    // The numbers under the panels, read a few times a second rather than every frame.
    const publish = () =>
      setCounts({
        strangers: panels[0]!.counts.strangers,
        gatedStrangers: panels[1]!.counts.strangers,
        refused: panels[1]!.counts.refused,
        named: panels[1]!.counts.named,
      });
    const counter = window.setInterval(publish, 300);
    const buffer = document.createElement("canvas");
    buffer.width = GW;
    buffer.height = GH;
    const bufferCtx = buffer.getContext("2d");
    const image = bufferCtx?.createImageData(GW, GH);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = 0;
    let spawnClock = 0;
    let regenClock = 0;
    let visible = false;

    const render = () => {
      if (!bufferCtx || !image) return;
      canvases.forEach((canvas, i) => {
        if (!canvas) return;
        const ratio = window.devicePixelRatio || 1;
        const width = Math.round(canvas.clientWidth * ratio);
        const height = Math.round((width * H) / W);
        if (canvas.width !== width) {
          canvas.width = width;
          canvas.height = height;
        }
        paint(panels[i]!, image, { named, unnamed });
        bufferCtx.putImageData(image, 0, 0);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(buffer, 0, 0, width, height);
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
      publish();
      return () => window.clearInterval(counter);
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
      window.clearInterval(counter);
    };
  }, [named, unnamed]);

  return (
    <div className="wm-panel-field wm-panel-field-water">
      <span className="wm-tag">{copy.tag}</span>
      <div className="wm-swarm">
        <figure>
          <canvas ref={openRef} aria-hidden="true" />
          <figcaption className="wm-stat">
            <span className="wm-stat-name">{copy.open}</span>
            <span className="wm-stat-value">
              {counts.strangers} {copy.openStat}
            </span>
          </figcaption>
        </figure>
        <figure>
          <canvas ref={namedRef} aria-hidden="true" />
          <figcaption className="wm-stat">
            <span className="wm-stat-name">{copy.named}</span>
            <span className="wm-stat-value">
              {counts.gatedStrangers} {copy.openStat} · {counts.refused} {copy.refusedStat} · {counts.named} {copy.namedStat}
            </span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
