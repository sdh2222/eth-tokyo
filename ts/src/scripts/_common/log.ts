// Human-readable console output for the scripts and the bot. Never pass a key or an .env value here.
import { formatUnits } from "viem";

export const log = {
  /** A section heading. */
  step(title: string): void {
    console.log(`\n== ${title}`);
  },
  /** A line inside a section. */
  info(message: string): void {
    console.log(`   ${message}`);
  },
  /** An aligned "label  value" line. */
  kv(label: string, value: string): void {
    console.log(`   ${label.padEnd(10)} ${value}`);
  },
  /** Needs a human's attention but does not stop the run. */
  warn(message: string): void {
    console.warn(`   WARNING: ${message}`);
  },
  /** A fatal error, on stderr. */
  error(message: string): void {
    console.error(`error: ${message}`);
  },
};

/** Base units to a grouped decimal, e.g. 400000000000n with 6 decimals → "400,000". */
export function formatAmount(value: bigint, decimals: number): string {
  const [whole, fraction] = formatUnits(value, decimals).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}
