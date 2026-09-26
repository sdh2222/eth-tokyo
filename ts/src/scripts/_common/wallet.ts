import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { Hex } from "viem";

/** The label's key in ~/.aqua-eth-tokyo/wallets.txt. Callers must not print it. */
export function keyForLabel(label: string): Hex {
  const path = join(homedir(), ".aqua-eth-tokyo", "wallets.txt");
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === label);
  if (start < 0) throw new Error(`${label} label is missing from the wallet file`);
  const keyLine = lines
    .slice(start, start + 8)
    .find((line) => line.startsWith("Private key:"));
  if (!keyLine) throw new Error(`${label} private key line is missing`);
  const key = keyLine.slice("Private key:".length).trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(`${label} key is not a 32-byte hex private key`);
  }
  return key as Hex;
}

/** The label's account. The key is not printed. */
export function accountForLabel(label: string): PrivateKeyAccount {
  return privateKeyToAccount(keyForLabel(label));
}
