import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseAbi,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";

import {
  deskRpc,
  loadDeskConfig,
  sendFill,
  type FillDone,
} from "../bot/fill.js";
import { readBook } from "../lib/book.js";
import {
  findLiveStrategy,
  planSetTerms,
  planShip,
  quoteFor,
  type DeskCtx,
} from "../lib/client/index.js";
import { poolAsk, poolBid } from "../lib/counterparty.js";
import { dnsEncode } from "../lib/encode.js";
import { loadEnv, repoRoot } from "./_common/env.js";
import { executeSafeCalls, type SafeCall } from "./_common/safe-send.js";
import { accountForLabel, keyForLabel } from "./_common/wallet.js";

const ROUTER_VERSION = "1.0.2-desk.5";
const PREVIOUS_ROUTER = "0x82b5303b41E0963C10c2fdA2fe5AF3732877204C" as Address;
const POLICY =
  "이미 장부에 있는 상대는 게시된 약정보다 좁은 폭을 받을 수 있다. 크고 처음인 거래는 매도 3 bp, 매수 10 bp에 머문다. 그 약정 밖으로는 호가하지 않는다. 오라클은 움직이지 않는다.";
const FLOOR = 3980n * 10n ** 8n;
const CEILING = 4020n * 10n ** 8n;
const CAP = 50n * 10n ** 18n;

const domainAbi = parseAbi([
  "function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
]);
const oracleAbi = parseAbi([
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
  "function setAnswer(int256)",
  "function setUpdatedAt(uint256)",
]);
const aquaAbi = parseAbi([
  "function dock(address app, bytes32 strategyHash, address[] tokens)",
]);
const textAbi = parseAbi([
  "function setText(bytes name, string key, string value)",
]);

type Scene = "setup" | "trade" | "target" | "stale" | "second-ship";

function scene(): Scene {
  const name = process.argv[2];
  switch (name) {
    case "setup":
    case "trade":
    case "target":
    case "stale":
    case "second-ship":
      return name;
    default:
      throw new Error(
        "demo scene is setup, trade, target, stale, or second-ship",
      );
  }
}

function clientFor(rpc: string) {
  return createPublicClient({ chain: sepolia, transport: http(rpc) });
}

