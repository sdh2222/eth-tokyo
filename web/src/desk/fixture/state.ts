import { ERRORS } from "../../copy/errors";
import { CLIENT_SUFFIX, clientName } from "../../ens/names";
import { formatWhen } from "../../lib/time";
import type { DeskPort } from "../port";
import type {
  Address,
  DeskConfig,
  DeskError,
  DeskState,
  FillRecord,
  Hex,
  PreviewPoint,
  QuoteInput,
  QuoteResult,
  ShipInput,
  StrategyInfo,
} from "../types";
import sepoliaConfig from "@config";
import { recomputeFill } from "../verify";
import curveFile from "./preview-curve.json";
import { CAP_MM_A, FILL_CAP_WETH, lookupQuote } from "./quotes";

export const NOW = 1790337600;

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const OWNER1 = "0x0000000000000000000000000000000000000001" as Address;
const OWNER2 = "0x0000000000000000000000000000000000000002" as Address;
const OWNER3 = "0x0000000000000000000000000000000000000003" as Address;
const WAD = 10n ** 18n;
const MM_A = "0x0000000000000000000000000000000000000005" as Address;
const MM_B = "0x0000000000000000000000000000000000000006" as Address;
const MM_C = "0x0000000000000000000000000000000000000007" as Address;
const MM_X = "0x0000000000000000000000000000000000000008" as Address;
const OUTSIDER = "0x0000000000000000000000000000000000000009" as Address;
const HASH = `0x${"11".repeat(32)}` as Hex;
const MAX = 2n ** 256n - 1n;
const WETH_BAL = 900000000000000000000n;
const USDC_BAL = 400000000000n;
const DEADLINE = 1792926000;

type Memory = {
  block: bigint;
  live: StrategyInfo | null;
  multi: boolean;
  oracleUpdatedAt: number;
  oracleAnswer: bigint;
  fills: FillRecord[];
};

function deskError(code: string, args: Record<string, unknown> = {}): DeskError {
  const copy = ERRORS[code] ?? ERRORS.UNKNOWN;
  return {
    code,
    args,
    title: copy?.title ?? "Something went wrong",
    hint: copy?.hint ?? "Show details for the raw error.",
    severity: copy?.severity ?? "system",
  };
}

function program(): StrategyInfo {
  return {
    strategyHash: HASH,
    order: null,
    program: "0x",
    decoded: { deadline: BigInt(DEADLINE), salt: 1n, unknown: [] },
    shippedAt: { block: 100n, tx: HASH },
    live: true,
  };
}

