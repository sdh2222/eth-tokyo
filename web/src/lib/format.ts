const WAD = 10n ** 18n;

function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function truncFixed(amount: bigint, tokenDecimals: number, displayDecimals: number): string {
  const scale = 10n ** BigInt(tokenDecimals - displayDecimals);
  const truncated = amount / scale;
  const negative = truncated < 0n;
  const abs = negative ? -truncated : truncated;
  const digits = abs.toString().padStart(displayDecimals + 1, "0");
  const whole = digits.slice(0, digits.length - displayDecimals);
  const frac = digits.slice(digits.length - displayDecimals);
  return `${negative ? "-" : ""}${group(whole)}.${frac}`;
}

export function formatUsdc(baseUnits: bigint): string {
  return `${truncFixed(baseUnits, 6, 2)} USDC`;
}

export function formatWeth(wei: bigint): string {
  return `${truncFixed(wei, 18, 4)} WETH`;
}

export function formatWethFull(wei: bigint): string {
  return `${truncFixed(wei, 18, 18)} WETH`;
}

export function formatPrice(wad: bigint): string {
  return truncFixed(wad, 18, 2);
}

export function formatUsd(wad: bigint): string {
  return `$${formatPrice(wad)}`;
}

export function formatBps(bps: number): string {
  return `${bps} bps`;
}

export function formatBpsPct(bps: number): string {
  const negative = bps < 0;
  const abs = negative ? -bps : bps;
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${frac}%`;
}

export function formatShare(wWad: bigint): string {
  const thousandths = (wWad * 1000n) / WAD;
  const negative = thousandths < 0n;
  const abs = negative ? -thousandths : thousandths;
  return `${negative ? "-" : ""}${group((abs / 10n).toString())}.${abs % 10n}%`;
}

export function formatSkewBps(kappaBps: number, wWad: bigint, targetWad: bigint): string {
  const bps = (BigInt(kappaBps) * (wWad - targetWad)) / WAD;
  return `${bps} bps`;
}

export function formatVsMidBps(priceWad: bigint, midWad: bigint): bigint {
  if (midWad === 0n) {
    throw new Error("mid is zero");
  }
  return ((priceWad - midWad) * 10000n) / midWad;
}

function shortId(value: string): string {
  if (value.length < 10) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatAddr(address: string): string {
  return shortId(address);
}

export function formatHash(hash: string): string {
  return shortId(hash);
}