function usd(wad: bigint): string {
  const cents = ((wad < 0n ? -wad : wad) * 100n) / 10n ** 18n;
  const sign = wad < 0n ? "-" : "";
  return `${sign}${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}

async function routerVersion(
  client: ReturnType<typeof clientFor>,
  router: Address,
): Promise<string> {
  try {
    const domain = await client.readContract({
      address: router,
      abi: domainAbi,
      functionName: "eip712Domain",
    });
    return domain[2];
  } catch {
    return "";
  }
}

function writeRouter(address: Address, block: number): void {
  const path = join(repoRoot, "config/sepolia.json");
  const json = JSON.parse(readFileSync(path, "utf8")) as {
    router: string;
    deployBlock: number;
  };
  json.router = address;
  json.deployBlock = block;
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}

function forgeCreate(
  rpc: string,
  key: Hex,
  aqua: Address,
  weth: Address,
  safe: Address,
): Promise<{ address: Address; hash: Hex }> {
  const forge = join(homedir(), ".foundry", "bin", "forge");
  const args = [
    "create",
    "src/DeskRouter.sol:DeskRouter",
    "--rpc-url",
    rpc,
    "--private-key",
    key,
    "--broadcast",
    "--constructor-args",
    aqua,
    weth,
    safe,
    "DeskRouter",
    ROUTER_VERSION,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(forge, args, { cwd: join(repoRoot, "contracts") });
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on("close", (code) => {
      const scrubbed = out.replaceAll(key, "[key]");
      if (code !== 0) {
        reject(new Error(`forge create exited ${code}\n${scrubbed}`));
        return;
      }
      const deployed = scrubbed.match(/Deployed to:\s*(0x[0-9a-fA-F]{40})/);
      const tx = scrubbed.match(/Transaction hash:\s*(0x[0-9a-fA-F]{64})/);
      if (!deployed?.[1] || !tx?.[1]) {
        reject(new Error(`forge create did not print an address\n${scrubbed}`));
        return;
      }
      console.log(scrubbed);
      resolve({ address: deployed[1] as Address, hash: tx[1] as Hex });
    });
  });
}

async function fundMms(
  rpc: string,
  client: ReturnType<typeof clientFor>,
): Promise<void> {
  const agent = accountForLabel("risk-agent");
  const wallet = createWalletClient({
    account: agent,
    chain: sepolia,
    transport: http(rpc),
  });
  const target = parseEther("0.02");
  for (const label of ["mm-a", "mm-b"] as const) {
    const mm = accountForLabel(label);
    const balance = await client.getBalance({ address: mm.address });
    if (balance >= target) {
      console.log(`${label} already has gas`);
      continue;
    }
    const hash = await wallet.sendTransaction({
      to: mm.address,
      value: target - balance,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error(`fund ${label} failed: ${hash}`);
    console.log(`funded ${label} tx ${hash}`);
  }
}

async function openOracle(
  rpc: string,
  client: ReturnType<typeof clientFor>,
  oracle: Address,
): Promise<void> {
  const account = accountForLabel("oracle");
  const wallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpc),
  });
  const round = await client.readContract({
    address: oracle,
    abi: oracleAbi,
    functionName: "latestRoundData",
  });
  const current = round[1];
  const answer =
    current < FLOOR || current > CEILING ? 4000n * 10n ** 8n : current;
  const answerHash = await wallet.writeContract({
    address: oracle,
    abi: oracleAbi,
    functionName: "setAnswer",
    args: [answer],
    gas: 80_000n,
  });
  const answerReceipt = await client.waitForTransactionReceipt({
    hash: answerHash,
  });
  if (answerReceipt.status !== "success")
    throw new Error(`setAnswer failed: ${answerHash}`);
  const block = await client.getBlock();
  const timeHash = await wallet.writeContract({
    address: oracle,
    abi: oracleAbi,
    functionName: "setUpdatedAt",
    args: [block.timestamp],
    gas: 50_000n,
  });
  const timeReceipt = await client.waitForTransactionReceipt({
    hash: timeHash,
  });
  if (timeReceipt.status !== "success")
    throw new Error(`setUpdatedAt failed: ${timeHash}`);
  console.log(
    `oracle answer ${answer} updatedAt ${block.timestamp} tx ${timeHash}`,
  );
}

async function setup(rpc: string): Promise<void> {
  const client = clientFor(rpc);
  await fundMms(rpc, client);
  let cfg = loadDeskConfig();
  if (
    cfg.safe === "" ||
    cfg.tokens.weth === "" ||
    cfg.tokens.usdc === "" ||
    cfg.oracle === "" ||
    cfg.ens.resolver === ""
  ) {
    throw new Error("config is missing an address");
  }
  const weth = cfg.tokens.weth;
  const usdc = cfg.tokens.usdc;
  const resolver = cfg.ens.resolver;
  const safe = cfg.safe;
  const oracle = cfg.oracle;
  const version = await routerVersion(client, cfg.router as Address);
  const oldRouter = cfg.router as Address;
  const oldFrom = cfg.deployBlock;
  if (version !== ROUTER_VERSION) {
    const created = await forgeCreate(
      rpc,
      keyForLabel("risk-agent"),
      cfg.aqua,
      cfg.tokens.weth,
      cfg.safe,
    );
    const receipt = await client.getTransactionReceipt({ hash: created.hash });
    writeRouter(created.address, Number(receipt.blockNumber));
    console.log(`router ${created.address} block ${receipt.blockNumber}`);
    cfg = loadDeskConfig();
  } else {
    console.log(`router ${cfg.router} is already ${ROUTER_VERSION}`);
  }
  const ctx: DeskCtx = { client, cfg };
  const liveNew =
    version === ROUTER_VERSION ? await findLiveStrategy(ctx) : null;
  const book = await readBook(cfg, rpc);
  const termsOk =
    book.terms?.sellBps === 3 &&
    book.terms.buyBps === 10 &&
    book.terms.cap === CAP;
  const calls: SafeCall[] = [];
  if (book.policy !== POLICY) {
    calls.push({
      to: resolver,
      data: encodeFunctionData({
        abi: textAbi,
        functionName: "setText",
        args: [dnsEncode("dao-treasury-a.eth"), "desk.policy", POLICY],
      }),
      value: 0n,
    });
  } else {
    console.log("policy already set");
  }
  if (!termsOk) {
    for (const mm of cfg.mms) {
      if (mm.address === "") continue;
      calls.push(planSetTerms(ctx, mm.name, 3, 10, CAP));
    }
  } else {
    console.log("terms already sell 3 buy 10 cap 50 ETH");
  }
  if (!liveNew) {
    const previous =
      oldRouter.toLowerCase() === PREVIOUS_ROUTER.toLowerCase()
        ? oldRouter
        : PREVIOUS_ROUTER;
    if (previous.toLowerCase() !== String(cfg.router).toLowerCase()) {
      const oldCtx: DeskCtx = {
        client,
        cfg: {
          ...cfg,
          router: previous,
          deployBlock: previous === oldRouter ? oldFrom : 11_784_705,
        },
      };
      const liveOld = await findLiveStrategy(oldCtx);
      if (liveOld) {
        calls.push({
          to: cfg.aqua,
          data: encodeFunctionData({
            abi: aquaAbi,
            functionName: "dock",
            args: [previous, liveOld.strategyHash, [weth, usdc]],
          }),
          value: 0n,
        });
      }
    }
    const shipped = await planShip(ctx, {
      salt: BigInt(Date.now()),
      ttlDays: cfg.desk.strategyTtlDays,
      wethAmt: BigInt(cfg.desk.shipWeth),
      usdcAmt: BigInt(cfg.desk.shipUsdc),
    });
    calls.push(...shipped.txs);
  } else {
    console.log(`strategy ${liveNew.strategyHash} already live`);
  }
  if (calls.length > 0) {
    const hash = await executeSafeCalls({
      rpc,
      safe,
      calls,
      ownerKeys: [keyForLabel("safe-owner-1"), keyForLabel("safe-owner-2")],
      executorKey: keyForLabel("risk-agent"),
    });
    console.log(`safe tx ${hash}`);
  }
  await openOracle(rpc, client, oracle);
}

async function trade(rpc: string): Promise<void> {
  const blocked = await probe(rpc, "1");
  if (blocked === "DeskPriceOracleStale")
    throw new Error("oracle window is closed");
  const first =
    blocked === "DeskPriceTargetReached"
      ? {
          mm: "mm-a" as const,
          side: "sell" as const,
          weth: "1",
          label: "mm-a sells 1 ETH",
          size: 10n ** 18n,
        }
      : {
          mm: "mm-a" as const,
          side: "buy" as const,
          weth: "1",
          label: "mm-a buys 1 ETH",
          size: 10n ** 18n,
        };
  if (blocked === "DeskPriceTargetReached") {
    console.log("desk sell refused: DeskPriceTargetReached");
  } else if (blocked) {
    throw new Error(`1 ETH buy probe returned ${blocked}`);
  }
  const opened = await sendFill({
    rpc,
    mm: first.mm,
    side: first.side,
    weth: first.weth,
  });
  printFill(first.label, first.side, first.size, opened);
  const sold = await sendFill({ rpc, mm: "mm-b", side: "sell", weth: "20" });
  printFill("mm-b sells 20 ETH", "sell", 20n * 10n ** 18n, sold);
}

function printFill(
  label: string,
  side: "buy" | "sell",
  size: bigint,
  done: FillDone,
): void {
  const price = (done.amountIn * 10n ** 30n) / size;
  const paid = side === "buy" ? price : (done.amountOut * 10n ** 30n) / size;
  const pool = side === "buy" ? poolAsk(done.midWad) : poolBid(done.midWad);
  console.log(
    `${label} mid ${usd(done.midWad)} desk ${usd(paid)} pool ${usd(pool)} sell ${done.sellBps} buy ${done.buyBps} tx ${done.hash}`,
  );
  if (side === "buy") {
    console.log(
      `premium over mid ${usd(paid - done.midWad)} cheaper than pool ${usd(pool - paid)}`,
    );
  } else {
    console.log(`discount under mid ${usd(done.midWad - paid)}`);
  }
}

async function probe(rpc: string, weth: string): Promise<string | null> {
  const cfg = loadDeskConfig();
  const client = clientFor(rpc);
  const ctx: DeskCtx = { client, cfg };
  const live = await findLiveStrategy(ctx);
  if (!live) throw new Error("no live strategy");
  const account = accountForLabel("mm-a");
  const named = cfg.mms.find((mm) => mm.name.startsWith("mm-a."));
  if (!named) throw new Error("mm-a is missing from config");
  const quote = await quoteFor(ctx, live, {
    mm: { name: named.name, address: account.address },
    side: "buy",
    leg: "weth",
    amount: BigInt(weth) * 10n ** 18n,
  });
  return quote.ok ? null : quote.error.code;
}

async function target(rpc: string): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const code = await probe(rpc, "50");
    if (code === "DeskPriceTargetReached") {
      console.log("desk sell refused: DeskPriceTargetReached");
      return;
    }
    if (code) throw new Error(`50 ETH probe returned ${code}`);
    const done = await sendFill({ rpc, mm: "mm-a", side: "buy", weth: "50" });
    console.log(`desk sold 50 ETH tx ${done.hash} usdc in ${done.amountIn}`);
  }
  throw new Error("target was not reached");
}

async function stale(rpc: string): Promise<void> {
  const cfg = loadDeskConfig();
  const client = clientFor(rpc);
  if (cfg.oracle === "") throw new Error("oracle is unset");
  const started = Date.now();
  let bench = 3980;
  for (;;) {
    const block = await client.getBlock();
    const round = await client.readContract({
      address: cfg.oracle,
      abi: oracleAbi,
      functionName: "latestRoundData",
    });
    const age = block.timestamp - round[3];
    console.log(`bench ${bench} oracle ${round[1]} age ${age}`);
    bench = bench >= 4020 ? 3980 : bench + 1;
    if (age > 600n) {
      const code = await probe(rpc, "1");
      if (code !== "DeskPriceOracleStale") {
        throw new Error(
          `expected DeskPriceOracleStale, got ${code ?? "a fill"}`,
        );
      }
      console.log("oracle window closed, fill rejected");
      return;
    }
    if (Date.now() - started > 11 * 60 * 1000) {
      throw new Error("oracle window did not close");
    }
    await new Promise((resolve) => setTimeout(resolve, 12_000));
  }
}

function secondShip(rpc: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const result = spawn(
      "pnpm",
      [
        "exec",
        "tsx",
        "src/scripts/ship.ts",
        "--rpc",
        rpc,
        "--config",
        "config/sepolia.json",
      ],
      { cwd: join(repoRoot, "ts"), stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    result.stdout?.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    result.stderr?.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    result.on("close", (code) => {
      process.stdout.write(out);
      if (code !== 1 || !out.includes("a strategy is live")) {
        reject(new Error(`second ship exit ${code}`));
        return;
      }
      console.log("second ship refused");
      resolve();
    });
  });
}

async function main(): Promise<void> {
  loadEnv();
  const rpc = deskRpc(
    process.argv.includes("--rpc")
      ? process.argv[process.argv.indexOf("--rpc") + 1]
      : undefined,
  );
  const name = scene();
  switch (name) {
    case "setup":
      await setup(rpc);
      return;
    case "trade":
      await trade(rpc);
      return;
    case "target":
      await target(rpc);
      return;
    case "stale":
      await stale(rpc);
      return;
    case "second-ship":
      await secondShip(rpc);
      return;
    default: {
      const neverScene: never = name;
      throw new Error(neverScene);
    }
  }
}

const isMain = process.argv[1]?.endsWith("demo.ts");
if (isMain) {
  main().catch((err: unknown) => {
    console.log(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
