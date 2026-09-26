import type { PublicClient, Address, Hex } from "viem";

import type { DeskConfig } from "../config.js";

export type DeskCtx = { client: PublicClient; cfg: DeskConfig };

export type GateArgs = {
  ethRegistry: Address;
  deskRegistry: Address;
  clientsRegistry: Address;
  resolver: Address;
  suffix: string;
};

export type PriceArgs = {
  resolver: Address;
  oracle: Address;
  base: Address;
  quote: Address;
  oracleDecimals: number;
  baseDecimals: number;
  quoteDecimals: number;
  maxBlocks: number;
  wStarBps: number;
};

export type DecodedInstruction = {
  opcode: number;
  args: Hex;
  known: boolean;
};

export type DecodedProgram = {
  deadline: bigint;
  salt: bigint;
  gate: GateArgs;
  price: PriceArgs;
  unknown: DecodedInstruction[];
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

export type PlannedTx = { to: Address; data: Hex; value: 0n; label: string };

export type DeskError = {
  code: string;
  args: Record<string, unknown>;
  title: string;
  hint: string;
  severity: "user" | "config" | "system";
};
