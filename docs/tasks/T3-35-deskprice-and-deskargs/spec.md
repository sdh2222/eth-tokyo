---
title: T3 Spec · #35 DeskPrice and DeskArgs
notion: https://app.notion.com/p/3e58f1ec11b4812fa727ed184dade909
---

# T3 Spec · #35 DeskPrice and DeskArgs

## Goal

Instruction #35: read the name's terms and spread, read the oracle, price the fill with the inventory skew and the size floor, enforce the cap, and emit `DeskFill` on real fills only. Plus `DeskArgs`, the Solidity encoder for #35 args, taker args and the whole program.

## Source of truth

Desk system §2.2 D1, D5-D7, D13, D14, D16; §5.4 (every step); §9 (all vectors); §10 (`DeskPrice.t.sol`). Desk security INV-3..8, INV-11. Desk dictionary §3.1.

## Owns

- `contracts/src/instructions/DeskPrice.sol` (replacing the stub body; keep T0's error declarations)
- `contracts/src/libs/DeskArgs.sol`
- `contracts/test/DeskPrice.t.sol`
- `contracts/test/mocks/PriceTestResolver.sol` only if T2's `MockEnsResolver` is not merged yet (delete it once T2 is in)

## Must not touch

`EnsGate.sol`, the ENS mocks from T2, `DeskOpcodes.sol`, `DeskRouter.sol`.

## Requirements

1. `_deskPrice` implements Desk system §5.4 steps 1 to 12 including step 7b, in that order, with exactly T0's errors. Uses OpenZeppelin `Math.mulDiv` with `Math.Rounding.Floor` / `Math.Rounding.Ceil` as each step says.
2. The name is consumed with `ctx.tryChopTakerArgs` (1 byte, then `len` bytes).
3. ENS record values are decoded by reading words and range-checking (step 6). **No ****`abi.decode`**** on a record value.** A malformed `desk.spread` never reverts (D7, INV-8).
4. `DeskFill` is emitted only when `!ctx.vm.isStaticContext`, with every field of Desk system §5.4 (`spreadSource` 0, 1 or 2).
5. `library DeskArgs`:
	- `struct PriceArgs { address resolver; address oracle; address base; address quote; uint8 oracleDecimals; uint8 baseDecimals; uint8 quoteDecimals; uint32 maxStaleness; uint16 wStarBps; uint16 kappaBps; uint16 sMinBps; uint16 sMaxBps; }`
	- `buildPriceArgs(PriceArgs memory) returns (bytes memory)` and `parsePriceArgs(bytes calldata) returns (PriceArgs memory)` for the 95-byte layout, both enforcing step 1's rules (revert `DeskPriceInvalidArgs()`).
	- `buildTakerArgs(bytes memory dnsName) returns (bytes memory)` = `uint8 len ‖ dnsName` (reverts if len \> 255).
	- `dnsEncode(string memory name) returns (bytes memory)`.
	- `buildProgram(uint40 deadline, uint64 salt, bytes memory gateArgs, bytes memory priceArgs) returns (bytes memory)` = `0x0d 0x05 deadline ‖ 0x14 0x08 salt ‖ 0x22 len gateArgs ‖ 0x23 len priceArgs` (Desk system §9).
6. Must reproduce the §9 `price`, `taker` and `program` vectors (for `program`, pass the golden gate hex as a literal).
7. Tests T-P-1..T-P-10 exactly as Desk system §10. T-P-1 contains every amount in the §9 tables as a literal. T-P-2 and T-P-10's round-trip check are fuzz tests with at least 256 runs.

## Security

Desk security §9 Solidity checklist. External calls only to `oracle` and `resolver` from the args.

## Acceptance

- `forge test --match-path test/DeskPrice.t.sol -vv` green with `--fuzz-runs 256` or more.
- Every §9 number appears in a test; the V4 test asserts `spreadSource == 2`.

## Out of scope

The gate; integration with Aqua (T8).

## Handoff

T8 builds full orders with `DeskArgs.buildProgram`; T5 mirrors the maths in TypeScript and must agree to the wei.
