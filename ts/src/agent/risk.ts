import { encodeFunctionData, type Hex } from "viem";

import type { DeskConfig } from "../lib/config.js";
import type { PlannedTx } from "../lib/client/ctx.js";
import { dnsEncode, encodeSpread } from "../lib/encode.js";

const WAD = 10n ** 18n;
const HOUR = 3600n;

const resolverAbi = [
  {
    type: "function",
    name: "setData",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes" },
      { name: "key", type: "string" },
      { name: "value", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export type RiskFill = {
  dnsName: Hex;
  wBeforeWad: bigint;
};

export type SpreadChoice = {
  spreadBps: number;
  validUntil: bigint;
  data: Hex;
  stats: string;
};

export function chooseSpread(
  fills: RiskFill[],
  cfg: DeskConfig,
  name: string,
  now: bigint,
): SpreadChoice {
  const min = cfg.desk.sMinBps;
  const max = cfg.desk.sMaxBps;
  const newest = fills.find((fill) => fill.dnsName === dnsEncode(name));
  const raw = newest ? fromInventory(newest.wBeforeWad, cfg, min, max) : min;
  const spreadBps = clamp(raw, min, max);
  const validUntil = now + HOUR;
  return {
    spreadBps,
    validUntil,
    data: encodeSpread(spreadBps, validUntil),
    stats: `spread ${spreadBps} bps inside ${min}..${max}`,
  };
}

export function planSpreadWrite(
  cfg: DeskConfig,
  name: string,
  choice: SpreadChoice,
): PlannedTx {
  const resolver = cfg.ens.resolver;
  if (resolver === "") throw new Error("resolver is unset");
  return {
    to: resolver,
    value: 0n,
    label: "set spread",
    data: encodeFunctionData({
      abi: resolverAbi,
      functionName: "setData",
      args: [dnsEncode(name), "desk.spread", choice.data],
    }),
  };
}

function fromInventory(
  wBeforeWad: bigint,
  cfg: DeskConfig,
  min: number,
  max: number,
): number {
  const target = BigInt(cfg.desk.wStarBps) * 10n ** 14n;
  const distance =
    wBeforeWad > target ? wBeforeWad - target : target - wBeforeWad;
  const deviation = (distance * 10_000n) / WAD;
  const capped = deviation > 10_000n ? 10_000n : deviation;
  const span = BigInt(max - min);
  return min + Number((span * capped) / 10_000n);
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
