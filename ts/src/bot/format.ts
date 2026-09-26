export function formatWeth(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(4);
}

export function formatUsdc(units: bigint): string {
  return (Number(units) / 1e6).toFixed(2);
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatRefusal(title: string, hint: string): string {
  return `✖ ${title} — ${hint}`;
}
