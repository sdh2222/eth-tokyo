// viem clients for the scripts and the bot: one public client per RPC URL, one wallet client per
// key name in .env. A key stays inside its viem account object; only its address may be printed
// (Desk security SEC-03, SEC-05).
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type HttpTransport,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { requireEnv } from "./env.js";

/** The desk runs on Sepolia, or on an anvil fork of it started with --chain-id 11155111. */
export const chain = sepolia;

export type SepoliaPublicClient = PublicClient<HttpTransport, typeof sepolia>;
export type SepoliaWalletClient = WalletClient<
  HttpTransport,
  typeof sepolia,
  PrivateKeyAccount
>;

export function publicClient(rpcUrl: string): SepoliaPublicClient {
  return createPublicClient({ chain, transport: http(rpcUrl) });
}

/** The account of a key variable in .env, e.g. account("DEPLOYER_PK"). */
export function account(keyName: string): PrivateKeyAccount {
  const key: Hex = `0x${requireEnv(keyName)[keyName].replace(/^0x/, "")}`;
  // Check the format here: viem's own error for a bad key prints the key's value.
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(`${keyName} is not a 32-byte hex private key`);
  }
  try {
    return privateKeyToAccount(key);
  } catch {
    throw new Error(`${keyName} is not a valid secp256k1 private key`);
  }
}

/** A wallet client that signs locally with the key in .env under `keyName`. */
export function walletClient(
  rpcUrl: string,
  keyName: string,
): SepoliaWalletClient {
  return createWalletClient({
    account: account(keyName),
    chain,
    transport: http(rpcUrl),
  });
}

/** The RPC host for log lines. The path and query are dropped: provider API keys often sit there. */
export function rpcHost(rpcUrl: string): string {
  return new URL(rpcUrl).host;
}
