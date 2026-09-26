// The app's background texture: a halftone of soft water bands, drawn as dots on a square
// grid whose radius follows the tone (the particle size the team pointed at). Light blue dots on a
// transparent ground, strongest top right, gone on the left third and toward the bottom, so
// titles and cards never sit on dense dots.
//
//   node web/scripts/halftone-bg.mjs --out=web/public/app/halftone.svg
//
// Options: --width=1600 --height=720 (CSS px) --grid=8 (px between dot centres)
//          --color=#cce6f2 --max=0.36 (largest radius as a share of the grid)

import { writeFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);

const W = Number(args.width ?? 1600);
const H = Number(args.height ?? 720);
const G = Number(args.grid ?? 8);
const COLOR = args.color ?? "#cce6f2";
const RMAX = G * Number(args.max ?? 0.36);
const OUT = args.out ?? "halftone.svg";

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const band = (v, centre, width) => Math.exp(-(((v - centre) / width) ** 2));

// Tone in 0..1 at (u, v), both 0..1 across the picture.
function tone(u, v) {
  const a = band(v, 0.26 + 0.11 * Math.sin(2 * Math.PI * (u * 1.05 + 0.1)), 0.09 + 0.04 * Math.sin(2 * Math.PI * u * 0.8));
  const b = 0.75 * band(v, 0.5 + 0.09 * Math.sin(2 * Math.PI * (u * 0.8 + 0.55)), 0.07);
  const c = 0.5 * band(v, 0.72 + 0.06 * Math.sin(2 * Math.PI * (u * 1.4 + 0.3)), 0.05);
  const across = smooth(0.3, 0.92, u);
  const down = 1 - smooth(0.55, 0.98, v);
  return Math.min(1, Math.max(a, b, c) * across * down);
}

const dots = [];
for (let y = G / 2; y < H; y += G) {
  for (let x = G / 2; x < W; x += G) {
    const r = RMAX * tone(x / W, y / H) ** 0.85;
    if (r < 0.45) continue;
    dots.push(`M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`.replace(/(\.\d{2})\d+/g, "$1"));
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path fill="${COLOR}" d="${dots.join("")}"/></svg>\n`;
writeFileSync(OUT, svg);
console.log(`${OUT}: ${dots.length} dots, ${(svg.length / 1024).toFixed(0)} KB`);
