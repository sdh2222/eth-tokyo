import { useEffect, useRef } from "react";
import { LANDING } from "../copy/en";
import { blueNoise, packed } from "./landing-dots";

// Two takers, one session each, replayed. The ink line is the oracle mid. The sky band is
// that taker's quote: its sell width above the mid and its buy width below. Both start at
// the Safe's terms (3 / 10 bp, the dotted limit). After every fill (an ink square on the
// ask) the agent writes that name's next spread (a sky tick below), and the band steps.
// mm-a fills small and calmly, so its band tightens. mm-b turns large and fills just
// before the mid moves its way, so its band goes back out to the terms and stays there.

const W = 560;
const H = 260;
const DOT = 2;
const GW = W / DOT;
const GH = H / DOT;
const RUN = 10;
const HOLD = 2.5;
const WRITE_DELAY = 0.35;
const BP = 3.4;
const MID = 44;
const STRIP = 112;
const TERMS = { sell: 3, buy: 10 };

type Fill = { at: number; next: { sell: number; buy: number }; jump?: number };

const SESSIONS: Fill[][] = [
  [
    { at: 1.5, next: { sell: 2, buy: 8 } },
    { at: 4.5, next: { sell: 1, buy: 4 } },
    { at: 7.5, next: { sell: 1, buy: 4 } },
  ],
  [
    { at: 1.5, next: { sell: 1, buy: 4 } },
    { at: 4.5, next: { sell: 3, buy: 10 }, jump: 12 },
    { at: 6.3, next: { sell: 3, buy: 10 }, jump: 10 },
  ],
];

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function midAt(t: number, fills: Fill[]) {
  let y = MID + 3 * Math.sin(0.9 * t) + 1.5 * Math.sin(2.3 * t + 1);
  // A taker that bought just before the mid rose: the mid lifts right after its fill.
  for (const fill of fills) if (fill.jump) y -= fill.jump * smooth((t - fill.at - 0.1) / 0.5);
  return y;
}

function widthsAt(t: number, fills: Fill[]) {
  let widths = TERMS;
  for (const fill of fills) if (t >= fill.at + WRITE_DELAY) widths = fill.next;
  return widths;
}

function paint(image: ImageData, now: number, fills: Fill[], colors: { quote: string; line: string }) {
  const noise = blueNoise();
  const pixels = new Uint32Array(image.data.buffer);
  const sky = packed(colors.quote);
  const ink = packed(colors.line);
  pixels.fill(0);
  for (let x = 0; x < GW; x += 1) {
    const t = (x / (GW - 1)) * RUN;
    if (t > now) break;
    const mid = midAt(t, fills);
    const { sell, buy } = widthsAt(t, fills);
    const ask = mid - sell * BP;
    const bid = mid + buy * BP;
    const termsAsk = mid - TERMS.sell * BP;
    const termsBid = mid + TERMS.buy * BP;
    for (let y = 0; y < GH; y += 1) {
      let skyTone = 0;
      let inkTone = 0;
      if (y >= ask && y <= bid) skyTone = Math.abs(y - ask) < 1 || Math.abs(y - bid) < 1 ? 0.95 : 0.4;
      if ((Math.abs(y - termsAsk) < 0.6 || Math.abs(y - termsBid) < 0.6) && x % 4 < 2) inkTone = 0.8;
      if (Math.abs(y - mid) <= 1.1) inkTone = 1;
      const i = y * GW + x;
      const threshold = noise[(y % 64) * 64 + (x % 64)]!;
      if (inkTone > threshold) pixels[i] = ink;
      else if (skyTone > threshold) pixels[i] = sky;
    }
  }
  // Fills: an ink square on the ask where the taker hit it. Writes: a sky tick on the strip.
  for (const fill of fills) {
    if (fill.at <= now) {
      const fx = Math.round((fill.at / RUN) * (GW - 1));
      const fy = Math.round(midAt(fill.at, fills) - widthsAt(fill.at, fills).sell * BP);
      for (let dy = -3; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 3; dx += 1) {
          const x = fx + dx;
          const y = fy + dy - 3;
          if (x >= 0 && x < GW && y >= 0 && y < GH) pixels[y * GW + x] = ink;
        }
      }
    }
    const wt = fill.at + WRITE_DELAY;
    if (wt <= now) {
      const wx = Math.round((wt / RUN) * (GW - 1));
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const x = wx + dx;
          const y = STRIP + dy;
          if (x >= 0 && x < GW) pixels[y * GW + x] = sky;
        }
      }
      // A short burst of sky dots where the agent writes, while it is fresh.
      const age = now - wt;
      if (age < 0.6) {
        const r = 4 + age * 18;
        for (let a = 0; a < 24; a += 1) {
          const x = Math.round(wx + Math.cos((a / 24) * Math.PI * 2) * r);
          const y = Math.round(STRIP - 10 + Math.sin((a / 24) * Math.PI * 2) * r * 0.6);
          if (x >= 0 && x < GW && y >= 0 && y < GH) pixels[y * GW + x] = sky;
        }
      }
    }
  }
}

export function LandingAgent({ quote = "#6ec1ea", line = "#111111" }: { quote?: string; line?: string }) {
  const copy = LANDING.agent;
  const aRef = useRef<HTMLCanvasElement>(null);
  const bRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvases = [aRef.current, bRef.current];
    if (canvases.some((c) => !c)) return;
    const buffer = document.createElement("canvas");
    buffer.width = GW;
    buffer.height = GH;
    const bufferCtx = buffer.getContext("2d");
    const image = bufferCtx?.createImageData(GW, GH);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let start = 0;
    let visible = false;

    const render = (now: number) => {
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
        paint(image, now, SESSIONS[i]!, { quote, line });
        bufferCtx.putImageData(image, 0, 0);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(buffer, 0, 0, width, height);
      });
    };

    if (reduce) {
      render(RUN);
      return;
    }

    const tick = (time: number) => {
      if (!start) start = time;
      const cycle = ((time - start) / 1000) % (RUN + HOLD);
      render(Math.min(RUN, cycle));
      frame = visible ? requestAnimationFrame(tick) : 0;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && !frame) {
        start = 0;
        frame = requestAnimationFrame(tick);
      }
    });
    observer.observe(canvases[0]!);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [quote, line]);

  return (
    <>
      <div className="wm-swarm wm-swarm-wide">
        <figure>
          <canvas ref={aRef} aria-hidden="true" />
          <figcaption>
            {copy.a}
            <span className="wm-fig-note">{copy.aNote}</span>
          </figcaption>
        </figure>
        <figure>
          <canvas ref={bRef} aria-hidden="true" />
          <figcaption>
            {copy.b}
            <span className="wm-fig-note">{copy.bNote}</span>
          </figcaption>
        </figure>
      </div>
      <ul className="wm-legend" aria-hidden="true">
        <li>
          <span className="wm-key wm-key-line" />
          {copy.legend.mid}
        </li>
        <li>
          <span className="wm-key wm-key-band" />
          {copy.legend.quote}
        </li>
        <li>
          <span className="wm-key wm-key-terms" />
          {copy.legend.terms}
        </li>
        <li>
          <span className="wm-key wm-key-sign" />
          {copy.legend.fill}
        </li>
        <li>
          <span className="wm-key wm-key-write" />
          {copy.legend.write}
        </li>
      </ul>
    </>
  );
}
