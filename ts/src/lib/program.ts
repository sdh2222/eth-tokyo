import {
  Address,
  instructions,
  MakerTraits,
  Order,
  ProgramBuilder,
  type SwapVmProgram,
} from "@1inch/swap-vm-sdk";
import { keccak256, type Address as ViemAddress, type Hex } from "viem";

import type { DeskConfig } from "./config.js";
import { gateIx, priceIx, deskInstructions } from "./opcodes.js";

export function buildProgram(
  cfg: DeskConfig,
  opts: { deadline: bigint; salt: bigint },
): SwapVmProgram {
  const ens = cfg.ens;
  if (
    ens.ethRegistry === "" ||
    ens.deskRegistry === "" ||
    ens.clientsRegistry === "" ||
    ens.resolver === ""
  ) {
    throw new Error("program addresses are unset");
  }
  if (cfg.oracle === "" || cfg.tokens.weth === "" || cfg.tokens.usdc === "")
    throw new Error("price addresses are unset");
  const builder = new ProgramBuilder(deskInstructions);
  builder.add(
    instructions.controls.deadline.createIx(
      new instructions.controls.DeadlineArgs(opts.deadline),
    ),
  );
  builder.add(
    instructions.controls.salt.createIx(
      new instructions.controls.SaltArgs(opts.salt),
    ),
  );
  builder.add(
    gateIx({
      ethRegistry: ens.ethRegistry,
      deskRegistry: ens.deskRegistry,
      clientsRegistry: ens.clientsRegistry,
      resolver: ens.resolver,
      suffix: ens.suffix,
    }),
  );
  builder.add(
    priceIx({
      resolver: ens.resolver,
      oracle: cfg.oracle,
      base: cfg.tokens.weth,
      quote: cfg.tokens.usdc,
      oracleDecimals: cfg.desk.oracleDecimals,
      baseDecimals: cfg.desk.baseDecimals,
      quoteDecimals: cfg.desk.quoteDecimals,
      maxBlocks: cfg.desk.maxBlocks,
      wStarBps: cfg.desk.wStarBps,
    }),
  );
  return builder.build();
}

export function buildOrder(safe: ViemAddress, program: SwapVmProgram): Order {
  return new Order(
    new Address(safe),
    MakerTraits.new({
      useAquaInsteadOfSignature: true,
      shouldUnwrap: false,
      allowZeroAmountIn: false,
    }),
    program,
  );
}

export function strategyBytes(order: Order): Hex {
  return order.encode().toString() as Hex;
}

export function strategyHash(order: Order): Hex {
  return keccak256(strategyBytes(order));
}
