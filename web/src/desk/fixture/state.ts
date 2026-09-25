import { ERRORS } from "../../copy/errors";
import { formatWhen } from "../../lib/time";
import type { DeskPort } from "../port";
import type {
  Address,
  DeskConfig,
  DeskError,
  DeskState,
  FillCheck,
  FillRecord,
  Hex,
  PreviewPoint,
  QuoteInput,
  QuoteResult,
  ShipInput,
  StrategyInfo,
} from "../types";
import curveFile from "./preview-curve.json";
import { CAP_MM_A, lookupQuote } from "./quotes";

export const NOW = 1790337600;

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const OWNER1 = "0x0000000000000000000000000000000000000001" as Address;
const OWNER2 = "0x0000000000000000000000000000000000000002" as Address;
const OWNER3 = "0x0000000000000000000000000000000000000003" as Address;
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
  fills: FillRecord[];
  checks: Map<string, FillCheck>;
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
} {
  const memory: Memory = {
    block: 100n,
    live: which === "qa" ? program() : null,
    multi: false,
    oracleUpdatedAt: NOW - 12,
    fills: [],
    checks: new Map(),
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
      return { deadline: BigInt(DEADLINE), salt: 1n, unknown: [{ opcode: 0, args: programHex }] };
    },
    describeProgram() {
      const deadline = DEADLINE;
      return [
        `Open until ${formatWhen(deadline, NOW)}`,
        "Only names under clients.desk.eth may trade",
        "Price: oracle mid, skewed toward 70% ETH (κ 2%)",
        "Spread between 0.05% and 2.00%, set per name",
        "Oracle older than 60 minutes blocks trading",
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
      return memory.checks.get(fill.tx) ?? { matches: false, steps: [] };
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
    seedFill() {
      const tx = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
      const steps = ["Mid", "ETH share before", "Skew", "Reference price", "Spread used", "Ask or bid", "Amount"].map(
        (label) => ({ label, formula: label, value: "1" }),
      );
      memory.checks.set(tx, { matches: true, steps });
      memory.fills = [
        {
          tx,
          blockNumber: memory.block,
          blockTime: NOW,
          orderHash: tx,
          nameHash: tx,
          taker: "0x0000000000000000000000000000000000000005",
          dnsName: "mm-a.clients.desk.eth",
          name: "mm-a",
          tokenIn: "0x0000000000000000000000000000000000000000",
          tokenOut: "" as Address,
          amountIn: 1n,
          amountOut: 1n,
          midWad: 1n,
          spreadBps: 10,
          spreadSource: 1,
          wBeforeWad: 1n,
        },
      ];
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
      mm(MM_A, "mm-a.clients.desk.eth", NOW + 86400, false, 10, 100000000000n, 20, 3991968000000000000000n, 3976032000000000000000n),
      mm(MM_B, "mm-b.clients.desk.eth", NOW + 86400, false, 25, 50000000000n, 0, 3993960000000000000000n, 3974040000000000000000n),
      mm(MM_C, "mm-c.clients.desk.eth", NOW - 86400, true, 10, 100000000000n, 0, 0n, 0n),
      mm(MM_X, "mm-x.clients.desk.eth", NOW + 86400, false, 0, 0n, 0, 0n, 0n),
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
  { name: "mm-a.clients.desk.eth", address: MM_A },
  { name: "mm-b.clients.desk.eth", address: MM_B },
  { name: "mm-c.clients.desk.eth", address: MM_C },
  { name: "mm-x.clients.desk.eth", address: MM_X },
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
      suffix: "clients.desk.eth",
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
