export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export type DeskConfig = {
  chainId: number;
  aqua: Address;
  ens: {
    ethRegistry: string;
    deskRegistry: string;
    clientsRegistry: string;
    resolver: string;
    suffix: string;
    universalResolver: string;
  };
  tokens: { weth: string; usdc: string };
  oracle: string;
  router: string;
  safe: string;
  desk: {
    oracleDecimals: number;
    baseDecimals: number;
    quoteDecimals: number;
    maxStaleness: number;
    wStarBps: number;
    kappaBps: number;
    sMinBps: number;
    sMaxBps: number;
    strategyTtlDays: number;
    shipWeth: string;
    shipUsdc: string;
  };
  mms: { name: string; address: string }[];
  owners?: Address[];
  deployBlock: number;
  logChunk: number;
  explorer: string;
};

export type DeskCtx = {
  client: unknown;
  cfg: DeskConfig;
};

export type DecodedProgram = {
  deadline: bigint;
  salt: bigint;
  unknown: { opcode: number; args: Hex }[];
};

export type StrategyInfo = {
  strategyHash: Hex;
  order: unknown;
  program: Hex;
  decoded: DecodedProgram;
  shippedAt: { block: bigint; tx: Hex };
  dockedAt?: { block: bigint; tx: Hex };
  live: boolean;
  warning?: "MULTIPLE_LIVE";
};

export type PlannedTx = {
  to: Address;
  data: Hex;
  value: 0n;
  label: string;
};

export type ShipInput = {
  salt: bigint;
  ttlDays: number;
  wethAmt: bigint;
  usdcAmt: bigint;
  policy?: { sMin?: number; sMax?: number; wStar?: number };
};

export type ShipPlan = {
  txs: PlannedTx[];
  order: unknown;
  strategyHash: Hex;
  program: Hex;
};

export type MmState = {
  name: string;
  address: Address;
  expiry: number;
  expired: boolean;
  resolverOk: boolean;
  terms?: { tierBps: number; cap: bigint };
  spread?: { bps: number; validUntil: number; valid: boolean };
  sPolicy: number;
  askWad: bigint;
  bidWad: bigint;
  status: "ok" | "expired" | "no-terms" | "wrong-resolver" | "no-addr";
};

export type DeskState = {
  live: boolean;
  balances: { weth: bigint; usdc: bigint };
  safeWallet: { weth: bigint; usdc: bigint };
  allowances: { weth: bigint; usdc: bigint };
  pWad: bigint;
  oracleUpdatedAt: number;
  oracleStale: boolean;
  wWad: bigint;
  targetWad: bigint;
  rWad: bigint;
  mms: MmState[];
  deadline: number;
  maxStaleness: number;
};

export type QuoteInput = {
  mm: Address;
  side: "buy" | "sell";
  leg: "weth" | "usdc";
  amount: bigint;
};

export type QuoteOk = {
  ok: true;
  amountIn: bigint;
  amountOut: bigint;
  priceWad: bigint;
  spreadBps: number;
  spreadSource: 0 | 1 | 2;
  mirror: { amountIn: bigint; amountOut: bigint };
  mirrorMatches: true;
};

export type DeskError = {
  code: string;
  args: Record<string, unknown>;
  title: string;
  hint: string;
  severity: "user" | "config" | "system";
};

export type QuoteResult = QuoteOk | { ok: false; error: DeskError };

export type FillRecord = {
  tx: Hex;
  blockNumber: bigint;
  blockTime: number;
  orderHash: Hex;
  nameHash: Hex;
  taker: Address;
  dnsName: string;
  name: string;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOut: bigint;
  midWad: bigint;
  spreadBps: number;
  spreadSource: 0 | 1 | 2;
  wBeforeWad: bigint;
};

export type FillCheck = {
  matches: boolean;
  steps: { label: string; formula: string; value: string }[];
};

export type PreviewPoint = {
  sharePct: number;
  wWad: bigint;
  rWad: bigint;
  askWad: bigint;
  bidWad: bigint;
};
