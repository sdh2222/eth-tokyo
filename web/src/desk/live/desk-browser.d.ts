declare module "@desk/browser" {
  export type BrowserStrategy = {
    strategyHash: `0x${string}`;
    order: unknown;
    program: `0x${string}`;
    decoded: {
      deadline: bigint;
      salt: bigint;
      unknown: { opcode: number; args: `0x${string}` }[];
      gate?: { suffix: string };
      price?: {
        wStarBps: number;
        kappaBps: number;
        sMinBps: number;
        sMaxBps: number;
        maxStaleness: number;
      };
    };
    shippedAt: { block: bigint; tx: `0x${string}` };
    dockedAt?: { block: bigint; tx: `0x${string}` };
    live: boolean;
    warning?: "MULTIPLE_LIVE";
  };

  export type BrowserState = {
    live: boolean;
    balances: { weth: bigint; usdc: bigint };
    safeWallet: { weth: bigint; usdc: bigint };
    allowances: { weth: bigint; usdc: bigint };
    pWad: bigint;
    oracleUpdatedAt: bigint;
    oracleStale: boolean;
    wWad: bigint;
    targetWad: bigint;
    rWad: bigint;
    mms: {
      name: string;
      address: `0x${string}` | "";
      expiry: bigint;
      expired: boolean;
      resolverOk: boolean;
      sPolicy: number;
      askWad: bigint;
      bidWad: bigint;
      status: "ok" | "expired" | "no-terms" | "wrong-resolver" | "no-addr";
    }[];
  };

  export type BrowserFill = {
    orderHash: `0x${string}`;
    nameHash: `0x${string}`;
    taker: `0x${string}`;
    dnsName: `0x${string}`;
    tokenIn: `0x${string}`;
    tokenOut: `0x${string}`;
    amountIn: bigint;
    amountOut: bigint;
    midWad: bigint;
    spreadBps: number;
    spreadSource: 0 | 1 | 2;
    wBeforeWad: bigint;
    blockNumber: bigint;
    transactionHash: `0x${string}`;
  };

  export function findStrategies(ctx: { client: unknown; cfg: unknown }): Promise<BrowserStrategy[]>;
  export function findLiveStrategy(ctx: { client: unknown; cfg: unknown }): Promise<BrowserStrategy | null>;
  export function decodeProgram(program: `0x${string}`): BrowserStrategy["decoded"];
  export function describeProgram(
    d: BrowserStrategy["decoded"],
    cfg: { ens: { suffix: string } },
  ): string[];
  export function readDeskState(ctx: { client: unknown; cfg: unknown }, s: BrowserStrategy): Promise<BrowserState>;
  export function readFills(
    ctx: { client: unknown; cfg: unknown },
    s?: BrowserStrategy,
    fromBlock?: bigint,
  ): Promise<BrowserFill[]>;
  export function decodeDeskError(e: unknown): {
    code: string;
    args: Record<string, unknown>;
    title: string;
    hint: string;
    severity: "user" | "config" | "system";
  };
}
