// Turns a source picture into the landing's dither: dots in one colour on a transparent
// ground, so the page's white shows through. One method per picture (DIT-02).
//
// A still:   node web/scripts/landing-dither.mjs --src=hero.png --out=hero-dither.png
// Frames:    node web/scripts/landing-dither.mjs --src=frames/ --out=hero-dither.png
//            (a folder of numbered PNG frames, for example from `ffmpeg -i clip.mp4 frames/%03d.png`,
//            becomes one looping animated PNG)
//
// Options: --width=1600 (CSS px) --dot=2 (CSS px per dot) --method=atkinson|bayer|stipple|blue
//          --color=#6ec1ea --gamma=1 --contrast=1 --floor=0 --fade=0 --fps=8
//          --invert (dots for light instead of dark)
//          --fade=0.25 thins the dots out over the bottom quarter, so the picture ends softly.
//
// For frames, use a fixed threshold (blue, bayer or stipple). Atkinson carries error from dot
// to dot, so a small change anywhere reshuffles the dots everywhere and the picture boils.
// --floor clears coverage under that value to white, which keeps the clean cloud edges that
// Atkinson gives without its flicker.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);

if (!args.src || !args.out) {
  console.error("usage: --src=<png or folder of pngs> --out=<png>");
  process.exit(1);
}

const WIDTH = Number(args.width ?? 1600);
const DOT = Number(args.dot ?? 2);
const METHOD = args.method ?? "atkinson";
const COLOR = hexToRgb(args.color ?? "#6ec1ea");
const GAMMA = Number(args.gamma ?? 1);
const CONTRAST = Number(args.contrast ?? 1);
const FPS = Number(args.fps ?? 8);
const INVERT = args.invert === "true";
const FLOOR = Number(args.floor ?? 0);
const FADE = Number(args.fade ?? 0);

function hexToRgb(hex) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ---------- PNG decode (8-bit grey, grey+alpha, RGB, RGBA; not interlaced) ----------

function decodePng(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error("only 8-bit, non-interlaced PNG");
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported PNG colour type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? out[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[x] = v & 255;
    }
  }
  // Luminance 0..1, with transparent pixels read as white.
  const lum = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const p = i * channels;
    let l;
    let alpha = 1;
    if (channels <= 2) {
      l = pixels[p] / 255;
      if (channels === 2) alpha = pixels[p + 1] / 255;
    } else {
      l = (0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]) / 255;
      if (channels === 4) alpha = pixels[p + 3] / 255;
    }
    lum[i] = l * alpha + (1 - alpha);
  }
  return { width, height, lum };
}

// Box-filter resize to the dot grid, then turn luminance into ink coverage.
function toCoverage({ width, height, lum }, cols, rows) {
  const out = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y += 1) {
    const y0 = Math.floor((y * height) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / rows));
    for (let x = 0; x < cols; x += 1) {
      const x0 = Math.floor((x * width) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / cols));
      let sum = 0;
      for (let yy = y0; yy < y1; yy += 1) for (let xx = x0; xx < x1; xx += 1) sum += lum[yy * width + xx];
      let v = sum / ((y1 - y0) * (x1 - x0));
      v = INVERT ? v : 1 - v;
      v = Math.min(1, Math.max(0, (v - 0.5) * CONTRAST + 0.5));
      v = v ** GAMMA;
      if (FADE > 0) {
        const t = Math.min(1, (rows - 1 - y) / (FADE * rows));
        v *= t * t * (3 - 2 * t);
      }
      out[y * cols + x] = v < FLOOR ? 0 : v;
    }
  }
  return out;
}

// ---------- methods ----------

function atkinson(cov, cols, rows) {
  const err = Float32Array.from(cov);
  const bits = new Uint8Array(cols * rows);
  const spread = [
    [1, 0],
    [2, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
    [0, 2],
  ];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const i = y * cols + x;
      const on = err[i] >= 0.5 ? 1 : 0;
      bits[i] = on;
      const e = (err[i] - on) / 8;
      for (const [dx, dy] of spread) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < cols && ny < rows) err[ny * cols + nx] += e;
      }
    }
  }
  return bits;
}

function bayerMatrix(n) {
  let m = [[0]];
  while (m.length < n) {
    const s = m.length;
    const next = Array.from({ length: s * 2 }, () => new Array(s * 2).fill(0));
    for (let y = 0; y < s; y += 1) {
      for (let x = 0; x < s; x += 1) {
        const v = m[y][x] * 4;
        next[y][x] = v;
        next[y][x + s] = v + 2;
        next[y + s][x] = v + 3;
        next[y + s][x + s] = v + 1;
      }
    }
    m = next;
  }
  return m.map((row) => row.map((v) => (v + 0.5) / (n * n)));
}

function bayer(cov, cols, rows) {
  const m = bayerMatrix(8);
  const bits = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) bits[y * cols + x] = cov[y * cols + x] > m[y % 8][x % 8] ? 1 : 0;
  }
  return bits;
}

// Interleaved gradient noise: a fixed, even scatter with no grid pattern.
function stipple(cov, cols, rows) {
  const bits = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const t = (52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1)) % 1;
      bits[y * cols + x] = cov[y * cols + x] > t ? 1 : 0;
    }
  }
  return bits;
}

