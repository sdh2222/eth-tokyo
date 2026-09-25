---
title: T5 Spec · TS encoders and price mirror
notion: https://app.notion.com/p/3e58f1ec11b481009b0fd731a22db0c3
---

# T5 Spec · TS encoders and price mirror

## Goal

The TypeScript half of the byte and maths contract: every encoding the web app, scripts and bot need, and a bigint price mirror that agrees with #35 to the wei.

## Source of truth

Desk system §5.3, §5.4 (steps 7 to 9 and 7b), §7.1, §8.0 (config schema), §9, §10 (T-TS-1..4).

## Owns

- `ts/src/lib/config.ts`: `DeskConfig` type + `loadConfig(json): DeskConfig` (validates every key in Desk system §8.0; throws on a missing or malformed address)
- `ts/src/lib/encode.ts`: `dnsEncode`, `encodeGateArgs`, `encodePriceArgs`, `encodeTakerArgs`, `encodeTerms`, `encodeSpread`
- `ts/src/lib/opcodes.ts`: `ensGateOpcode`, `deskPriceOpcode` (SDK `Opcode` objects with `IArgsCoder`s), `deskInstructions`
- `ts/src/lib/program.ts`: `buildProgram`, `buildOrder`, `strategyBytes`, `strategyHash`
- `ts/src/lib/taker.ts`: `buildTakerData`
- `ts/src/lib/price.ts`: `priceMirror`
- `ts/src/lib/events.ts`: `deskFillAbi`, `decodeDeskFill`
- `ts/src/lib/index.ts`: re-exports all of the above
- `ts/test/lib/*.test.ts`

## Requirements

1. Signatures exactly as Desk system §7.1. All amounts `bigint`; addresses viem `Address`; bytes `Hex`.
2. `buildProgram(cfg, opts: { deadline: bigint; salt: bigint; policy?: Partial<PriceArgs> })` produces opcodes 13, 20, 34, 35 in that order (D9) through the SDK `ProgramBuilder` with `deskInstructions`; its bytes must equal the §9 program vector for the placeholder config.
3. `deskInstructions = [...aquaInstructions, ensGateOpcode, deskPriceOpcode]`; a test asserts length 36 and indices 13, 20, 34, 35.
4. `buildOrder(safe, program)` uses the SDK's `Order` and `MakerTraits` with `useAquaInsteadOfSignature = true` and all other flags default; `strategyBytes = order.encode()`; `strategyHash = keccak256(strategyBytes)`.
5. `buildTakerData({ name, exactIn, threshold?, deadline? })` uses `TakerTraits.new({ exactIn, useTransferFromAndAquaPush: true, threshold, deadline, instructionsArgs: encodeTakerArgs(name) }).encode()`.
6. `priceMirror` implements Desk system §5.4 steps 7, 7b, 8, 9 and 10 (cap is not known to the mirror: it takes an optional `cap` and flags `overCap`), with Solidity's rounding (floor/ceil per formula; signed division truncates toward zero). It returns `{ amountIn, amountOut, wWad, rWad, askWad, bidWad, sFinal, spreadSource, floorBps, overCap }`.
7. `encodeTerms` / `encodeSpread` produce `abi.encode(uint8 1, uint16, uint128)` / `abi.encode(uint8 1, uint16, uint64)` (96 bytes each); the terms vector in §9 must match.
8. Tests: T-TS-1 (every §9 encoding), T-TS-2 (every §9 amount, V1–V4), T-TS-3 (taker data round-trip through `TakerTraits.decode`), and a skipped placeholder named `T-TS-4 strategyHash parity` for T8 to fill.
9. No Node-only APIs in `ts/src/lib` (it runs in the browser).

## Acceptance

- `pnpm -C ts test` green; `pnpm -C ts typecheck` and `lint` clean.
- Each §9 number is a literal in a test.

## Out of scope

Chain reads and planning (T5b); scripts.

## Handoff

T5b builds on this; the web app lane imports `@desk/lib`.
