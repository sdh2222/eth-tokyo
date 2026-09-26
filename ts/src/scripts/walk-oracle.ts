// Moves the mock oracle one dollar per new Sepolia block. The risk-agent key stays in the
// wallet file on this machine. It is not printed and it is not copied into .env.
// contracts/script/MoveOracle.s.sol is a different script: it reads DEPLOYER_PK and fires three prices once.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { loadConfig } from "../lib/config.js";
import { loadEnv, repoRoot } from "./_common/env.js";

export const FLOOR = 3980n * 10n ** 8n;
export const CEILING = 4020n * 10n ** 8n;
export const STEP = 10n ** 8n;

export type Direction = 1n | -1n;

const oracleAbi = parseAbi([
  "function owner() view returns (address)",
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
  "function setAnswer(int256 answer)",
  "function setUpdatedAt(uint256 updatedAt)",
]);

const defaultRpc = "https://ethereum-sepolia-rpc.publicnode.com";

/** One-dollar step inside [3980, 4020]. At a bound the direction flips before the step. */
export function nextAnswer(
  current: bigint,
  direction: Direction,
): { answer: bigint; direction: Direction } {
  let dir: Direction = direction;
  if (current >= CEILING) dir = -1n;
  else if (current <= FLOOR) dir = 1n;
  let answer = current + dir * STEP;
  if (answer > CEILING) {
    dir = -1n;
    answer = current - STEP;
  } else if (answer < FLOOR) {
    dir = 1n;
    answer = current + STEP;
  }
  return { answer, direction: dir };
}

type Flags = { steps?: number; close: boolean; rpc?: string; config: string };

export function parseArgs(argv: string[]): Flags {
  const flags: Flags = { close: false, config: "config/sepolia.json" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") continue;
    else if (arg === "--close") flags.close = true;
    else if (arg === "--steps") flags.steps = Number(argv[++i] ?? "");
    else if (arg === "--rpc") flags.rpc = argv[++i];
    else if (arg === "--config") flags.config = argv[++i] ?? flags.config;
    else throw new Error(`unknown argument ${arg}`);
  }
  if (
    flags.steps !== undefined &&
    (!Number.isInteger(flags.steps) || flags.steps < 0)
  ) {
    throw new Error("--steps wants a non-negative integer");
  }
  return flags;
}

function riskAgentAccount(): PrivateKeyAccount {
  const path = join(homedir(), ".aqua-eth-tokyo", "wallets.txt");
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "risk-agent");
  if (start < 0)
    throw new Error("risk-agent label is missing from the wallet file");
  const keyLine = lines
    .slice(start, start + 8)
    .find((line) => line.startsWith("Private key:"));
  if (!keyLine) throw new Error("risk-agent private key line is missing");
  const key = keyLine.slice("Private key:".length).trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("risk-agent key is not a 32-byte hex private key");
  }
  return privateKeyToAccount(key as Hex);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));
  loadEnv();
  const fromEnv = process.env.SEPOLIA_RPC_URL?.trim();
  const rpc = flags.rpc ?? (fromEnv ? fromEnv : defaultRpc);
  const cfg = loadConfig(
    JSON.parse(readFileSync(join(repoRoot, flags.config), "utf8")),
  );
  const oracle = cfg.oracle;
  if (oracle === "") throw new Error("oracle is unset");
  const account = riskAgentAccount();
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const wallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpc),
  });
  const owner = await client.readContract({
    address: oracle,
    abi: oracleAbi,
    functionName: "owner",
  });
  if (owner.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error("risk-agent is not the oracle owner");
  }
  const balance = await client.getBalance({ address: account.address });
  if (balance === 0n) throw new Error("risk-agent has no ETH for gas");
  console.log(`risk-agent ${account.address} balance ${balance}`);

  let direction: Direction = 1n;
  let seen = await client.getBlockNumber();
  let left = flags.steps;
  while (left === undefined || left > 0) {
    const block = await waitForBlock(client, seen);
    seen = block;
    const current = await readAnswer(client, oracle);
    const next = nextAnswer(current, direction);
    direction = next.direction;
    const hash = await wallet.writeContract({
      address: oracle,
      abi: oracleAbi,
      functionName: "setAnswer",
      args: [next.answer],
      gas: 80_000n,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error(`setAnswer failed: ${hash}`);
    console.log(`block ${block} answer ${next.answer / STEP} tx ${hash}`);
    if (left !== undefined) left -= 1;
  }

  if (flags.close) {
    const block = await client.getBlock();
    const updatedAt = block.timestamp - 601n;
    const hash = await wallet.writeContract({
      address: oracle,
      abi: oracleAbi,
      functionName: "setUpdatedAt",
      args: [updatedAt],
      gas: 50_000n,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error(`setUpdatedAt failed: ${hash}`);
    }
    console.log(`closed updatedAt ${updatedAt} tx ${hash}`);
  }
}

async function readAnswer(
  client: ReturnType<typeof createPublicClient>,
  oracle: Address,
): Promise<bigint> {
  const round = await client.readContract({
    address: oracle,
    abi: oracleAbi,
    functionName: "latestRoundData",
  });
  return round[1];
}

async function waitForBlock(
  client: ReturnType<typeof createPublicClient>,
  seen: bigint,
): Promise<bigint> {
  for (;;) {
    const block = await client.getBlockNumber();
    if (block > seen) return block;
    await sleep(2_000);
  }
}

const isMain = process.argv[1]?.endsWith("walk-oracle.ts");
if (isMain) {
  main().catch((err: unknown) => {
    console.log(err instanceof Error ? err.message : String(err));
    process.exit(2);
  });
}
