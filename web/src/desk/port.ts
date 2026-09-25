import type {
  DeskConfig,
  DeskCtx,
  DeskError,
  DeskState,
  FillCheck,
  FillRecord,
  Hex,
  PlannedTx,
  PreviewPoint,
  QuoteInput,
  QuoteOk,
  QuoteResult,
  ShipInput,
  ShipPlan,
  StrategyInfo,
  Address,
} from "./types";

export type { DeskConfig, DeskCtx, DeskError, DeskState, FillRecord, QuoteInput, QuoteResult, StrategyInfo };

export type DeskPort = {
  findStrategies(ctx: DeskCtx): Promise<StrategyInfo[]>;
  findLiveStrategy(ctx: DeskCtx): Promise<StrategyInfo | null>;
  decodeProgram(program: Hex): StrategyInfo["decoded"];
  describeProgram(d: StrategyInfo["decoded"], cfg: DeskConfig): string[];
  planShip(ctx: DeskCtx, p: ShipInput): Promise<ShipPlan>;
  planDock(ctx: DeskCtx, strategyHash: Hex): PlannedTx;
  planMultiSend(txs: PlannedTx[]): PlannedTx;
  readDeskState(ctx: DeskCtx, s: StrategyInfo): Promise<DeskState>;
  quoteFor(ctx: DeskCtx, s: StrategyInfo, q: QuoteInput): Promise<QuoteResult>;
  buildSwapTx(ctx: DeskCtx, s: StrategyInfo, q: QuoteOk, p: { slippageBps: number; deadlineSec: number }): PlannedTx;
  planMmApprovals(ctx: DeskCtx, mm: Address): Promise<PlannedTx[]>;
  readFills(ctx: DeskCtx, s?: StrategyInfo, fromBlock?: bigint): Promise<FillRecord[]>;
  verifyFill(f: FillRecord, cfg: DeskConfig): FillCheck;
  decodeDeskError(e: unknown): DeskError;
  priceMirror(input: unknown): {
    amountIn: bigint;
    amountOut: bigint;
    wWad: bigint;
    rWad: bigint;
    askWad: bigint;
    bidWad: bigint;
    sFinal: number;
    spreadSource: 0 | 1 | 2;
  };
  previewCurve(kappaBps: 100 | 200 | 400): PreviewPoint[];
};
