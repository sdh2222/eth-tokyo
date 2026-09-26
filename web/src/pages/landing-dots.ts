// Shared by the landing's live dithers: a fixed blue-noise threshold, so dots hold still
// wherever the picture does not change, and a hex colour packed for an ImageData pixel.

export function packed(hex: string) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
}

// Void-and-cluster blue noise, 64 x 64, built once.
let mask: Float32Array | null = null;
export function blueNoise(): Float32Array {
  if (mask) return mask;
  const size = 64;
  const count = size * size;
  const radius = 6;
  const sigma = 1.5;
  const energy = new Float64Array(count);
  const on = new Uint8Array(count);
  const toggle = (i: number, sign: number) => {
    const px = i % size;
    const py = (i / size) | 0;
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = (px + dx + size) % size;
        const y = (py + dy + size) % size;
        energy[y * size + x]! += sign * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      }
    }
  };
  const extreme = (wantOn: number, pickMax: boolean) => {
    let best = 0;
    let bestE = pickMax ? -Infinity : Infinity;
    for (let i = 0; i < count; i += 1) {
      if (on[i] !== wantOn) continue;
      const e = energy[i]!;
      if (pickMax ? e > bestE : e < bestE) {
        bestE = e;
        best = i;
      }
    }
    return best;
  };
  let seed = 11;
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
  mask = rank.map((r) => (r + 0.5) / count);
  return mask;
}
