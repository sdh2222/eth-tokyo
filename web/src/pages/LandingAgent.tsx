import { useEffect, useRef } from "react";
import { LANDING } from "../copy/en";
import { blueNoise, packed } from "./landing-dots";

// Two panels over the same market. The ink line is the market; the sky band is the DAO's
// quote, sell width above its price and buy width below. Time scrolls right to left.
// Left, the spread lives in the program: the quote moves only when the Safe signs (an ink
// square on the strip), and between signatures the market walks out of the band.
// Right, the spread lives on the ENS name: the agent rewrites it every quarter second (a
// sky tick), so the band follows the market and the Safe never signs again.

const W = 560;
const H = 360;
const DOT = 2;
const GW = W / DOT;
const GH = H / DOT;
const WINDOW = 8;
const SIGN_EVERY = 2;
const WRITE_EVERY = 0.25;
const PLOT_TOP = 15;
const PLOT_H = 115;
const SELL = 5;
const BUY = 9;
const STRIP = 152;

function market(t: number) {
  return 0.5 + 0.22 * Math.sin(0.5 * t) + 0.1 * Math.sin(1.1 * t + 1.3) + 0.04 * Math.sin(2.3 * t + 0.4);
}

function toY(m: number) {
  return PLOT_TOP + (1 - m) * PLOT_H;
}

function paint(image: ImageData, t: number, signed: boolean, colors: { quote: string; line: string }) {
  const noise = blueNoise();
  const pixels = new Uint32Array(image.data.buffer);
  const sky = packed(colors.quote);
  const ink = packed(colors.line);
  const period = signed ? SIGN_EVERY : WRITE_EVERY;
  for (let x = 0; x < GW; x += 1) {
    const tau = t - ((GW - 1 - x) * WINDOW) / GW;
    const ym = toY(market(tau));
    const yp = toY(market(Math.floor(tau / period) * period));
    const top = yp - SELL;
    const bottom = yp + BUY;
    // Where the last update sits, in grid columns from this one.
    const k = Math.round(tau / period) * period;
    const dx = ((tau - k) * GW) / WINDOW;
    for (let y = 0; y < GH; y += 1) {
      let skyTone = 0;
      let inkTone = 0;
      if (y >= top && y <= bottom) skyTone = Math.abs(y - top) < 1 || Math.abs(y - bottom) < 1 ? 0.95 : 0.4;
      if (Math.abs(y - ym) <= 1.1) inkTone = 1;
      else if (signed && ym < top && y > ym && y < top) inkTone = 0.3;
      else if (signed && ym > bottom && y < ym && y > bottom) inkTone = 0.3;
      if (signed && Math.abs(dx) <= 2.5 && y >= STRIP - 2 && y <= STRIP + 2) inkTone = 1;
      if (!signed && Math.abs(dx) <= 0.8 && y >= STRIP - 1 && y <= STRIP + 1) skyTone = 1;
      const i = y * GW + x;
      const threshold = noise[(y % 64) * 64 + (x % 64)]!;
      pixels[i] = inkTone > threshold ? ink : skyTone > threshold ? sky : 0;
    }
  }
}

export function LandingAgent({ quote = "#6ec1ea", line = "#111111" }: { quote?: string; line?: string }) {
  const copy = LANDING.agent;
  const programRef = useRef<HTMLCanvasElement>(null);
  const nameRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvases = [programRef.current, nameRef.current];
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

    const render = (t: number) => {
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
        paint(image, t, i === 0, { quote, line });
        bufferCtx.putImageData(image, 0, 0);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(buffer, 0, 0, width, height);
      });
    };

    // Start a few seconds in, so the window is already full of market.
    const OFFSET = 11;
    if (reduce) {
      render(OFFSET);
      return;
    }

    const tick = (now: number) => {
      if (!start) start = now;
      render(OFFSET + (now - start) / 1000);
      frame = visible ? requestAnimationFrame(tick) : 0;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && !frame) frame = requestAnimationFrame(tick);
    });
    observer.observe(canvases[0]!);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [quote, line]);

  return (
    <>
      <div className="wm-swarm">
        <figure>
          <canvas ref={programRef} aria-hidden="true" />
          <figcaption>
            {copy.program}
            <span className="wm-fig-note">{copy.programNote}</span>
          </figcaption>
        </figure>
        <figure>
          <canvas ref={nameRef} aria-hidden="true" />
          <figcaption>
            {copy.name}
            <span className="wm-fig-note">{copy.nameNote}</span>
          </figcaption>
        </figure>
      </div>
      <ul className="wm-legend" aria-hidden="true">
        <li>
          <span className="wm-key wm-key-line" />
          {copy.legend.market}
        </li>
        <li>
          <span className="wm-key wm-key-band" />
          {copy.legend.quote}
        </li>
        <li>
          <span className="wm-key wm-key-sign" />
          {copy.legend.signature}
        </li>
        <li>
          <span className="wm-key wm-key-write" />
          {copy.legend.write}
        </li>
      </ul>
    </>
  );
}
