import { HexString, instructions } from "@1inch/swap-vm-sdk";
import type { Address, Hex } from "viem";

import { encodeGateArgs, encodePriceArgs } from "./encode.js";

class HexArgs {
  constructor(readonly hex: Hex) {}
  toJSON(): Record<string, unknown> {
    return { hex: this.hex };
  }
}

type OpcodeLike = (typeof instructions.aquaInstructions)[number];

const OpcodeCtor = instructions.aquaInstructions[13].constructor as new (
  id: symbol,
  coder: {
    encode: (args: HexArgs) => HexString;
    decode: (data: HexString) => HexArgs;
  },
) => OpcodeLike;

function packedCoder(encodeHex: (args: HexArgs) => Hex) {
  return {
    encode: (args: HexArgs) => new HexString(encodeHex(args)),
    decode: (data: HexString) => new HexArgs(data.toString() as Hex),
  };
}

export const ensGateOpcode: OpcodeLike = new OpcodeCtor(
  Symbol("ensGate"),
  packedCoder((args) => args.hex),
);
export const deskPriceOpcode: OpcodeLike = new OpcodeCtor(
  Symbol("deskPrice"),
  packedCoder((args) => args.hex),
);

export const deskInstructions: OpcodeLike[] = [
  ...instructions.aquaInstructions,
  ensGateOpcode,
  deskPriceOpcode,
];

export function gateIx(a: {
  ethRegistry: Address;
  deskRegistry: Address;
  clientsRegistry: Address;
  resolver: Address;
  suffix: string;
}) {
  return ensGateOpcode.createIx(new HexArgs(encodeGateArgs(a)));
}

export function priceIx(a: Parameters<typeof encodePriceArgs>[0]) {
  return deskPriceOpcode.createIx(new HexArgs(encodePriceArgs(a)));
}
