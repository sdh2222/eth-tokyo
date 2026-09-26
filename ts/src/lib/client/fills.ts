import { deskFillAbi, decodeDeskFill, type DeskFillEvent } from "../events.js";
import type { DeskCtx, StrategyInfo } from "./ctx.js";

export type FillRecord = DeskFillEvent & {
  blockNumber: bigint;
  transactionHash: `0x${string}`;
};

export async function readFills(
  ctx: DeskCtx,
  s?: StrategyInfo,
  fromBlock?: bigint,
): Promise<FillRecord[]> {
  if (ctx.cfg.router === "") return [];
  const logs = await ctx.client.getLogs({
    address: ctx.cfg.router,
    event: deskFillAbi[0],
    fromBlock: fromBlock ?? BigInt(ctx.cfg.deployBlock),
  });
  const fills = logs.flatMap((log) => {
    try {
      const fill = decodeDeskFill({ topics: [...log.topics], data: log.data });
      if (s && fill.orderHash.toLowerCase() !== s.strategyHash.toLowerCase())
        return [];
      return [
        {
          ...fill,
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? "0x",
        },
      ];
    } catch {
      return [];
    }
  });
  return fills.reverse();
}
