// pnpm safe:setup [--mint] [--rpc <url>]
//
// Creates the treasury Safe (2-of-3, Desk system §2.2 D11) at the address predicted from the three
// owner addresses and a fixed saltNonce, and writes it to config.safe. With --mint, the deployer
// funds the Safe and each MM with mock tokens (Desk system §4.1 step 2, §8.2). Safe to re-run: an
// existing Safe is kept, and a mint only tops a balance up to its target. T6a Spec, Requirements
// 1-7, with team decision 09-25: the owners come as addresses (an owner's key is never read) and the
// config file keeps its layout.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import protocolKit, {
  getSafeAddressFromDeploymentTx,
} from "@safe-global/protocol-kit";
import type { SafeVersion } from "@safe-global/types-kit";
import { Command } from "commander";
import {
  getAddress,
  isAddress,
  isHex,
  keccak256,
  parseAbi,
  parseUnits,
  stringToHex,
  type Address,
} from "viem";

import {
  account,
  publicClient,
  rpcHost,
  walletClient,
  type SepoliaPublicClient,
} from "./_common/clients.js";
import { repoRoot, requireEnv } from "./_common/env.js";
import { formatAmount, log } from "./_common/log.js";

// protocol-kit 8.0.7 ships ESM but types it as CommonJS: TypeScript finds the Safe class at
// `.default`, while Node's ESM loader returns the class itself. Accept either shape.
type SafeClass = typeof protocolKit.default;
const Safe: SafeClass =
  (protocolKit as Partial<typeof protocolKit>).default ??
  (protocolKit as unknown as SafeClass);

const CONFIG_PATH = resolve(repoRoot, "config/sepolia.json");
// Team decision 09-25: keys do not cross lanes, so the owners are addresses. DEPLOYER_PK is the
// only key this script reads.
const OWNER_VARS = [
  "SAFE_OWNER_1_ADDRESS",
  "SAFE_OWNER_2_ADDRESS",
  "SAFE_OWNER_3_ADDRESS",
] as const;
const THRESHOLD = 2;
// protocol-kit 8.0.7's default version: the canonical Safe v1.4.1 deployment on Sepolia.
const SAFE_VERSION: SafeVersion = "1.4.1";
// T6a Spec Req 3 fixes the saltNonce "desk-demo-1". protocol-kit 8.0.7 takes a uint256 (it calls
// BigInt(saltNonce), which throws on that string), so the nonce is keccak256 of the label. Team
// decision 09-26 pins this exact value, passed as a hex string that protocol-kit reads with BigInt:
// a JavaScript number would round it and move the Safe's address.
const SALT_LABEL = "desk-demo-1";
const SALT_NONCE =
  "0xca3fc9b156f9e611c604031881d00d1e48ea507bcef0f429ede93ff25a4f3440";
if (keccak256(stringToHex(SALT_LABEL)) !== SALT_NONCE) {
  throw new Error(`saltNonce is not keccak256("${SALT_LABEL}")`);
}
// T6a Spec Req 4: each MM's targets, in whole tokens.
const MM_WETH = "100";
const MM_USDC = "400000";

const erc20 = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function mint(address to, uint256 amount)",
]);

// The config/sepolia.json fields this script reads (Desk system §8.0).
type Config = {
  chainId: number;
  safe: string;
  tokens: { weth: string; usdc: string };
  desk: {
    baseDecimals: number;
    quoteDecimals: number;
    shipWeth: string;
    shipUsdc: string;
  };
  mms: { name: string; address: string }[];
};

type Ctx = {
  rpcUrl: string;
  client: SepoliaPublicClient;
  cfg: Config;
};
type TokenKey = "weth" | "usdc";
type Token = {
  key: TokenKey;
  symbol: string;
  address: Address;
  decimals: number;
};
type Holder = {
  label: string;
  address: Address;
  target: Record<TokenKey, bigint>;
};