export function createFixture(which: "qa" | "demo"): {
  port: DeskPort;
  bump: () => void;
  block: () => bigint;
  applyShip: () => void;
  dock: () => void;
  seedTwo: () => void;
  seedFill: () => string;
  setOracle: (answer: bigint, updatedAt: number) => void;
} {
  const memory: Memory = {
    block: 100n,
    live: which === "qa" ? program() : null,
    multi: false,
    oracleUpdatedAt: NOW - 12,
    oracleAnswer: 400000000000n,
    fills: [],
  };

  const port: DeskPort = {
    async findStrategies() {
      return memory.live ? [memory.live] : [];
    },
    async findLiveStrategy() {
      if (!memory.live) return null;
      return memory.multi ? { ...memory.live, warning: "MULTIPLE_LIVE" as const } : memory.live;
    },
    decodeProgram(programHex) {
      const body = programHex.slice(2);
      const unknown: { opcode: number; args: Hex }[] = [];
      let i = 0;
      while (i + 4 <= body.length) {
        const opcode = Number.parseInt(body.slice(i, i + 2), 16);
        const len = Number.parseInt(body.slice(i + 2, i + 4), 16);
        const args = `0x${body.slice(i + 4, i + 4 + len * 2)}` as Hex;
        unknown.push({ opcode, args });
        i += 4 + len * 2;
      }
      return { deadline: BigInt(DEADLINE), salt: 1n, unknown };
    },
    describeProgram() {
      const deadline = DEADLINE;
      return [
        `Open until ${formatWhen(deadline, NOW)}`,
        `Only names under ${CLIENT_SUFFIX} may trade`,
        "Price: oracle mid plus the agent's live spread, or the desk.terms widths",
        "The desk stops selling ETH at or below a 70% ETH share; one fill is capped at 50 ETH",
        "A fill is allowed for 10 minutes after each oracle update",
      ];
    },
    async planShip(_ctx, input) {
      assertPolicy(input);
      const txs = [];
      if (memory.live) {
        txs.push(tx("Close the current desk (dock)"));
      }
      txs.push(tx("Ship the desk program"));
      return { txs, order: null, strategyHash: HASH, program: "0x" };
    },
    planDock() {
      return tx("Close the current desk (dock)");
    },
    planMultiSend() {
      return tx("Safe transaction");
    },
    async readDeskState() {
      return state(memory);
    },
    async quoteFor(_ctx, _s, q) {
      return quote(memory, q);
    },
    buildSwapTx() {
      return tx("Fill");
    },
    async planMmApprovals() {
      return [];
    },
    async readFills() {
      return memory.fills;
    },
    verifyFill(fill) {
      return recomputeFill(fill);
    },
    decodeDeskError(error) {
      if (isDeskError(error)) return error;
      return deskError("UNKNOWN");
    },
    priceMirror() {
      return { amountIn: 0n, amountOut: 0n, wWad: 0n, rWad: 0n, askWad: 0n, bidWad: 0n, sFinal: 0, spreadSource: 0 as const };
    },
    previewCurve(kappaBps) {
      const rows = curveFile.curves[String(kappaBps) as "100" | "200" | "400"];
      if (!rows) throw new Error("missing curve");
      return rows.map((point): PreviewPoint => ({
        sharePct: point.sharePct,
        wWad: BigInt(point.wWad),
        rWad: BigInt(point.rWad),
        askWad: BigInt(point.askWad),
        bidWad: BigInt(point.bidWad),
      }));
    },
  };

  return {
    port,
    bump() {
      memory.block += 1n;
    },
    block: () => memory.block,
    applyShip() {
      memory.live = program();
      memory.block += 1n;
    },
    dock() {
      memory.live = null;
      memory.multi = false;
      memory.block += 1n;
    },
    seedTwo() {
      memory.live = program();
      memory.multi = true;
      memory.block += 1n;
    },
    setOracle(answer: bigint, updatedAt: number) {
      memory.oracleAnswer = answer;
      memory.oracleUpdatedAt = updatedAt;
      memory.block += 1n;
    },
    seedFill() {
      // Alternates mm-a selling 2 ETH at the bid and mm-b buying 1.5 ETH at the ask, priced
      // with the #29 rule at mid 4000 and the 2 / 8 bp spread, so Verify recomputes a match.
      const n = memory.fills.length;
      const buys = n % 2 === 1;
      const tx = `0x${(0xa1 + n).toString(16).padStart(2, "0").repeat(32)}` as Hex;
      const mid = 4000n * WAD;
      const { weth, usdc } = (sepoliaConfig as DeskConfig).tokens as { weth: Address; usdc: Address };
      const fill: FillRecord = buys
        ? {
            tx,
            blockNumber: memory.block,
            blockTime: NOW - 600 + 60 * n,
            orderHash: tx,
            nameHash: tx,
            taker: MM_B,
            dnsName: clientName("mm-b"),
            name: "mm-b",
            tokenIn: usdc,
            tokenOut: weth,
            amountIn: 6001200000n,
            amountOut: 1500000000000000000n,
            midWad: mid,
            spreadBps: 2,
            spreadSource: 1,
            wBeforeWad: 900000000000000000n,
          }
        : {
            tx,
            blockNumber: memory.block,
            blockTime: NOW - 600 + 60 * n,
            orderHash: tx,
            nameHash: tx,
            taker: MM_A,
            dnsName: clientName("mm-a"),
            name: "mm-a",
            tokenIn: weth,
            tokenOut: usdc,
            amountIn: 2n * WAD,
            amountOut: 7993600000n,
            midWad: mid,
            spreadBps: 8,
            spreadSource: 1,
            wBeforeWad: 900000000000000000n,
          };
      memory.fills = [fill, ...memory.fills];
      memory.block += 1n;
      return tx;
    },
  };
}

function assertPolicy(input: ShipInput) {
  const sMin = input.policy?.sMin ?? 5;
  const sMax = input.policy?.sMax ?? 200;
  const wStar = input.policy?.wStar ?? 7000;
  if (sMin > sMax || sMax >= 10000 || wStar < 5000 || wStar > 9000) {
    throw deskError("INVALID_POLICY");
  }
}