// Void-and-cluster blue noise: an even scatter with no visible grid or diagonal.
function blueNoiseMask(size, sigma) {
  const count = size * size;
  const kernel = new Float64Array(count);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = Math.min(x, size - x);
      const dy = Math.min(y, size - y);
      kernel[y * size + x] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
  }
  const energy = new Float64Array(count);
  const on = new Uint8Array(count);
  const toggle = (i, sign) => {
    const px = i % size;
    const py = (i / size) | 0;
    for (let y = 0; y < size; y += 1) {
      const ky = ((y - py + size) % size) * size;
      for (let x = 0; x < size; x += 1) energy[y * size + x] += sign * kernel[ky + ((x - px + size) % size)];
    }
  };
  const extreme = (wantOn, pickMax) => {
    let best = -1;
    let bestE = pickMax ? -Infinity : Infinity;
    for (let i = 0; i < count; i += 1) {
      if (on[i] !== wantOn) continue;
      if (pickMax ? energy[i] > bestE : energy[i] < bestE) {
        bestE = energy[i];
        best = i;
      }
    }
    return best;
  };
  let seed = 7;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const initial = Math.floor(count / 10);
  for (let placed = 0; placed < initial; ) {
    const i = Math.floor(rand() * count);
    if (on[i]) continue;
    on[i] = 1;
    toggle(i, 1);
    placed += 1;
  }
  for (;;) {
    const cluster = extreme(1, true);
    on[cluster] = 0;
    toggle(cluster, -1);
    const gap = extreme(0, false);
    on[gap] = 1;
    toggle(gap, 1);
    if (gap === cluster) break;
  }
  const rank = new Float32Array(count);
  const start = Uint8Array.from(on);
  const startEnergy = Float64Array.from(energy);
  for (let r = initial - 1; r >= 0; r -= 1) {
    const cluster = extreme(1, true);
    on[cluster] = 0;
    toggle(cluster, -1);
    rank[cluster] = r;
  }
  on.set(start);
  energy.set(startEnergy);
  for (let r = initial; r < count; r += 1) {
    const gap = extreme(0, false);
    on[gap] = 1;
    toggle(gap, 1);
    rank[gap] = r;
  }
  return rank.map((r) => (r + 0.5) / count);
}

let blueMask = null;
function blue(cov, cols, rows) {
  const size = 64;
  blueMask ??= blueNoiseMask(size, 1.5);
  const bits = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      bits[y * cols + x] = cov[y * cols + x] > blueMask[(y % size) * size + (x % size)] ? 1 : 0;
    }
  }
  return bits;
}

const METHODS = { atkinson, bayer, stipple, blue };

// ---------- PNG / APNG encode (1-bit palette, index 0 transparent) ----------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function packRows(bits, cols, rows) {
  const w = cols * DOT;
  const h = rows * DOT;
  const stride = Math.ceil(w / 8);
  const raw = Buffer.alloc((1 + stride) * h);
  for (let y = 0; y < h; y += 1) {
    const row = y * (1 + stride);
    const cy = Math.floor(y / DOT);
    for (let x = 0; x < w; x += 1) {
      if (bits[cy * cols + Math.floor(x / DOT)]) raw[row + 1 + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return deflateSync(raw, { level: 9 });
}

function encode(frames, cols, rows) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cols * DOT, 0);
  ihdr.writeUInt32BE(rows * DOT, 4);
  ihdr[8] = 1;
  ihdr[9] = 3;
  const parts = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("PLTE", Buffer.from([255, 255, 255, ...COLOR])),
    chunk("tRNS", Buffer.from([0])),
  ];
  if (frames.length === 1) {
    parts.push(chunk("IDAT", packRows(frames[0], cols, rows)));
  } else {
    const actl = Buffer.alloc(8);
    actl.writeUInt32BE(frames.length, 0);
    parts.push(chunk("acTL", actl));
    let seq = 0;
    frames.forEach((bits, index) => {
      const fctl = Buffer.alloc(26);
      fctl.writeUInt32BE(seq++, 0);
      fctl.writeUInt32BE(cols * DOT, 4);
      fctl.writeUInt32BE(rows * DOT, 8);
      fctl.writeUInt16BE(1, 20);
      fctl.writeUInt16BE(FPS, 22);
      parts.push(chunk("fcTL", fctl));
      const data = packRows(bits, cols, rows);
      if (index === 0) {
        parts.push(chunk("IDAT", data));
      } else {
        const seqBuf = Buffer.alloc(4);
        seqBuf.writeUInt32BE(seq++, 0);
        parts.push(chunk("fdAT", Buffer.concat([seqBuf, data])));
      }
    });
  }
  parts.push(chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}

// ---------- run ----------

const sources = statSync(args.src).isDirectory()
  ? readdirSync(args.src)
      .filter((name) => name.toLowerCase().endsWith(".png"))
      .sort()
      .map((name) => join(args.src, name))
  : [args.src];

const method = METHODS[METHOD];
if (!method) throw new Error(`unknown method ${METHOD}`);

const cols = Math.round(WIDTH / DOT);
let rows = 0;
const frames = sources.map((file) => {
  const image = decodePng(readFileSync(file));
  rows ||= Math.round((cols * image.height) / image.width);
  return method(toCoverage(image, cols, rows), cols, rows);
});

mkdirSync(dirname(args.out), { recursive: true });
const png = encode(frames, cols, rows);
writeFileSync(args.out, png);
console.log(
  `${args.out} ${cols * DOT}x${rows * DOT} ${frames.length} frame(s) ${METHOD} ${(png.length / 1024).toFixed(0)} KB`,
);