// The `"safe": "<value>"` entry that the script rewrites in place.
const SAFE_ENTRY = /("safe"\s*:\s*")[^"]*(")/g;

// The file must hold exactly one such entry, or the in-place write below cannot be trusted.
function checkSafeEntry(text: string): void {
  const found = [...text.matchAll(SAFE_ENTRY)].length;
  if (found !== 1) {
    throw new Error(
      `config/sepolia.json must hold exactly one "safe": "<address or empty>" entry (found ${found})`,
    );
  }
}

// Values are read by parsing; the file is checked before any transaction is sent.
function readConfig(): Config {
  const text = readFileSync(CONFIG_PATH, "utf8");
  checkSafeEntry(text);
  return JSON.parse(text) as Config;
}

// T6a Spec Req 6 with team decision 09-25: replace only the `safe` value in the file's text and
// keep every other byte, so the file's line layout stays. Parsing the result confirms that the
// top-level `safe` is the only value that changed.
function writeConfigSafe(safe: Address): void {
  const text = readFileSync(CONFIG_PATH, "utf8");
  checkSafeEntry(text);
  const updated = text.replace(
    SAFE_ENTRY,
    (_entry, open: string, close: string) => `${open}${safe}${close}`,
  );
  const before = JSON.parse(text) as Record<string, unknown>;
  const after = JSON.parse(updated) as Record<string, unknown>;
  if (
    after.safe !== safe ||
    JSON.stringify({ ...after, safe: before.safe }) !== JSON.stringify(before)
  ) {
    throw new Error(
      `config/sepolia.json: the "safe" entry is not the top-level safe key; the file is left as it is`,
    );
  }
  writeFileSync(CONFIG_PATH, updated);
  log.info(`Wrote config/sepolia.json: safe = ${safe}`);
}

// The owners from .env, checksummed. The error names the variable, never its value: a key pasted
// into an address variable by mistake must not reach the terminal.
function ownerAddresses(env: Record<(typeof OWNER_VARS)[number], string>) {
  const owners: Address[] = [];
  for (const name of OWNER_VARS) {
    if (!isAddress(env[name])) {
      throw new Error(
        `${name} is not an address (0x and 40 hex characters; a mixed-case address needs a valid checksum)`,
      );
    }
    const owner = getAddress(env[name]);
    const earlier = owners.indexOf(owner);
    if (earlier !== -1) {
      throw new Error(
        `${name} repeats ${OWNER_VARS[earlier]}: the three owners must be distinct`,
      );
    }
    owners.push(owner);
  }
  return owners;
}

function configAddress(value: string, key: string): Address {
  try {
    return getAddress(value);
  } catch {
    throw new Error(`config/sepolia.json ${key} is not an address: "${value}"`);
  }
}

async function hasCode(ctx: Ctx, address: Address): Promise<boolean> {
  const code = await ctx.client.getCode({ address });
  return code !== undefined && code !== "0x";
}

// T6a Spec Req 3. Returns the treasury Safe's address.
async function ensureSafe(ctx: Ctx, owners: Address[]): Promise<Address> {
  log.step("Safe");
  const kit = await Safe.init({
    provider: ctx.rpcUrl,
    predictedSafe: {
      safeAccountConfig: { owners, threshold: THRESHOLD },
      safeDeploymentConfig: {
        saltNonce: SALT_NONCE,
        safeVersion: SAFE_VERSION,
      },
    },
  });
  const predicted = getAddress(await kit.getAddress());
  log.kv(
    "Predicted",
    `${predicted} (Safe v${SAFE_VERSION}, saltNonce keccak256("${SALT_LABEL}"))`,
  );

  const configured = ctx.cfg.safe
    ? configAddress(ctx.cfg.safe, "safe")
    : undefined;
  if (configured && (await hasCode(ctx, configured))) {
    log.info(`Safe exists at ${configured} (config.safe): not deploying`);
    if (configured !== predicted) {
      log.warn(
        `config.safe is not the Safe that the owner addresses and saltNonce predict (${predicted})`,
      );
    }
    return configured;
  }
  if (configured && configured !== predicted) {
    // Someone may already point ENS roles or funds at config.safe: never replace it silently.
    throw new Error(
      `config.safe ${configured} has no code on this chain, and the owner addresses and saltNonce ` +
        `predict ${predicted}. Not deploying, and config.safe is left as it is. To make ` +
        `${predicted} the treasury, set "safe": "" in config/sepolia.json and re-run. ` +
        `Otherwise check SAFE_OWNER_1_ADDRESS..SAFE_OWNER_3_ADDRESS and the RPC.`,
    );
  }

  if (!configured && (await hasCode(ctx, predicted))) {
    log.info(
      `Safe exists at ${predicted} (the predicted address): not deploying`,
    );
  } else {
    if (configured) {
      log.info(
        `config.safe has no code on this chain: deploying it again with the same saltNonce`,
      );
    }
    const tx = await kit.createSafeDeploymentTransaction();
    if (!isHex(tx.data)) throw new Error("Safe deployment data is not hex");
    const deployer = walletClient(ctx.rpcUrl, "DEPLOYER_PK");
    const hash = await deployer.sendTransaction({
      to: getAddress(tx.to),
      data: tx.data,
      value: BigInt(tx.value),
    });
    const receipt = await ctx.client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error(`Safe deployment reverted (tx ${hash})`);
    }
    const deployed = getAddress(
      getSafeAddressFromDeploymentTx(receipt, SAFE_VERSION),
    );
    if (deployed !== predicted) {
      throw new Error(
        `Safe deployed at ${deployed}, not at the predicted ${predicted} (tx ${hash})`,
      );
    }
    log.info(
      `Deployed the Safe at ${deployed} (tx ${hash}, block ${receipt.blockNumber})`,
    );
  }
  if (ctx.cfg.safe !== predicted) writeConfigSafe(predicted);
  return predicted;
}

