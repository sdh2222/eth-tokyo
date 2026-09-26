import { HexString, TakerTraits } from "@1inch/swap-vm-sdk";
import type { Hex } from "viem";

import { encodeTakerArgs } from "./encode.js";

export function buildTakerData(a: {
  name: string;
  exactIn: boolean;
  threshold?: bigint;
  deadline?: bigint;
}): Hex {
  return TakerTraits.new({
    exactIn: a.exactIn,
    useTransferFromAndAquaPush: true,
    threshold: a.threshold,
    deadline: a.deadline,
    instructionsArgs: new HexString(encodeTakerArgs(a.name)),
  })
    .encode()
    .toString() as Hex;
}
