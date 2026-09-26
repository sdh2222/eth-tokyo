# 018 ENS tooling reads the new desk.terms (128 bytes)

Source: main #21 changed `desk.terms` to `abi.encode(uint8 1, uint16 sSellBps, uint16 sBuyBps, uint128 cap)`, 128 bytes, with `cap` in WETH base units (`DeskPrice.sol` `_records`, and `wethAmt > cap`). On 2026-09-26 the Aqua lane asked the ENS lane to point its verify tooling at that format and not to write the record, because the Safe writes it. `desk.spread` and the risk agent's delegation stay as they are.

## One behavior

`npm run verify` judges each MM's `desk.terms` by the same rule as `DeskPrice._records`. First it unwraps the resolver's ABI-encoded return. The value must then be 128 bytes, with version 1, `sSell ≤ 0xFFFF`, `sBuy ≤ 0xFFFF`, `sSell < sBuy`, `sBuy < 10000` and `0 < cap ≤ type(uint128).max`. It prints `sSell`, `sBuy` and `cap` in WETH.

## In scope

- `ens/src/encode.ts`: a new `desk.terms` encoder and decoder (128 bytes) that mirror `DeskPrice._records` word by word. The `desk.spread` format is unchanged.
- `ens/src/read.ts` and `ens/scripts/99-verify.ts`: checks and output for the new format.
  - Drop the old tier and USDC-cap expectations.
  - Show `desk.spread` as information only, because the router does not read it since #21.
- Every other use of the old encoder, so the package typechecks: the `03-clients` seeds, the default record in `src/setup.ts` and the fork harness. None of them writes to Sepolia after the handoff.
- The README's record-format section.

## Out of scope

- Writing any `desk.terms` record on Sepolia. The Safe does that.
- Changing the router (`DeskPrice`) or its test mock. That is reported separately to the Aqua lane.
- Removing or changing the agent's `desk.spread` delegation.

## Acceptance

- [ ] The decoder accepts `(1, 3, 10, 50e18)`. It rejects each of these:
  - a 96-byte value
  - version 2
  - `sSell ≥ sBuy`
  - `sBuy ≥ 10000`
  - `cap = 0`
  - `cap > type(uint128).max`
  - a `sSell` or `sBuy` word above `0xFFFF`

  The run output is pasted in the PR.
- [ ] On Sepolia today (read-only), verify reports that the `desk.terms` of mm-a and mm-b are still the old 96-byte format, which the router rejects.
- [ ] On an anvil Sepolia fork, the impersonated Safe writes `(1, 3, 10, 50 WETH)` to mm-a and mm-b. After that, `npm run verify -- --safe <Safe>` passes and prints sSell 3, sBuy 10 and cap 50 WETH. No private key is used.
- [ ] `npm run typecheck` passes, and nothing is sent to Sepolia.