// A mock token from config.tokens, with its decimals checked against config.desk.
async function readToken(ctx: Ctx, key: TokenKey): Promise<Token | undefined> {
  if (!ctx.cfg.tokens[key]) return undefined;
  const address = configAddress(ctx.cfg.tokens[key], `tokens.${key}`);
  const [symbol, decimalsKey] =
    key === "weth"
      ? (["WETH", "baseDecimals"] as const)
      : (["USDC", "quoteDecimals"] as const);
  const decimals = await ctx.client.readContract({
    address,
    abi: erc20,
    functionName: "decimals",
  });
  if (decimals !== ctx.cfg.desk[decimalsKey]) {
    throw new Error(
      `tokens.${key} ${address} has ${decimals} decimals, but desk.${decimalsKey} is ${ctx.cfg.desk[decimalsKey]}`,
    );
  }
  return { key, symbol, address, decimals };
}

function balanceOf(ctx: Ctx, token: Token, holder: Address): Promise<bigint> {
  return ctx.client.readContract({
    address: token.address,
    abi: erc20,
    functionName: "balanceOf",
    args: [holder],
  });
}

// T6a Spec Req 4. A balance below its target gets exactly the shortfall, so it lands on the target;
// a balance at or above its target is skipped. A second run therefore mints nothing.
async function mint(ctx: Ctx, tokens: Token[], holders: Holder[]) {
  log.step("Mint (--mint)");
  const deployer = walletClient(ctx.rpcUrl, "DEPLOYER_PK");
  for (const holder of holders) {
    for (const token of tokens) {
      const target = holder.target[token.key];
      const balance = await balanceOf(ctx, token, holder.address);
      const line = `${holder.label.padEnd(32)} ${token.symbol}`;
      const fmt = (value: bigint) => formatAmount(value, token.decimals);
      if (balance >= target) {
        log.info(
          `${line}  skip: balance ${fmt(balance)} meets the target ${fmt(target)}`,
        );
        continue;
      }
      const amount = target - balance;
      const hash = await deployer.writeContract({
        address: token.address,
        abi: erc20,
        functionName: "mint",
        args: [holder.address, amount],
      });
      const receipt = await ctx.client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error(`mint reverted (tx ${hash})`);
      }
      log.info(
        `${line}  minted ${fmt(amount)} to reach ${fmt(target)} (tx ${hash})`,
      );
    }
  }
}

// T6a Spec Req 5.
async function summary(
  ctx: Ctx,
  safe: Address,
  owners: Address[],
  tokens: Token[],
  holders: Holder[],
) {
  log.step("Summary");
  const kit = await Safe.init({ provider: ctx.rpcUrl, safeAddress: safe });
  const onChainOwners = (await kit.getOwners()).map((o) => getAddress(o));
  const threshold = await kit.getThreshold();
  log.kv("Safe", safe);
  onChainOwners.forEach((owner, i) => log.kv(i === 0 ? "Owners" : "", owner));
  log.kv("Threshold", `${threshold} of ${onChainOwners.length}`);
  const sameOwners =
    onChainOwners.length === owners.length &&
    owners.every((o) => onChainOwners.includes(o));
  if (!sameOwners || threshold !== THRESHOLD) {
    log.warn(
      `expected the owners in SAFE_OWNER_1_ADDRESS..SAFE_OWNER_3_ADDRESS with threshold ${THRESHOLD}`,
    );
  }
  if (tokens.length === 0) {
    log.kv("Balances", "not read: tokens.weth and tokens.usdc are not set");
    return;
  }
  for (const [i, holder] of holders.entries()) {
    const cells: string[] = [];
    for (const token of tokens) {
      const balance = await balanceOf(ctx, token, holder.address);
      cells.push(
        `${formatAmount(balance, token.decimals).padStart(9)} ${token.symbol}`,
      );
    }
    log.kv(
      i === 0 ? "Balances" : "",
      `${holder.label.padEnd(32)} ${holder.address} ${cells.join(" ")}`,
    );
  }
}

