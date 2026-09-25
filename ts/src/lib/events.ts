import type { Address, Hex } from "viem";
import { decodeEventLog } from "viem";

export const deskFillAbi = [
  {
    type: "event",
    name: "DeskFill",
    inputs: [
      { name: "orderHash", type: "bytes32", indexed: true },
      { name: "nameHash", type: "bytes32", indexed: true },
      { name: "taker", type: "address", indexed: true },
      { name: "dnsName", type: "bytes", indexed: false },
      { name: "tokenIn", type: "address", indexed: false },
      { name: "tokenOut", type: "address", indexed: false },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "amountOut", type: "uint256", indexed: false },
      { name: "midWad", type: "uint256", indexed: false },
      { name: "spreadBps", type: "uint16", indexed: false },
      { name: "spreadSource", type: "uint8", indexed: false },
      { name: "wBeforeWad", type: "uint256", indexed: false },
    ],
  },
] as const;

export type DeskFillEvent = {
  orderHash: Hex;
  nameHash: Hex;
  taker: Address;
  dnsName: Hex;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOut: bigint;
  midWad: bigint;
  spreadBps: number;
  spreadSource: 0 | 1 | 2;
  wBeforeWad: bigint;
};

export function decodeDeskFill(log: {
  topics: Hex[];
  data: Hex;
}): DeskFillEvent {
  const decoded = decodeEventLog({
    abi: deskFillAbi,
    data: log.data,
    topics: log.topics as [Hex, ...Hex[]],
  });
  const a = decoded.args;
  const source = a.spreadSource;
  if (source !== 0 && source !== 1 && source !== 2)
    throw new Error("bad spread source");
  return {
    orderHash: a.orderHash,
    nameHash: a.nameHash,
    taker: a.taker,
    dnsName: a.dnsName,
    tokenIn: a.tokenIn,
    tokenOut: a.tokenOut,
    amountIn: a.amountIn,
    amountOut: a.amountOut,
    midWad: a.midWad,
    spreadBps: a.spreadBps,
    spreadSource: source,
    wBeforeWad: a.wBeforeWad,
  };
}
