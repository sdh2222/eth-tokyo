// .env loading for the scripts and the bot (T6a, T6b, T7). Keys live only in the repo-root .env
// (Desk security SEC-03). Never print or write a value read here: it may be a private key.
import { resolve } from "node:path";

import { config } from "dotenv";

/** The repository root. This file is ts/src/scripts/_common/env.ts (dist/ has the same depth). */
export const repoRoot = resolve(import.meta.dirname, "../../../..");

/** The one .env file, at the repository root, whatever the working directory (`pnpm -C ts` runs in ts/). */
export const envPath = resolve(repoRoot, ".env");

let loaded = false;

/** Loads .env into process.env once. A variable already set in the shell wins (dotenv's default). */
export function loadEnv(): void {
  if (loaded) return;
  config({ path: envPath, quiet: true });
  loaded = true;
}

/**
 * Returns the named variables. Throws before anything else happens if any is missing or empty,
 * naming each missing variable (never a value).
 */
export function requireEnv<const K extends string>(
  ...names: K[]
): Record<K, string> {
  loadEnv();
  const values = {} as Record<K, string>;
  const missing: string[] = [];
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) values[name] = value;
    else missing.push(name);
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(", ")}: set it in ${envPath} (see .env.example)`,
    );
  }
  return values;
}
