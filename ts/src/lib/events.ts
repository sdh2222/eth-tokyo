import { type Address, type Hex } from "viem";
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
      { name: "sSellBps", type: "uint16", indexed: false },
      { name: "sBuyBps", type: "uint16", indexed: false },
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
  sSellBps: number;
  sBuyBps: number;
  wBeforeWad: bigint;
};

/** WETH the taker bought or sold in this fill. The side is the taker's. */
export function filledWeth(
  fill: Pick<DeskFillEvent, "tokenIn" | "tokenOut" | "amountIn" | "amountOut">,
  weth: Address,
): { side: "buy" | "sell"; sizeWeth: bigint } {
  if (fill.tokenOut.toLowerCase() === weth.toLowerCase()) {
    return { side: "buy", sizeWeth: fill.amountOut };
  }
  if (fill.tokenIn.toLowerCase() === weth.toLowerCase()) {
    return { side: "sell", sizeWeth: fill.amountIn };
  }
  throw new Error("fill has no WETH leg");
}

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
    sSellBps: a.sSellBps,
    sBuyBps: a.sBuyBps,
    wBeforeWad: a.wBeforeWad,
  };
}