function quote(memory: Memory, q: QuoteInput): QuoteResult {
  if (!memory.live) return { ok: false, error: deskError("NO_LIVE_STRATEGY") };
  if (memory.oracleUpdatedAt < NOW - 3600) return { ok: false, error: deskError("DeskPriceOracleStale") };
  const mm = q.mm.toLowerCase();
  if (mm === OUTSIDER) return { ok: false, error: deskError("EnsGateTakerMismatch") };
  if (mm === MM_C) return { ok: false, error: deskError("EnsGateNameExpired") };
  if (mm === MM_X) return { ok: false, error: deskError("DeskPriceNoTerms") };
  if (mm === MM_A && q.side === "buy" && q.leg === "usdc" && q.amount > CAP_MM_A) {
    return { ok: false, error: deskError("DeskPriceCapExceeded") };
  }
  const wethLeg = q.leg === "weth" ? q.amount : 0n;
  if (wethLeg > FILL_CAP_WETH) return { ok: false, error: deskError("DeskPriceCapExceeded") };
  const hit = lookupQuote(q.mm, q.side, q.leg, q.amount);
  if (!hit) return { ok: false, error: deskError("FIXTURE_UNCOVERED") };
  return hit;
}

function state(memory: Memory): DeskState {
  const stale = NOW - memory.oracleUpdatedAt > 3600;
  return {
    live: memory.live !== null,
    balances: { weth: WETH_BAL, usdc: USDC_BAL },
    safeWallet: { weth: WETH_BAL, usdc: USDC_BAL },
    allowances: { weth: MAX, usdc: MAX },
    pWad: 4000000000000000000000n,
    oracleUpdatedAt: memory.oracleUpdatedAt,
    oracleStale: stale,
    wWad: 900000000000000000n,
    targetWad: 700000000000000000n,
    rWad: 3984000000000000000000n,
    deadline: DEADLINE,
    maxStaleness: 3600,
    mms: [
      mm(MM_A, clientName("mm-a"), NOW + 86400, false, 10, 100000000000n, 20, 3991968000000000000000n, 3976032000000000000000n),
      mm(MM_B, clientName("mm-b"), NOW + 86400, false, 25, 50000000000n, 0, 3993960000000000000000n, 3974040000000000000000n),
      mm(MM_C, clientName("mm-c"), NOW - 86400, true, 10, 100000000000n, 0, 0n, 0n),
      mm(MM_X, clientName("mm-x"), NOW + 86400, false, 0, 0n, 0, 0n, 0n),
    ],
  };
}

function mm(
  address: Address,
  name: string,
  expiry: number,
  expired: boolean,
  tierBps: number,
  cap: bigint,
  agentBps: number,
  askWad: bigint,
  bidWad: bigint,
): DeskState["mms"][number] {
  const noTerms = cap === 0n;
  return {
    name,
    address,
    expiry,
    expired,
    resolverOk: true,
    ...(noTerms ? {} : { terms: { tierBps, cap } }),
    ...(agentBps > 0 ? { spread: { bps: agentBps, validUntil: NOW + 3600, valid: true } } : {}),
    sPolicy: agentBps > 0 ? agentBps : tierBps,
    askWad,
    bidWad,
    status: expired ? "expired" : noTerms ? "no-terms" : "ok",
  };
}

function tx(label: string) {
  return { to: ZERO, data: "0x" as Hex, value: 0n as const, label };
}

function isDeskError(error: unknown): error is DeskError {
  return typeof error === "object" && error !== null && "code" in error && "title" in error;
}

export const FIXTURE_OWNERS = [OWNER1, OWNER2, OWNER3];
export const FIXTURE_MMS = [
  { name: clientName("mm-a"), address: MM_A },
  { name: clientName("mm-b"), address: MM_B },
  { name: clientName("mm-c"), address: MM_C },
  { name: clientName("mm-x"), address: MM_X },
];
export const FIXTURE_DEPLOYER = ZERO;

export function emptyConfig(): DeskConfig {
  return {
    chainId: 11155111,
    aqua: ZERO,
    ens: {
      ethRegistry: "",
      deskRegistry: "",
      clientsRegistry: "",
      resolver: "",
      suffix: CLIENT_SUFFIX,
      universalResolver: "",
    },
    tokens: { weth: "", usdc: "" },
    oracle: "",
    router: "",
    safe: "",
    desk: {
      oracleDecimals: 8,
      baseDecimals: 18,
      quoteDecimals: 6,
      maxStaleness: 3600,
      wStarBps: 7000,
      kappaBps: 200,
      sMinBps: 5,
      sMaxBps: 200,
      strategyTtlDays: 30,
      shipWeth: "900000000000000000000",
      shipUsdc: "400000000000",
    },
    mms: [],
    owners: FIXTURE_OWNERS,
    deployBlock: 0,
    logChunk: 50000,
    explorer: "https://sepolia.etherscan.io",
  };
}

void ZERO;