async function main(): Promise<void> {
  const opts = new Command()
    .name("safe:setup")
    .description(
      "Create the 2-of-3 treasury Safe and fund it and the MMs with mock tokens (Desk system §8.2).",
    )
    .option(
      "--mint",
      "mint mock WETH and USDC up to their targets: desk.shipWeth and desk.shipUsdc to the Safe, 100 WETH and 400,000 USDC to each MM",
    )
    .option("--rpc <url>", "RPC URL (default: SEPOLIA_RPC_URL from .env)")
    .parse()
    .opts<{ mint?: boolean; rpc?: string }>();

  // T6a Spec Req 2 and 7 with team decision 09-25: DEPLOYER_PK is the only key, and the owners are
  // addresses. Stop before any RPC call if one is missing or malformed.
  const env = requireEnv("DEPLOYER_PK", ...OWNER_VARS);
  const owners = ownerAddresses(env);
  const rpcUrl = opts.rpc ?? requireEnv("SEPOLIA_RPC_URL").SEPOLIA_RPC_URL;
  const deployer = account("DEPLOYER_PK").address;
  const cfg = readConfig();

  log.step("Safe setup");
  log.kv(
    "RPC",
    `${rpcHost(rpcUrl)} (from ${opts.rpc ? "--rpc" : "SEPOLIA_RPC_URL"})`,
  );
  const ctx: Ctx = { rpcUrl, client: publicClient(rpcUrl), cfg };
  const chainId = await ctx.client.getChainId();
  if (chainId !== cfg.chainId) {
    throw new Error(
      `the RPC is on chain ${chainId}, but config/sepolia.json chainId is ${cfg.chainId}`,
    );
  }
  log.kv("Chain", String(chainId));
  log.kv("Deployer", deployer);
  owners.forEach((owner, i) =>
    log.kv(i === 0 ? "Owners" : "", `${owner} (${OWNER_VARS[i]})`),
  );

  // Check the rest of the config before sending any transaction.
  const weth = await readToken(ctx, "weth");
  const usdc = await readToken(ctx, "usdc");
  const tokens = weth && usdc ? [weth, usdc] : [];
  if (opts.mint && tokens.length === 0) {
    throw new Error(
      "--mint needs tokens.weth and tokens.usdc in config/sepolia.json (the mocks, deployed by T4)",
    );
  }
  for (const token of tokens) {
    log.kv(token.symbol, `${token.address} (${token.decimals} decimals)`);
  }
  const mms: { label: string; address: Address }[] = [];
  cfg.mms.forEach((mm, i) => {
    if (!mm.address) {
      log.kv(i === 0 ? "MMs" : "", `${mm.name} (no address: skipped)`);
      return;
    }
    const address = configAddress(mm.address, `mms[${i}].address`);
    mms.push({ label: mm.name, address });
    log.kv(i === 0 ? "MMs" : "", `${mm.name} ${address}`);
  });

  const safeTarget = {
    weth: BigInt(cfg.desk.shipWeth),
    usdc: BigInt(cfg.desk.shipUsdc),
  };

  const safe = await ensureSafe(ctx, owners);

  const holders: Holder[] = [
    { label: "Safe", address: safe, target: safeTarget },
  ];
  if (weth && usdc) {
    for (const mm of mms) {
      holders.push({
        ...mm,
        target: {
          weth: parseUnits(MM_WETH, weth.decimals),
          usdc: parseUnits(MM_USDC, usdc.decimals),
        },
      });
    }
  }
  if (opts.mint) await mint(ctx, tokens, holders);
  await summary(ctx, safe, owners, tokens, holders);
}

main().catch((error: unknown) => {
  log.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
