---
title: Desk system
domain: Code
type: Rules
status: Draft
page_code: SYS
as_of: 2026-09-24
notion: https://app.notion.com/p/3e58f1ec11b481d1a6dbe031146df146
---

# Desk system

This page specifies the Aqua lane's desk system (DeskRouter, the #34 `EnsGate` and #35 `DeskPrice` instructions, the desk library, the scripts and the MM bot) for the coding agents that build it during ETHGlobal Tokyo.
A design decision that is missing here is a gap in the page: raise it with the team or ask the page Owner instead of inventing one. Changes are raised with the team and applied after the page Owner's OK.
Source versions this page was checked against. Every `file:line` citation below refers to these.

| Repo | Ref | Used for |
| --- | --- | --- |
| `1inch/swap-vm` | tag `v1.0.2` | router, VM, traits, opcode table |
| `1inch/aqua` | tag `v1.0.0` (`src/Aqua.sol` is byte-identical to `0.1.0`, the version swap-vm v1.0.2 pins in `package.json`) | registry |
| `1inch/sdks` | `typescript/swap-vm`, `@1inch/swap-vm-sdk` 0.4.4 | program and taker-data encoding |
| `ensdomains/contracts-v2` | branch `deploy/sepolia-migration-20260915` @ `07690a9` | registry and resolver API |
| `Aqua0-fi/aqua0-ethglobal` | default branch | pattern for a custom opcode table and router |

## 1. What we build

A Safe multisig (the treasury) ships one SwapVM strategy to the official Aqua registry on Sepolia. The strategy runs on **DeskRouter**, a copy of the SwapVM v1.0.2 Aqua router with a reduced opcode table plus two new instructions:

- **#34 ****`EnsGate`** checks that the caller is the `addr` of a live `*.clients.dao-treasury-a.eth` name.
- **#35 ****`DeskPrice`** reads that name's terms and spread from ENS, reads the oracle mid, and prices the fill with an inventory skew.
Market makers (MMs) call `DeskRouter.swap` directly. Tokens move Safe ↔ MM through `Aqua.pull` and `Aqua.push` in the same transaction. Our contracts store no configuration: everything is in the shipped program's bytes or read live at fill time.

## 2. Decisions

### 2.1 Carried over from the handoff

1. We deploy our own router (DeskRouter), following Aqua0's pattern. It uses a copied v1.0.2 `AquaOpcodes` table with unused instructions removed, plus #34 and #35 appended. #33 (the `tx.origin` KYC gate) is never used in our program.
2. Pinned versions: swap-vm `v1.0.2`, aqua `v1.0.0`. The signature is `swap(order, tokenIn, tokenOut, amount, takerTraitsAndData)`.
3. We use the official Aqua registry on Sepolia, `0x1111113ccf1426a8e30e2bff5e005d929bf6a90a`. We deploy only DeskRouter, with constructor `(aqua, weth, owner, name, version)`.
4. The taker is `msg.sender` (`swap-vm/src/SwapVM.sol:179`, and `:133` for `quote`). The MM's DNS-encoded ENS name travels in the instruction-args slice of the taker data.
5. Scope: DeskRouter plus opcodes, the two instructions, MockWETH, MockUSDC (6 decimals), MockOracle, Foundry tests, deploy script, Safe ship script, MM bot.
6. Treasury: a real Safe on Sepolia. Scripts sign with Safe `protocol-kit` using test owner keys from `.env`. One MultiSend batch does approve, approve, then `Aqua.ship`.
7. MMs approve the **router**. They use taker flag `useTransferFromAndAquaPush`. A contract-wallet MM must work; a test proves it.
8. Our contracts store nothing.
9. Price formula: `r = P·(1 − κ(w − w*))`, `ask = r(1+s)`, `bid = r(1−s)`.
10. Spread: `desk.spread` if valid, else the tier spread from `desk.terms`; clamp to `[sMin, sMax]`. This fallback is router logic.
11. ENS data record formats: `desk.terms = abi.encode(uint8 version, uint16 tierBps, uint128 capPerFill)` and `desk.spread = abi.encode(uint8 version, uint16 spreadBps, uint64 validUntil)`.
12. `DeskFill` is emitted only when `!ctx.vm.isStaticContext`.
13. SwapVM license obligations (§12).

### 2.2 Proposed in this page

The team can revise any of these in review.

| # | Decision | Why |
| --- | --- | --- |
| D1 | The MM name is passed **once**. #34 reads it without consuming it (`ctx.takerArgs()`), and #35 consumes it (`ctx.tryChopTakerArgs`). #34 must come immediately before #35 in the program. | Instructions share only the swap registers and the taker-args cursor (`swap-vm/src/libs/VM.sol:87,102`). Proposed 09-24. |
| D2 | #34 makes one resolver call (`addr`). #35 makes one resolver call (a `multicall` of the two data records). | Follows from D1: #34 cannot hand values to #35. This is two resolver calls, not one. Gas is measured in hour 1 (T2b). |
| D3 | Parent liveness is checked by walking the registries: `ETHRegistry.getSubregistry("dao-treasury-a")` must equal the pinned desk registry, then its `.getSubregistry("clients")` must equal the pinned clients registry. Both are pinned so that a lapsed-and-re-registered `dao-treasury-a.eth` pointing at our clients registry cannot revive the gate (found in review 09-24). The MM label's expiry is read explicitly with `getExpiry`. | `getSubregistry` and `getResolver` return zero once a label is expired (`contracts-v2/contracts/src/registry/PermissionedRegistry.sol:277-286`). One call per level therefore both checks expiry and proves the chain is still ours. The explicit MM-label expiry check gives the demo a clear revert reason. |
| D4 | The name must end with the pinned suffix `clients.dao-treasury-a.eth` (byte comparison). | Stops `mm-a.clients.<attacker>.eth` from reaching our pinned clients registry through an attacker's own subregistry link. |
| D5 | `capPerFill` is in USDC base units (6 decimals) and applies to the USDC leg of the fill, in both directions. | One unit for both directions. Human-readable. |
| D6 | All rounding favours the treasury: output is rounded down and input is rounded up. | Standard maker safety. |
| D7 | A malformed or stale `desk.spread` is **ignored** (fall back to the tier spread). A malformed or missing `desk.terms`, or `capPerFill == 0`, **reverts**. | A broken or hostile agent write can then never block fills, and a name without terms can never trade. |
| D8 | The opcode table keeps v1.0.2 indices. Kept: 10–16 (Controls), 20 (`_salt`), 33 (`_onlyTxOriginTokenBalanceNonZero`, part of Controls, mapped but never used). Emptied: 17–19, 21, 27–32. Added: 34, 35. | Index parity with `aquaInstructions` in the SDK. Controls is one contract, so keeping its seven functions costs little. Dropping Fee, XYC\*, Decay, PeggedSwap and Extruction removes most of the bytecode. |
| D9 | Program order: `_deadline(13)`, `_salt(20)`, `EnsGate(34)`, `DeskPrice(35)`. The strategy deadline is ship time + 30 days. | The cheap check runs first. The deadline bounds a forgotten strategy. |
| D10 | The Safe approves Aqua for `type(uint256).max` on both tokens. | Aqua pulls with `transferFrom(maker)` (`aqua/src/Aqua.sol:63-70`). Pushes grow the virtual balance but not the allowance, so an exact-amount approval would break after the first opposite-side fill. The Aqua virtual balance stays the real cap. |
| D11 | The Safe is 2-of-3 (proposed), with owners from `SAFE_OWNER_{1,2,3}_PK`. | Shows a real multisig while still being scriptable. |
| D12 | EIP-712 name `"DeskRouter"`, version `"1.0.2-desk.1"`. | Unused by Aqua orders (they hash with `keccak256(abi.encode(order))`, `SwapVM.sol:99`), but required by the constructor. |
| D13 | `DeskFill` indexes `orderHash`, `nameHash = keccak256(dnsName)` and `taker`, and carries the raw `dnsName`. | Cheap on-chain. The agent decodes the name from the bytes. |
| D14 | Only the pair \{WETH, USDC\} as configured in the #35 args. Anything else reverts. | Single-pair desk. |
| D15 | One TypeScript library (`ts/src/lib`) owns every off-chain encoding. The ship script, bot and web app import it. Solidity and TS are cross-checked against the golden vectors in §9. | One encoder, no drift between lanes. |
| D16 | A size floor on the spread: `s ≥ ceil(κ·notional / (2·book))`. It only binds for fills that are large relative to the book. | Every fill is priced at the pre-fill `w`. Without the floor, a big buy followed by a sell-back at the moved price profits the MM when `κ·notional/book > 2s`. For example, on V3 at s = 5 bps, a 100k round trip earns the MM +\$22.87; with the floor it loses \$17.16. Found in review 09-24. |

## 3. Components and repository layout

The monorepo is created in the first build hour (task T0):
```javascript
contracts/                          Foundry project
  foundry.toml                      solc 0.8.30, via_ir, optimizer_runs 700 (copy swap-vm v1.0.2 foundry.toml settings), evm_version cancun,
                                    fs_permissions read-write on "../config" (Deploy.s.sol writes it)
  remappings.txt                    same shape as Aqua0: @1inch/swap-vm/=lib/swap-vm/src/, other deps from lib/swap-vm/node_modules
  lib/swap-vm                       git submodule at tag v1.0.2, then `yarn install --frozen-lockfile` inside it
  src/DeskRouter.sol                ← derived from swap-vm src/routers/AquaSwapVMRouter.sol
  src/opcodes/DeskOpcodes.sol       ← derived from swap-vm src/opcodes/AquaOpcodes.sol
  src/instructions/EnsGate.sol      #34, plus library EnsGateArgs (build/parse #34 args, DNS label split)
  src/instructions/DeskPrice.sol    #35
  src/libs/DeskArgs.sol             build/parse #35 args, taker args, dnsEncode, buildProgram
  src/interfaces/IDeskEns.sol       minimal ENSv2 interfaces we call (§6.4)
  src/interfaces/IDeskEvents.sol    DeskFill event
  src/mocks/MockWETH.sol MockUSDC.sol MockOracle.sol
  test/…                            §10
  script/Deploy.s.sol               §8.1
ts/                                 one package (pnpm), TypeScript, viem, @1inch/swap-vm-sdk 0.4.4, @safe-global/protocol-kit
                                    published inside the monorepo as `@desk/lib` (the web app imports it; no copy)
  src/lib/                          encoders, program/order builder, off-chain price mirror (§7.1, task T5)
  src/lib/client/                   desk client for the web app, scripts and bot (§7.2, task T5b)
  src/scripts/safe-setup.ts         §8.2
  src/scripts/ship.ts               §8.3
  src/bot/                          §8.4
web/                                the web app (web app lane; Treasury web app page), imports @desk/lib
config/sepolia.json                 single source of addresses (§8.0)
config/strategy.sepolia.json        cache written by ship.ts (the chain is the record, §8.3)
LICENSES/SwapVM-1.1.txt, NOTICE.md  §12
```
Who holds what state:

| Component | Holds | Written by |
| --- | --- | --- |
| Safe (treasury) | WETH and USDC balances; ERC-20 allowances to Aqua | Safe owners through the web app or `ship.ts`; MMs' fills (via Aqua) |
| Aqua registry | per `(maker=Safe, app=DeskRouter, strategyHash, token)`: virtual balance and tokensCount (`aqua/src/Aqua.sol:21-24`) | `ship`/`dock` by the Safe; `pull`/`push` by DeskRouter during a fill |
| DeskRouter | nothing persistent. Only a transient per-order reentrancy lock (`SwapVM.sol:164,213`) | nobody |
| ENSv2 | names, expiries, resolver R's records | ENS lane (Safe); agent writes `desk.spread` and `desk.stats` only |
| MockOracle | answer, updatedAt | deployer |
| MM wallet | its tokens; allowance to DeskRouter | the MM |

## 4. State-change model

### 4.1 Once, before any trade

1. **Deploy** (deployer EOA): MockWETH, MockUSDC, MockOracle(answer 4000e8, 8 decimals), then DeskRouter(aqua, MockWETH, owner=deployer, "DeskRouter", "1.0.2-desk.1"). No other state.
2. **Safe setup** (deployer): deploy a Safe 2-of-3, then mint MockWETH and MockUSDC to it (public mint).
3. **ENS** (ENS lane): the names and records in §6.5.
4. **Ship** (Safe, one MultiSend transaction, from the web app's Open-a-desk flow or `ship.ts`):
	- `WETH.approve(Aqua, max)`, `USDC.approve(Aqua, max)`. Writes the Safe's allowances.
	- `Aqua.ship(DeskRouter, abi.encode(order), [WETH, USDC], [wethAmt, usdcAmt])`. Writes Aqua `_balances[Safe][DeskRouter][keccak256(strategy)][token] = amount, tokensCount = 2` and emits `Shipped` plus two `Pushed` (`aqua/src/Aqua.sol:40-52`). **No tokens move.**
	- The strategy bytes must be exactly `abi.encode(order)`. Otherwise Aqua's `strategyHash` ≠ the router's `orderHash` (`SwapVM.sol:99`) and every fill fails `safeBalances`.
5. **MM setup** (each MM): `WETH.approve(DeskRouter, max)`, `USDC.approve(DeskRouter, max)`. Holding mock tokens is enough (public mint).

### 4.2 One fill

A single synchronous call chain. Any revert undoes all of it.
```javascript
MM ──swap(order, tokenIn, tokenOut, amount, takerTraitsAndData)──▶ DeskRouter
  1. orderHash = keccak256(abi.encode(order)); lock(orderHash)                       SwapVM.sol:163-164
  2. (balanceIn, balanceOut) = Aqua.safeBalances(Safe, DeskRouter, orderHash, in, out) SwapVM.sol:194
        reverts if the strategy was docked or never shipped                           Aqua.sol:30-38
  3. runLoop over the program                                                         VM.sol:118-135
        #13 _deadline   block.timestamp <= strategy deadline                          Controls.sol:107-110
        #20 _salt       no-op
        #34 EnsGate     reads ETHRegistry, desk registry, clients registry, resolver R   (view)
        #35 DeskPrice   reads R (terms, spread), oracle; sets amountOut or amountIn;
                        emits DeskFill if !isStaticContext
  4. validate: tokenIn != tokenOut, amountIn > 0, amountOut > 0, taker threshold and deadline
                                                                                      SwapVM.sol:202-203
  5. transfers (default order: out first, then in; SwapVM.sol:205-211)
        out: Aqua.pull(Safe, orderHash, tokenOut, amountOut, MM)                      SwapVM.sol:286
              Aqua: virtual balanceOut -= amountOut; tokenOut.transferFrom(Safe → MM)  Aqua.sol:63-70
        in:  tokenIn.transferFrom(MM → DeskRouter); approve Aqua; Aqua.push(...)      SwapVM.sol:234-237
              Aqua: virtual balanceIn += amountIn; tokenIn.transferFrom(DeskRouter → Safe)  Aqua.sol:72-80
  6. unlock; emit Swapped(orderHash, Safe, MM, tokenIn, tokenOut, amountIn, amountOut)  SwapVM.sol:213-214
```
What changes after a fill:

- Safe token balances: −amountOut of tokenOut, +amountIn of tokenIn.
- Aqua virtual balances: the same deltas.
- MM balances: the mirror image.
- Events: `DeskFill`, then Aqua `Pulled` and `Pushed`, then `Swapped`.
Nothing else changes. ENS, the oracle and DeskRouter storage are untouched.
`quote(...)` runs steps 1–4 with `isStaticContext = true` and no lock and no transfers (`SwapVM.sol:111-154`). Its `taker` is also `msg.sender`, so **a quote must be an ****`eth_call`**** with ****`from`**** = the MM's address**, or #34 reverts.

### 4.3 How things change or stop

| Event | Who / how | Effect on the next fill | Re-ship needed? |
| --- | --- | --- | --- |
| Oracle moves | deployer `MockOracle.setAnswer` | new mid, same formula | no |
| Oracle goes stale (\> 3600 s) | nobody updates it, or deployer `setUpdatedAt` for the demo | #35 reverts `DeskPriceOracleStale` | no |
| Agent writes a spread | agent `R.setData(name, "desk.spread", …)` | new spread, clamped to `[sMin, sMax]`, until `validUntil` | no |
| Agent spread expires or is malformed | time passes | tier spread from `desk.terms` | no |
| Terms change (tier or cap) | Safe `R.setData(name, "desk.terms", …)` | new tier and cap | no |
| MM cut off | let `mm-a` expire, or Safe changes its `addr`, or sets cap 0 | #34 or #35 reverts | no |
| Whole desk off | `dao-treasury-a.eth` or `clients.dao-treasury-a.eth` expires, even if someone re-registers it | #34 reverts (`DeskMismatch` or `ClientsMismatch`) | no |
| Change w\*, κ, bounds, staleness, oracle, trusted ENS contracts | Safe, one MultiSend: `Aqua.dock(DeskRouter, oldHash, [WETH, USDC])` then `Aqua.ship(...)` with a **new salt** | old strategy's `safeBalances` reverts; new one is live | yes |
| Re-ship identical bytes | n/a | reverts `StrategiesMustBeImmutable` (`Aqua.sol:48`) | use a new salt |
| Emergency stop | Safe `Aqua.dock`, or revoke the ERC-20 allowance to Aqua | all fills revert | n/a |

`dock` must list both tokens (`Aqua.sol:57`). A docked strategy hash can never be shipped again.

## 5. On-chain contracts

### 5.1 `DeskRouter`
```solidity
// SPDX-License-Identifier: LicenseRef-Degensoft-SwapVM-1.1
// Derived from swap-vm v1.0.2 src/routers/AquaSwapVMRouter.sol (© 2025 Degensoft Ltd). Modified <date>: opcode table.
contract DeskRouter is Simulator, SwapVM, DeskOpcodes {
    constructor(address aqua, address weth, address owner, string memory name, string memory version)
        SwapVM(aqua, weth, owner, name, version) {}
    function _instructions() internal pure override returns (function(Context memory, bytes calldata) internal[] memory) {
        return _opcodes();
    }
}
```

- Same public ABI as `AquaSwapVMRouter` v1.0.2 (`quote`, `swap`, `hash`, `asView`, `simulate`, `rescueFunds`, `owner`, `AQUA`, `ORDER_TYPEHASH`). The bot and SDK work unchanged.
- `DeskOpcodes` has no constructor argument, because `Fee` (which needed `aqua`) is dropped.
- Deployed runtime size must stay below 24,576 bytes (EIP-170). This is checked by `forge build --sizes` in CI (T1 acceptance).

### 5.2 `DeskOpcodes`: the table

`contract DeskOpcodes is Controls, EnsGate, DeskPrice`. It uses the same array trick as upstream (`AquaOpcodes.sol:33-83`): a static array of length **37** whose slot 0 is overwritten with the length, so program byte `i` dispatches to array entry `i+1`. The result has 36 entries, indices 0–35.

| Index | Function | Note |
| --- | --- | --- |
| 0–9 | `_notInstruction` | debug slots, as upstream |
| 10 | `Controls._jump` | kept |
| 11 | `Controls._jumpIfTokenIn` | kept |
| 12 | `Controls._jumpIfTokenOut` | kept |
| 13 | `Controls._deadline` | **used** |
| 14 | `Controls._onlyTakerTokenBalanceNonZero` | kept |
| 15 | `Controls._onlyTakerTokenBalanceGte` | kept |
| 16 | `Controls._onlyTakerTokenSupplyShareGte` | kept |
| 17 | `_notInstruction` | was XYCSwap |
| 18 | `_notInstruction` | was XYCConcentrate |
| 19 | `_notInstruction` | was Decay |
| 20 | `Controls._salt` | **used** |
| 21 | `_notInstruction` | was flat fee |
| 22–26 | `_notInstruction` | unused upstream |
| 27–30 | `_notInstruction` | were protocol fees |
| 31 | `_notInstruction` | was PeggedSwap |
| 32 | `_notInstruction` | was Extruction |
| 33 | `Controls._onlyTxOriginTokenBalanceNonZero` | kept for parity, never in our program |
| 34 | `EnsGate._ensGate` | **new** |
| 35 | `DeskPrice._deskPrice` | **new** |

`_notInstruction` slots do nothing when executed. Index ≥ 36 panics (array out of bounds, `VM.sol:130`). So a mis-wired table fails silently, not loudly. Test T-OP-1 (§10) pins every index by behaviour.

### 5.3 #34 `EnsGate._ensGate(Context memory ctx, bytes calldata args) internal view`

**Program args** (variable length, 80 + suffix length; 108 bytes for `clients.dao-treasury-a.eth`):

| Offset | Size | Field |
| --- | --- | --- |
| 0 | 20 | `ethRegistry`: the ENSv2 registry for `.eth` |
| 20 | 20 | `deskRegistry`: the registry of `dao-treasury-a.eth` (its subregistry) |
| 40 | 20 | `clientsRegistry`: the registry of `clients.dao-treasury-a.eth` |
| 60 | 20 | `resolver` R: the treasury's PermissionedResolver |
| 80 | n | `suffix`: DNS-encoded `clients.dao-treasury-a.eth` including the terminal `0x00` (n = 28). It must be exactly three labels, and the last must be `eth`. |

**Taker args** (read, **not consumed**): `uint8 len ‖ dnsName[len]`. For example, `mm-a.clients.dao-treasury-a.eth` gives `len = 33` (§9).
**Behaviour, in order.** The first failing check reverts.

1. Parse args. Revert `EnsGateInvalidArgs()` if any of these hold:
	- `args.length < 80 + 3`
	- any address is zero
	- the suffix does not parse as exactly 3 labels ending in `eth` with a `0x00` terminator
2. `t = ctx.takerArgs()`. Revert `EnsGateMissingName()` if `t.length == 0` or `t.length < 1 + uint8(t[0])`. Let `dnsName = t[1 : 1 + len]`.
3. Split `dnsName` into `label` (first label) and `rest`. Revert `EnsGateNameNotUnderDesk()` if any of these hold:
	- the first length byte is 0 (the root name)
	- the first label's length byte overruns `dnsName`
	- `keccak256(rest) != keccak256(suffix)`
4. `d = IRegistry(ethRegistry).getSubregistry(suffixLabel[1])` (= `"dao-treasury-a"`). Revert `EnsGateDeskMismatch(d)` if `d != deskRegistry`. Zero means `dao-treasury-a.eth` is expired or has no subregistry. Any other value means someone else now controls `dao-treasury-a.eth`.
5. `c = IRegistry(deskRegistry).getSubregistry(suffixLabel[0])` (= `"clients"`). Revert `EnsGateClientsMismatch(c)` if `c != clientsRegistry`. Zero means `clients` is expired.
6. `expiry = IStandardRegistry(clientsRegistry).getExpiry(uint256(keccak256(bytes(label))))`. Revert `EnsGateNameExpired(expiry)` if `block.timestamp >= expiry`. This matches the registry's own rule (`PermissionedRegistry.sol:663-665`). An unregistered label has expiry 0 and reverts here.
7. `r = IRegistry(clientsRegistry).getResolver(label)`. Revert `EnsGateWrongResolver(r)` if `r != resolver`. The resolver must be set **on the ****`mm-a`**** label itself**; parent fallback is not accepted.
8. `a = abi.decode(IExtendedResolver(resolver).resolve(dnsName, abi.encodeCall(IAddrResolver.addr, (bytes32(0)))), (address))`. Revert `EnsGateTakerMismatch(a, ctx.query.taker)` if `a != ctx.query.taker`. `addr` is coin type 60 (`AbstractRecordResolver.sol:181-183`). The node argument is ignored by this resolver (`:109`).
Registry or resolver reverts bubble up unchanged. The gate modifies no context field.

### 5.4 #35 `DeskPrice._deskPrice(Context memory ctx, bytes calldata args) internal`

This function is not `view`, because it emits. That is allowed: the table's function type is non-view.
**Program args** (exactly 95 bytes, big-endian, packed):

| Offset | Size | Field | Default |
| --- | --- | --- | --- |
| 0 | 20 | `resolver` R (same as #34) |  |
| 20 | 20 | `oracle` (Chainlink `AggregatorV3Interface`) | MockOracle |
| 40 | 20 | `base`: the ETH-side token | MockWETH |
| 60 | 20 | `quote`: the USD-side token | MockUSDC |
| 80 | 1 | `oracleDecimals` | 8 |
| 81 | 1 | `baseDecimals` | 18 |
| 82 | 1 | `quoteDecimals` | 6 |
| 83 | 4 | `maxStaleness` (seconds) | 3600 |
| 87 | 2 | `wStarBps` (target ETH value share) | 7000 |
| 89 | 2 | `kappaBps` (κ in bps: 200 = 0.02) | 200 |
| 91 | 2 | `sMinBps` | 5 |
| 93 | 2 | `sMaxBps` | 200 |

Decimals are pinned in the args, so no `decimals()` calls happen at fill time.
**Taker args** (**consumed**): the same `uint8 len ‖ dnsName` that #34 read.
**Behaviour, in order.** WAD = 1e18. All intermediate products use `Math.mulDiv` (OpenZeppelin, already a swap-vm dependency) with the stated rounding.

1. Parse args. Revert `DeskPriceInvalidArgs()` if any of these hold:
	- `args.length != 95`
	- any address is zero
	- `base == quote`
	- any decimals \> 18
	- `maxStaleness == 0`
	- `wStarBps > 10000`
	- `kappaBps >= 10000`
	- `sMinBps > sMaxBps`
	- `sMaxBps >= 10000`
2. Name. `t = ctx.tryChopTakerArgs(1)`. Revert `DeskPriceMissingName()` if it is empty. Then `dnsName = ctx.tryChopTakerArgs(len)`; revert `DeskPriceMissingName()` if its length is short.
3. Pair. `baseIsIn = (tokenIn == base && tokenOut == quote)` and `baseIsOut = (tokenIn == quote && tokenOut == base)`. Revert `DeskPriceUnsupportedPair(tokenIn, tokenOut)` if neither holds.
4. Recompute guard. Revert `DeskPriceRecomputeDetected()` if `(isExactIn ? amountOut : amountIn) != 0`, following Aqua0's `ForexCurve.sol:231`.
5. Oracle. `(, int256 answer, , uint256 updatedAt, ) = latestRoundData()`.
	- Revert `DeskPriceOracleInvalid(answer)` if `answer <= 0`.
	- Revert `DeskPriceOracleStale(updatedAt, maxStaleness)` if `updatedAt > block.timestamp` or `block.timestamp − updatedAt > maxStaleness`.
	- Then `pWad = uint256(answer) · 10^(18 − oracleDecimals)`.
6. Records. `ret = R.resolve(dnsName, abi.encodeCall(IMulticallable.multicall, ([data(0,"desk.terms"), data(0,"desk.spread")])))`, then `m = abi.decode(ret, (bytes[]))`. Revert `DeskPriceInvalidRecords()` if `m.length != 2`. Each `m[i]` is `abi.encode(bytes value)`, or error bytes if that sub-call failed (`AbstractRecordResolver.sol:112-122`). Decode with the rules below. **Never call ****`abi.decode`**** on a record value directly**: read the words and range-check them.
	- Unwrapping `m[i]`: treat it as missing unless `m[i].length >= 64`, its first word is `0x20`, and its second word (the inner length) fits in `m[i].length − 64`. Otherwise `value = m[i][64 : 64 + innerLength]`.
	- `terms`: needs `value.length == 96`, `version == 1`, `tierBps <= 0xFFFF`, `capPerFill <= type(uint128).max` and `capPerFill > 0`. If anything fails, revert `DeskPriceNoTerms()`.
	- `spread`: valid only if `value.length == 96`, `version == 1`, `spreadBps <= 0xFFFF`, `validUntil <= type(uint64).max` and `block.timestamp <= validUntil`. If any condition fails, the spread record is ignored.
	- `sRaw = spreadValid ? spreadBps : tierBps`. `spreadSource = spreadValid ? 1 : 0`.
	- `sPolicy = clamp(sRaw, sMinBps, sMaxBps)`. The final `s` is set in step 7b.
7. Inventory share, from the pre-fill Aqua virtual balances:
	- `bBal = baseIsIn ? balanceIn : balanceOut`, `qBal = baseIsIn ? balanceOut : balanceIn`
	- `baseScale = 10^(18 − baseDecimals)`, `quoteScale = 10^(18 − quoteDecimals)`
	- `ethValue = mulDiv(bBal · baseScale, pWad, WAD)`, `usdValue = qBal · quoteScale`
	- Revert `DeskPriceEmptyBook()` if `ethValue + usdValue == 0`.
	- `wWad = mulDiv(ethValue, WAD, ethValue + usdValue)`
**Step 7b. Size floor (D16).** `book = ethValue + usdValue`.

- The taker's known amount is `amount = isExactIn ? amountIn : amountOut`, in token `known = isExactIn ? tokenIn : tokenOut`. Value it at mid: `notionalEst = (known == base) ? mulDiv(amount · baseScale, pWad, WAD) : amount · quoteScale`.
- `floorBps = ceil(kappaBps · notionalEst / (2 · book))`.
- `s = max(sPolicy, floorBps)`. If `floorBps > sPolicy`, then `spreadSource = 2`.
- Revert `DeskPriceSizeTooLarge(floorBps)` if `s >= 10000`. The floor can exceed `sMax`, which only makes the price worse for the MM.
1. Reference and quote prices. Signed math uses Solidity semantics, so division truncates toward zero.
	- `dev = int256(wWad) − int256(wStarBps · 1e14)`
	- `skew = int256(kappaBps) · dev / 10000`
	- `rWad = mulDiv(pWad, uint256(int256(WAD) − skew), WAD)`. Positivity is guaranteed by `kappaBps < 10000`.
	- `askWad = mulDiv(rWad, 10000 + s, 10000)` and `bidWad = mulDiv(rWad, 10000 − s, 10000)`
2. Amounts. The MM buys base at `ask` when base is out, and sells base at `bid` when base is in.
	- **base out, exactIn** (quote in): `amountOut = floor( floor(amountIn·quoteScale·WAD / askWad) / baseScale )`
	- **base out, exactOut**: `amountIn = ceil( ceil(amountOut·baseScale·askWad / WAD) / quoteScale )`
	- **base in, exactIn**: `amountOut = floor( floor(amountIn·baseScale·bidWad / WAD) / quoteScale )`
	- **base in, exactOut** (quote out): `amountIn = ceil( ceil(amountOut·quoteScale·WAD / bidWad) / baseScale )`
3. Limits.
	- `notional = baseIsIn ? amountOut : amountIn` (the quote leg, in quote units). Revert `DeskPriceCapExceeded(notional, capPerFill)` if `notional > capPerFill`.
	- Revert `DeskPriceInsufficientInventory(amountOut, balanceOut)` if `amountOut > balanceOut`. Aqua would underflow anyway; this is the readable error.
	- Zero amounts are left to SwapVM's validation (`TakerTraits.sol:173`, `MakerTraits.sol:161`).
4. Write the register: `ctx.swap.amountOut` (exactIn) or `ctx.swap.amountIn` (exactOut).
5. If `!ctx.vm.isStaticContext`: emit `DeskFill`.
```solidity
event DeskFill(
    bytes32 indexed orderHash,   // = strategyHash in Aqua
    bytes32 indexed nameHash,    // keccak256(dnsName)
    address indexed taker,
    bytes   dnsName,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 amountOut,
    uint256 midWad,              // pWad
    uint16  spreadBps,           // final s (after clamp and size floor)
    uint8   spreadSource,        // 0 = tier from desk.terms, 1 = agent desk.spread, 2 = size floor
    uint256 wBeforeWad           // wWad
);
```
`DeskFill` is emitted by DeskRouter during step 3 of §4.2, before the transfers. If a transfer later reverts, the event is rolled back too.

### 5.5 Mocks

- `MockWETH`: OZ `ERC20("Mock Wrapped Ether","WETH")`, 18 decimals, `mint(address,uint256)` open to anyone.
- `MockUSDC`: OZ `ERC20("Mock USD Coin","USDC")`, `decimals() = 6`, open `mint`.
- `MockOracle`: implements `AggregatorV3Interface` (`decimals`, `description`, `version`, `getRoundData`, `latestRoundData`).
	- Constructor `(uint8 decimals_, int256 initialAnswer)` sets `roundId = 1` and `updatedAt = block.timestamp`; the deployer becomes the owner.
	- `setAnswer(int256)` bumps the roundId and sets `updatedAt = block.timestamp`.
	- `setUpdatedAt(uint256)` lets the demo force staleness.
	- Both are owner-only.
Mocks are MIT-licensed; they are not SwapVM derivatives.

## 6. ENS read contract (what the ENS lane must provide)

### 6.1 Names

This page assumes the treasury owns every name (proposed; still open for the team, see Open questions in §13 and arch page §7).

The desk lives under the DAO's own name. `dao-treasury-a.eth` is a made-up demo DAO ("DAO A"). A real DAO uses a name it already owns, for example `mm-a.clients.ensdao.eth` for ENS DAO: #34 trusts whoever controls the parent, so a shared parent owned by a third party would make that party a middleman over every DAO's market-maker list. Only the pinned registries and the `suffix` in the program change; the contracts stay the same.

| Name | Where it lives | Requirement |
| --- | --- | --- |
| `dao-treasury-a.eth` | ETHRegistry label `dao-treasury-a` | registered, unexpired through the demo, subregistry = the DAO's UserRegistry `D` |
| `clients.dao-treasury-a.eth` | `D` label `clients` | registered, unexpired, subregistry = clients UserRegistry `C` |
| `mm-a.clients.dao-treasury-a.eth` (and `mm-b`, …) | `C` label `mm-a` | registered, expiry = end of that MM's access, **resolver set on this label = R** |
| `agents.dao-treasury-a.eth`, `risk.agents.dao-treasury-a.eth` | ENS lane's choice | not read by the router |

### 6.2 Records on resolver R (keyed by full name)

| Record | Name | Set with | Value |
| --- | --- | --- | --- |
| `addr` (coin type 60) | each MM name | `setAddress(dnsName, 60, abi.encodePacked(mmAddress))` (20 bytes) | MM EOA, or the MM contract wallet |
| data `desk.terms` | each MM name | `setData(dnsName, "desk.terms", abi.encode(uint8(1), uint16 tierBps, uint128 capPerFill))` | e.g. `(1, 10, 100_000e6)` |
| data `desk.spread` | each MM name | `setData(dnsName, "desk.spread", abi.encode(uint8(1), uint16 spreadBps, uint64 validUntil))` | written by the agent |
| default record (root name `0x00`) | n/a | n/a | **No ****`addr`****. ****`desk.terms`**** absent, or with ****`capPerFill = 0`****.** Names without their own record fall back to it (`PermissionedResolver.sol:381-387`). |

The encoding is `abi.encode`, so the value is exactly 96 bytes. `abi.encodePacked` values are ignored for spread and revert for terms.

### 6.3 Roles on R

These are the live constants on the migration branch (`PermissionedResolverLib.sol:16,43,48,58`): `ROLE_SET_TEXT = 1<<4`, `ROLE_SET_DATA = 1<<24`, `ROLE_LINK = 1<<28`, `ROLE_UPGRADE = 1<<124`.

- The Safe holds all root roles and their admins.
- The agent is granted `ROLE_SET_DATA` for key `desk.spread` and `ROLE_SET_TEXT` for key `desk.stats`, through `grantSetterRoles(setterCalldata, agent)` (`PermissionedResolver.sol:254`).
- No MM holds any role on R.

### 6.4 Interfaces the router calls (`IDeskEns.sol`)
```solidity
interface IRegistry { function getSubregistry(string calldata label) external view returns (address);
                      function getResolver(string calldata label) external view returns (address); }
interface IStandardRegistry { function getExpiry(uint256 anyId) external view returns (uint64); }
interface IExtendedResolver { function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory); }
interface IAddrResolver { function addr(bytes32 node) external view returns (address payable); }      // selector only
interface IDataResolver { function data(bytes32 node, string calldata key) external view returns (bytes memory); } // selector only
interface IMulticallable { function multicall(bytes[] calldata data) external returns (bytes[] memory); } // selector only
```
The return type `IRegistry` is declared as `address` here; the ABI is the same. Sources:

- `contracts-v2/contracts/src/registry/interfaces/IRegistry.sol:11,16`
- `PermissionedRegistry.sol:327` (`getExpiry`)
- `resolver/AbstractRecordResolver.sol:110` (`resolve`)
- `ens-contracts` `IDataResolver` (selector `0xecbfada3`)

### 6.5 What the ENS lane hands to the Aqua lane

These go into `config/sepolia.json` (§8.0):

- `ethRegistry`, `deskRegistry` (`D`), `clientsRegistry` (`C`), `resolver` (R)
- the suffix string (`clients.dao-treasury-a.eth`)
- the list of MM names with the addresses they point to

## 7. Off-chain library (`ts/src/lib`)

### 7.1 Encoders and price mirror (task T5)

All encoders take and return `0x`-prefixed hex or `bigint`. The Solidity `DeskArgs` library mirrors them.
```typescript
export function dnsEncode(name: string): Hex                         // "mm-a.clients.dao-treasury-a.eth" → 0x046d6d2d61…00
export function encodeGateArgs(a: { ethRegistry: Address; deskRegistry: Address; clientsRegistry: Address; resolver: Address; suffix: string }): Hex
export function encodePriceArgs(a: { resolver; oracle; base; quote: Address; oracleDecimals; baseDecimals; quoteDecimals: number;
                                     maxStaleness: number; wStarBps; kappaBps; sMinBps; sMaxBps: number }): Hex
export function encodeTakerArgs(name: string): Hex                    // uint8 len ‖ dnsName
export const deskInstructions: IOpcode[]                              // [...aquaInstructions, ensGateOpcode, deskPriceOpcode]; indices 34, 35
export function buildProgram(cfg: DeskConfig): SwapVmProgram          // deadline(13), salt(20), gate(34), price(35)
export function buildOrder(safe: Address, program: SwapVmProgram): Order  // MakerTraits: useAquaInsteadOfSignature = true, everything else default
export function strategyBytes(order: Order): Hex                      // order.encode(): what Aqua.ship receives
export function strategyHash(order: Order): Hex                       // keccak256(strategyBytes)
export function buildTakerData(a: { name: string; exactIn: boolean; threshold?: bigint; deadline?: bigint }): Hex
        // SDK TakerTraits.new({ exactIn, useTransferFromAndAquaPush: true, threshold, deadline,
        //                        instructionsArgs: encodeTakerArgs(name) }).encode()
export function priceMirror(input: { baseBal; quoteBal; answer: bigint; s: number; cfg: DeskConfig;
                                     side: 'buy'|'sell'; exactIn: boolean; amount: bigint }): { amountIn: bigint; amountOut: bigint; wWad; rWad; askWad; bidWad: bigint; sFinal: number; spreadSource: 0|1|2 }
        // implements §5.4 steps 7, 7b, 8, 9 (s is the policy spread; the size floor is applied inside)
export function decodeDeskFill(log): DeskFillEvent
export function encodeTerms(tierBps: number, cap: bigint): Hex        // abi.encode(uint8 1, uint16, uint128) for the ENS lane
export function encodeSpread(bps: number, validUntil: bigint): Hex    // abi.encode(uint8 1, uint16, uint64) for the agent
```
`deskInstructions` relies on the SDK's `aquaInstructions` array having index = contract opcode (`sdks/typescript/swap-vm/src/swap-vm/instructions/index.ts:118-155`; its comments count from 1, but array index 0 is the first entry). The two new `Opcode` objects need an `IArgsCoder` that wraps `encodeGateArgs` and `encodePriceArgs`.

### 7.2 Desk client (task T5b)

Every function the web app, the scripts and the bot need to read or change the desk. They are browser-safe: viem only, no Node APIs, no private keys. A caller passes a viem `PublicClient` and, for writes, gets back unsigned transactions; signing is always the caller's job (a wallet in the browser, a key in a script).
```typescript
type DeskCtx = { client: PublicClient; cfg: DeskConfig }   // cfg = parsed config/sepolia.json

// Strategy discovery: the chain is the source of truth, not a file.
export function findStrategies(ctx: DeskCtx): Promise<StrategyInfo[]>
    // Scans Aqua `Shipped` and `Docked` logs from cfg.deployBlock in chunks of cfg.logChunk blocks.
    // Aqua's events are not indexed (aqua/src/interfaces/IAqua.sol:45,51), so it filters client-side:
    // maker == cfg.safe && app == cfg.router. Decodes each Shipped `strategy` with Order.decode.
    // StrategyInfo = { strategyHash, order, program, decoded: DecodedProgram, shippedAt: {block, tx},
    //                  dockedAt?: {block, tx}, live: boolean }
export function findLiveStrategy(ctx: DeskCtx): Promise<StrategyInfo | null>
    // The newest StrategyInfo with live == true. If more than one is live, returns the newest and sets
    // `warning: "MULTIPLE_LIVE"`. The UI shows a red banner and the Controls page offers to dock the others.

// Program inspection
export function decodeProgram(program: Hex): DecodedProgram
    // Parses [opcode, len, args] triples. Knows 13, 20, 34, 35; anything else → { opcode, args, known: false }.
    // DecodedProgram = { deadline: bigint, salt: bigint, gate: GateArgs, price: PriceArgs, unknown: [...] }
export function describeProgram(d: DecodedProgram, cfg: DeskConfig): string[]
    // Plain-English lines for the review screen, e.g.
    // "Open until 2026-10-25 21:00 JST", "Only names under clients.dao-treasury-a.eth may trade",
    // "Price: oracle mid, skewed toward 70% ETH (κ 2%)", "Spread between 0.05% and 2.00%, set per name",
    // "Oracle older than 60 minutes blocks trading". Also flags any value that differs from cfg.

// Plans (unsigned transactions)
export type PlannedTx = { to: Address; data: Hex; value: 0n; label: string }
export function planShip(ctx: DeskCtx, p: { salt: bigint; ttlDays: number; wethAmt: bigint; usdcAmt: bigint;
                          policy?: Partial<PriceArgs> }): Promise<{ txs: PlannedTx[]; order: Order; strategyHash: Hex; program: Hex }>
    // txs, in order: [dock of the live strategy, if any] + [WETH.approve(aqua, max) if allowance < max]
    //                + [USDC.approve(aqua, max) if allowance < max] + Aqua.ship(...)
    // `policy` overrides cfg.desk values (the Open-a-desk wizard passes the user's choices).
    // Validates policy with the same rules as §5.4 step 1 and throws DeskError "INVALID_POLICY" before planning.
export function planDock(ctx: DeskCtx, strategyHash: Hex): PlannedTx
export function planMultiSend(txs: PlannedTx[]): PlannedTx   // one MultiSendCallOnly call (Safe v1.4.1 address from protocol-kit)

// Live state
export function readDeskState(ctx: DeskCtx, s: StrategyInfo): Promise<DeskState>
    // DeskState = { live, balances: { weth, usdc },   // Aqua.safeBalances
    //   safeWallet: { weth, usdc },                    // real ERC-20 balances of the Safe
    //   allowances: { weth, usdc },                    // Safe → Aqua
    //   pWad, oracleUpdatedAt, oracleStale: boolean,
    //   wWad, targetWad, rWad,
    //   mms: MmState[] }
    // MmState = { name, address, expiry, expired, resolverOk, terms?: {tierBps, cap}, spread?: {bps, validUntil, valid},
    //             sPolicy, askWad, bidWad, status: "ok" | "expired" | "no-terms" | "wrong-resolver" | "no-addr" }
    // Reads ENS the same way #34 and #35 do (§5.3 steps 4-8, §5.4 step 6), so the dashboard can never
    // show a name as tradable when the router would refuse it.
export function quoteFor(ctx: DeskCtx, s: StrategyInfo, q: { mm: MmRef; side: "buy" | "sell"; leg: "weth" | "usdc";
                          amount: bigint }): Promise<QuoteResult>
    // eth_call of router.quote from q.mm.address (§4.2 last paragraph). Leg rule as §8.4.
    // QuoteResult = { ok: true, amountIn, amountOut, priceWad, spreadBps, spreadSource, mirror: {...}, mirrorMatches }
    //             | { ok: false, error: DeskError }
export function buildSwapTx(ctx: DeskCtx, s: StrategyInfo, q: QuoteResult & { ok: true }, p: { slippageBps: number;
                             deadlineSec: number }): PlannedTx
export function planMmApprovals(ctx: DeskCtx, mm: Address): Promise<PlannedTx[]>   // router approvals if < max

// Counterparty terms (Safe transactions on resolver R; Treasury web app §5.3)
export function planSetTerms(ctx: DeskCtx, name: string, tierBps: number, cap: bigint): PlannedTx
    // R.setData(dnsEncode(name), "desk.terms", encodeTerms(tierBps, cap)); validates tierBps <= 0xFFFF, cap > 0
export function planCutOff(ctx: DeskCtx, name: string): PlannedTx
    // R.setData(dnsEncode(name), "desk.terms", encodeTerms(currentTier, 0)); the next fill reverts DeskPriceNoTerms

// History and verification
export function readFills(ctx: DeskCtx, s?: StrategyInfo, fromBlock?: bigint): Promise<FillRecord[]>
    // DeskFill logs from cfg.router, newest first, joined with the tx hash and block time.
export function verifyFill(f: FillRecord, cfg: DeskConfig): FillCheck
    // Recomputes r, ask/bid and the output amount from the event's midWad, spreadBps, wBeforeWad
    // and the input amount, with the same integer maths as §5.4. Returns each step and `matches: boolean`.
    // Powers the "Verify this fill" screen: anyone can recompute every fill.

// Errors
export function decodeDeskError(e: unknown): DeskError
    // DeskError = { code: string, args: Record<string, unknown>, title: string, hint: string, severity: "user" | "config" | "system" }
    // Knows every error in Desk dictionary §3 (ours, SwapVM, Aqua, ERC-20, ENS). Unknown → code "UNKNOWN" with the raw data.
```
Rules for the desk client:

- No function writes to the chain. Writes are returned as `PlannedTx`.
- No function caches across calls; the web app decides caching (Treasury web app §9).
- Every bigint stays a bigint to the UI; formatting is the UI's job with the rules in Treasury web app §6.

## 8. Scripts and the bot

### 8.0 Configuration

`config/sepolia.json` is checked in and holds no secrets:
```json
{ "chainId": 11155111,
  "aqua": "0x1111113ccf1426a8e30e2bff5e005d929bf6a90a",
  "ens": { "ethRegistry": "", "deskRegistry": "", "clientsRegistry": "", "resolver": "", "suffix": "clients.dao-treasury-a.eth", "universalResolver": "" },
  "tokens": { "weth": "", "usdc": "" }, "oracle": "", "router": "", "safe": "",
  "desk": { "oracleDecimals": 8, "baseDecimals": 18, "quoteDecimals": 6, "maxStaleness": 3600,
            "wStarBps": 7000, "kappaBps": 200, "sMinBps": 5, "sMaxBps": 200, "strategyTtlDays": 30,
            "shipWeth": "900000000000000000000", "shipUsdc": "400000000000" },
  "mms": [ { "name": "mm-a.clients.dao-treasury-a.eth", "address": "" }, { "name": "mm-b.clients.dao-treasury-a.eth", "address": "" } ],
  "deployBlock": 0, "logChunk": 50000, "explorer": "https://sepolia.etherscan.io" }
```
The default ship amounts, 900 WETH and 400k USDC, reproduce the pitch example (w = 0.9). `deployBlock` is the router's deploy block (written by Deploy.s.sol) and bounds every log scan.
`.env` is never committed; `.gitignore` already covers it. `.env.example` lists these keys:

- `SEPOLIA_RPC_URL`, `DEPLOYER_PK`
- `SAFE_OWNER_1_PK`, `SAFE_OWNER_2_PK`, `SAFE_OWNER_3_PK`
- `MM_A_PK`, `MM_B_PK`
- `ETHERSCAN_API_KEY`

### 8.1 `contracts/script/Deploy.s.sol`

`forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify`
It deploys, in order: MockWETH, MockUSDC, MockOracle(8, 4000e8), DeskRouter(`config.aqua`, MockWETH, deployer, "DeskRouter", "1.0.2-desk.1").
After deploying, it:

- asserts `DeskRouter.AQUA() == config.aqua`
- asserts the code size is \< 24,576
- writes `tokens`, `oracle`, `router` and `deployBlock` back into `config/sepolia.json` (via `vm.writeJson`)
It is idempotent only in the sense that it overwrites the fields; re-running deploys fresh contracts.

### 8.2 `ts/src/scripts/safe-setup.ts`

`pnpm safe:setup [--mint]`

1. If `config.safe` is empty, deploy a Safe with protocol-kit (`owners = addresses of SAFE_OWNER_1..3`, `threshold = 2`) and write `config.safe`.
2. With `--mint`, the deployer mints `shipWeth` and `shipUsdc` to the Safe, plus 100 WETH and 400k USDC to each MM address in `config.mms`.
3. Print the Safe address and its balances.

### 8.3 `ts/src/scripts/ship.ts`

`pnpm ship [--salt <n>] [--dock] [--no-ship] [--print-only] [--replay]`
The CLI twin of the web app's Open-a-desk and Controls flows. Both call the same desk client (§7.2), so they cannot disagree. The chain is the record: `findLiveStrategy` reads Aqua's `Shipped` and `Docked` events. The file `config/strategy.sepolia.json` is only a cache for humans and is rewritten after each run.

1. `live = findLiveStrategy(ctx)`. If `live` exists and neither `--dock` nor `--replay` is given, refuse: "a strategy is live (\<hash\>); pass --dock to replace it". This stops two strategies being live against the same Safe balance.
2. With `--replay`, re-send `live.order` bytes unchanged (only to demonstrate `StrategiesMustBeImmutable`). Otherwise `planShip(ctx, { salt: --salt or Date.now(), ttlDays, wethAmt: shipWeth, usdcAmt: shipUsdc })`. `planShip` already puts the dock of the live strategy first. With `--no-ship`, use only `planDock(ctx, live.strategyHash)`; if nothing is live, print "nothing to dock" and exit 0.
3. `planMultiSend(txs)`. With `--print-only`, print the Safe target, calldata and each label, and exit. Otherwise `protocolKit.createTransaction({ transactions, onlyCalls: true })`, sign with owners 1 and 2, execute with owner 1, and wait for the receipt.
4. Checks:
	- After a ship: the receipt has a `Shipped` log with the planned `strategyHash`; `Aqua.safeBalances(safe, router, hash, weth, usdc)` equals the ship amounts; `findLiveStrategy` returns exactly this hash.
	- After a dock: `safeBalances` for the old hash reverts `SafeBalancesForTokenNotInActiveStrategy`.
5. Rewrite the cache file from `findStrategies(ctx)`.
The emergency stop is `pnpm ship --dock --no-ship`.

### 8.4 `ts/src/bot/` (MM bot)

`pnpm bot <command> --mm mm-a [...]`. The key is chosen by name (`mm-a` → `MM_A_PK`). The bot finds the order with `findLiveStrategy` and quotes with `quoteFor`; it never reads the cache file.

| Command | Does |
| --- | --- |
| `approve` | `weth.approve(router, max)` and `usdc.approve(router, max)` from the MM key (via `planMmApprovals`) |
| `oracle [--price <usd>]` | uses `DEPLOYER_PK` to call `MockOracle.setAnswer`, with the given price or the current answer again. This refreshes `updatedAt` so fills don't go stale (`maxStaleness` = 3600 s) |
| `quote --side buy\|sell (--weth <x> \| --usdc <x>)` | `quoteFor` (an `eth_call` of `router.quote` **from the MM address**). Prints amountIn, amountOut, the implied price, and the `priceMirror` result; flags any mismatch |
| `fill --side buy\|sell (--weth <x> \| --usdc <x>) [--slippage-bps 10]` | quote, then `buildSwapTx` with threshold = quote ± slippage (min out for exactIn, max in for exactOut) and a 120 s taker deadline. Prints the tx hash and the decoded `DeskFill` |
| `loop --interval 30 [--weth 0.25] [--poke]` | every interval, alternates a buy and a sell of `--weth` WETH and logs each fill. With `--poke`, runs `oracle` first on each iteration (demo keep-alive) |

`side buy` means the MM buys WETH (tokenIn = USDC, tokenOut = WETH). Exactly one of `--weth` or `--usdc` is given, in human units converted by the token decimals. It fixes the leg the MM names, and that sets exactIn or exactOut:

| Side | `--weth x` | `--usdc x` |
| --- | --- | --- |
| buy | exactOut, receive exactly x WETH | exactIn, pay exactly x USDC |
| sell | exactIn, pay exactly x WETH | exactOut, receive exactly x USDC |

The on-chain `amount` argument is always that named leg (`TakerTraits.sol:179,189`). A revert is decoded with `decodeDeskError` and printed by name with its hint (Desk dictionary §3).

## 9. Golden vectors

Solidity tests and TS tests must both reproduce these values exactly. The placeholder addresses are `ethRegistry = 0x…e1`, `deskRegistry = 0x…d1`, `clientsRegistry = 0x…c1`, `resolver = 0x…a1`, `oracle = 0x…0a`, `base = 0x…ee`, `quote = 0x…dc` (20-byte, left-zero-padded).
**Encodings**
```javascript
suffix  (28)  07636c69656e7473 0e64616f2d74726561737572792d61 0365746800
gate   (108)  00000000000000000000000000000000000000e1 00000000000000000000000000000000000000d1
              00000000000000000000000000000000000000c1 00000000000000000000000000000000000000a1
              07636c69656e74730e64616f2d74726561737572792d610365746800
price   (95)  …a1 …0a …ee …dc 08 12 06 00000e10 1b58 00c8 0005 00c8
taker   (34)  21 046d6d2d61 07636c69656e7473 0e64616f2d74726561737572792d61 03657468 00
program(224)  0d05 006ab13b80 | 1408 0000000000000001 | 226c <gate> | 235f <price>
              (deadline 1790000000, salt 1)
terms value   0000…01 | 0000…0a | 0000…174876e800      (version 1, tier 10 bps, cap 100_000e6)
```
**Prices** (answer 4000e8 with 8 decimals, spread policy s = 10 bps, w\* = 7000, κ = 200). The size floor stays below 10 bps in every cell of these tables, so s = 10 throughout; the reference script asserts this.

| Vector | Balances (WETH / USDC) | wWad | rWad | askWad | bidWad |
| --- | --- | --- | --- | --- | --- |
| V1 overweight | 900e18 / 400,000e6 | 0.9e18 | 3984e18 | 3987.984e18 | 3980.016e18 |
| V2 at target | 700e18 / 1,200,000e6 | 0.7e18 | 4000e18 | 4004e18 | 3996e18 |
| V3 underweight | 100e18 / 1,200,000e6 | 0.25e18 | 4036e18 | 4040.036e18 | 4031.964e18 |

**Amounts**

| Vector | buy exactIn 3,987,984,000 USDC-units | buy exactOut 1e18 WETH | sell exactIn 1e18 WETH | sell exactOut 3,980,016,000 USDC-units | buy exactIn 1,000e6 | sell exactIn 0.5e18 |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | out 1000000000000000000 | in 3987984000 | out 3980016000 | in 1000000000000000000 | out 250753262801455572 | out 1990008000 |
| V2 | out 996000000000000000 | in 4004000000 | out 3996000000 | in 996000000000000000 | out 249750249750249750 | out 1998000000 |
| V3 | out 987115956392467789 | in 4040036000 | out 4031964000 | in 987115956392467790 | out 247522546828790634 | out 2015982000 |

V3's columns 1 and 4 show the rounding direction: exactIn output rounds down (…789) and exactOut input rounds up (…790).
**V4: the size floor binds** (V3 book, spread policy s = 5 bps):

- Buy exactIn 100,000e6 USDC: `floorBps = 7`, so s = 7, `spreadSource = 2`, and out = 24759675164946479981 WETH-wei.
- Selling that WETH back exactIn at the post-fill book: `floorBps = 7`, so s = 7, and out = 99982843971. The MM loses 17.156029 USDC.
- Without the floor (s = 5 on both legs), the same round trip would earn the MM 22.865007 USDC. Test T-P-10 pins this.
These were computed by the reference script in §9.1.

### 9.1 Reference script

This Python integer mirror reproduces every number above. It is kept inside this document, not as a source file, because the no-prior-code rule applies. Paste it into a file and run it with `python3`.
```python
"""Reference values for Desk system §9. Run: python3 <file>
Pure-integer mirror of #35 DeskPrice (§5.4) and the byte encodings (§5.3, §5.4, §7)."""

WAD = 10**18

def ceil_div(a, b):
    return -(-a // b)

def tdiv(a, b):  # Solidity signed division: truncate toward zero
    q = abs(a) // abs(b)
    return q if (a >= 0) == (b >= 0) else -q

def prices(base_bal, quote_bal, answer, s, w_star=7000, kappa=200, odec=8, bdec=18, qdec=6):
    """Steps 7-8 of §5.4 with a given final spread s (bps)."""
    p = answer * 10 ** (18 - odec)
    bs, qs = 10 ** (18 - bdec), 10 ** (18 - qdec)
    eth_value = base_bal * bs * p // WAD
    usd_value = quote_bal * qs
    w = eth_value * WAD // (eth_value + usd_value)
    skew = tdiv(kappa * (w - w_star * 10**14), 10**4)
    r = p * (WAD - skew) // WAD
    return dict(p=p, w=w, r=r, ask=r * (10**4 + s) // 10**4, bid=r * (10**4 - s) // 10**4,
                bs=bs, qs=qs, book=eth_value + usd_value)

def final_spread(s_policy, d, known_is_base, amount, kappa=200):
    """Step 7b of §5.4: size floor."""
    notional = amount * d["bs"] * d["p"] // WAD if known_is_base else amount * d["qs"]
    floor_bps = ceil_div(kappa * notional, 2 * d["book"])
    return max(s_policy, floor_bps), floor_bps

def buy_exact_in(d, usdc):    # base out, exactIn
    return (usdc * d["qs"] * WAD // d["ask"]) // d["bs"]

def buy_exact_out(d, weth):   # base out, exactOut
    return ceil_div(ceil_div(weth * d["bs"] * d["ask"], WAD), d["qs"])

def sell_exact_in(d, weth):   # base in, exactIn
    return (weth * d["bs"] * d["bid"] // WAD) // d["qs"]

def sell_exact_out(d, usdc):  # base in, exactOut
    return ceil_div(ceil_div(usdc * d["qs"] * WAD, d["bid"]), d["bs"])

def addr(x):
    return x.to_bytes(20, "big")

def dns(name):
    out = b""
    for label in name.split("."):
        out += bytes([len(label)]) + label.encode()
    return out + b"\x00"

def encodings():
    E, D, C, R, O, W, U = (addr(x) for x in (0xE1, 0xD1, 0xC1, 0xA1, 0x0A, 0xEE, 0xDC))
    suffix = dns("clients.dao-treasury-a.eth")
    gate = E + D + C + R + suffix
    price = R + O + W + U + bytes([8, 18, 6]) + (3600).to_bytes(4, "big") + b"".join(
        v.to_bytes(2, "big") for v in (7000, 200, 5, 200))
    name = dns("mm-a.clients.dao-treasury-a.eth")
    taker = bytes([len(name)]) + name
    deadline, salt = (1_790_000_000).to_bytes(5, "big"), (1).to_bytes(8, "big")
    program = (bytes([13, 5]) + deadline + bytes([20, 8]) + salt
               + bytes([34, len(gate)]) + gate + bytes([35, len(price)]) + price)
    terms = b"".join(v.to_bytes(32, "big") for v in (1, 10, 100_000 * 10**6))
    return dict(suffix=suffix, gate=gate, price=price, taker=taker, program=program, terms=terms)

BOOKS = [("V1 overweight", 900 * 10**18, 400_000 * 10**6),
         ("V2 at target", 700 * 10**18, 1_200_000 * 10**6),
         ("V3 underweight", 100 * 10**18, 1_200_000 * 10**6)]
ANSWER = 4000 * 10**8

if __name__ == "__main__":
    for k, v in encodings().items():
        print(f"{k:8} ({len(v):3}) {v.hex()}")
    # s_policy = 10; each cell checks the size floor stays below 10 (so s = 10 everywhere)
    cells = [("buy exactIn 3987984000", buy_exact_in, False, 3_987_984_000),
             ("buy exactOut 1e18", buy_exact_out, True, 10**18),
             ("sell exactIn 1e18", sell_exact_in, True, 10**18),
             ("sell exactOut 3980016000", sell_exact_out, False, 3_980_016_000),
             ("buy exactIn 1000e6", buy_exact_in, False, 1_000 * 10**6),
             ("sell exactIn 0.5e18", sell_exact_in, True, 5 * 10**17)]
    for label, b, q in BOOKS:
        d = prices(b, q, ANSWER, 10)
        print(label, {k: d[k] for k in ("w", "r", "ask", "bid")})
        for name, fn, known_is_base, amt in cells:
            s, floor_bps = final_spread(10, d, known_is_base, amt)
            assert s == 10, (label, name, floor_bps)
            print(f"    {name:26} {fn(d, amt)}")
    # V4: size floor binds. V3 book, s_policy = 5, buy exactIn 100,000e6 USDC, then sell the WETH back
    b, q = BOOKS[2][1], BOOKS[2][2]
    d0 = prices(b, q, ANSWER, 5)
    s1, f1 = final_spread(5, d0, False, 100_000 * 10**6)
    d1 = prices(b, q, ANSWER, s1)
    weth = buy_exact_in(d1, 100_000 * 10**6)
    print(f"V4 floorBps {f1} -> s {s1}; buy exactIn 100000e6 out {weth}")
    d2 = prices(b - weth, q + 100_000 * 10**6, ANSWER, 5)
    s2, f2 = final_spread(5, d2, True, weth)
    back = sell_exact_in(prices(b - weth, q + 100_000 * 10**6, ANSWER, s2), weth)
    print(f"   sell-back floorBps {f2} -> s {s2}; sell exactIn {weth} out {back}; MM P&L {back - 100_000 * 10**6}")
    no_floor = sell_exact_in(prices(b - buy_exact_in(d0, 100_000 * 10**6), q + 100_000 * 10**6, ANSWER, 5),
                             buy_exact_in(d0, 100_000 * 10**6))
    print(f"   without floor (s = 5 both legs): MM P&L {no_floor - 100_000 * 10**6}")
```

## 10. Test list (Foundry unless noted)

Test file names are set in advance so tasks don't collide. The full test catalogue with QA levels and owners is in Desk testing and quality gates §2; this section defines the contract and library tests exactly.
**`test/OpcodeTable.t.sol`** (T1)

- T-OP-1: a harness inherits `DeskOpcodes` and runs one opcode at a time over a fresh context. It asserts that:
	- 0–9, 17–19, 21–32 leave the context unchanged
	- 10 jumps
	- 13 reverts `DeadlineReached` with a past deadline
	- 14–16 revert with their Controls errors
	- 20 is a no-op
	- 33, with a token arg whose `tx.origin` balance is zero, reverts `TxOriginTokenBalanceIsZero`
	- 34 reverts `EnsGateInvalidArgs` on empty args
	- 35 reverts `DeskPriceInvalidArgs` on empty args
	- 36 panics (0x32)
- T-OP-2: `_opcodes().length == 36`.
- T-OP-3: DeskRouter runtime size \< 24,576 (`address(router).code.length`).
**`test/EnsGate.t.sol`** (T2). Uses `test/mocks/MockEnsRegistry.sol` and `MockEnsResolver.sol`, which mirror the semantics in §6: zero when expired, `resolve` plus `multicall` returning `abi.encode(bytes[])`.

- T-G-1: happy path, the MM calls with its own name.
- T-G-2 to T-G-9: one test per revert in §5.3, in order:
	- `InvalidArgs`
	- `MissingName` (empty and short)
	- `NameNotUnderDesk` (wrong suffix, root name, attacker path `mm-a.clients.evil.eth`)
	- `DeskMismatch` (desk expired; `dao-treasury-a.eth` re-pointed to another registry that links our clients registry)
	- `ClientsMismatch` (clients expired; clients relinked)
	- `NameExpired` (at expiry exactly; unregistered)
	- `WrongResolver` (unset; other resolver)
	- `TakerMismatch` (another MM's name; `addr` unset)
- T-G-10: the gate does not consume taker args (the cursor is unchanged after #34).
**`test/DeskPrice.t.sol`** (T3). Uses `MockOracle` and `MockEnsResolver`.

- T-P-1: every vector cell in §9, both directions, exactIn and exactOut.
- T-P-2: rounding favours the treasury, as a fuzz test. For random balances and amounts, `amountOut(exactIn)` ≤ the real value and `amountIn(exactOut)` ≥ the real value, and a round-trip never gains the taker anything.
- T-P-3: spread selection:
	- agent spread valid → used, source 1
	- expired, empty, wrong version, wrong length, or `abi.encodePacked` value → tier, source 0
	- clamp below `sMin` and above `sMax`
- T-P-4: terms missing, wrong length, wrong version, or `cap = 0` → `NoTerms`.
- T-P-5: cap. `notional == cap` passes; `cap + 1` reverts, in both directions.
- T-P-6: oracle answer 0 or negative → `OracleInvalid`; age `maxStaleness + 1` → `Stale`; age exactly `maxStaleness` passes; `updatedAt` in the future → `Stale`.
- T-P-7: `UnsupportedPair`, `RecomputeDetected`, `EmptyBook`, `InsufficientInventory`, `InvalidArgs` (each rule in §5.4 step 1).
- T-P-8: `DeskFill` is emitted with every field when non-static, and **not** emitted when `isStaticContext` (assert with `vm.recordLogs`).
- T-P-9: taker args are consumed; a trailing byte after the name remains.
- T-P-10: size floor. Check:
	- V4 amounts and `spreadSource = 2`
	- the floor never lowers s (a small fill keeps the policy spread)
	- `DeskPriceSizeTooLarge` when `floorBps >= 10000`
	- a fuzz test that a buy-then-sell-back or sell-then-buy-back round trip never ends with the MM holding more quote value (at mid) than it started with, for any book, `s >= sMin`, and notional ≤ cap
**`test/DeskRouter.integration.t.sol`** (T8). Deploys a real `Aqua` (from `lib/swap-vm/node_modules/@1inch/aqua/src/Aqua.sol`, identical to v1.0.0), DeskRouter, the mocks, and the ENS mocks. The maker is a plain account standing in for the Safe.

- T-I-1: ship, then MM-A fills buy exactIn and sell exactOut. Check:
	- Safe and MM balance deltas
	- Aqua `rawBalances` deltas
	- `DeskFill` and `Swapped` fields
	- the allowance flow (MM → router → Aqua → Safe)
- T-I-2: `quote` returns the same amounts as the following `swap`, and emits nothing.
- T-I-3: `quote` from a non-MM address reverts `EnsGateTakerMismatch`.
- T-I-4: dock, then swap reverts in `safeBalances`. Re-shipping the same bytes reverts `StrategiesMustBeImmutable`. Shipping with a new salt works.
- T-I-5: a contract-wallet MM (`test/mocks/ContractMM.sol`, which approves the router and calls `swap`, with `addr` = the contract) fills.
- T-I-6: MM-B passes MM-A's name → `TakerMismatch`.
- T-I-7: the taker threshold is enforced (min-out too high → `TakerTraitsInsufficientMinOutputAmount`).
- T-I-8: program bytes built by `DeskArgs.build*` equal the golden `program` hex (with the placeholder addresses).
- T-I-9: exact-amount allowance counter-example. The maker approves Aqua for exactly the ship amounts. Buys push USDC in and raise the USDC virtual balance. Later sells pull USDC out and push the cumulative USDC pulled past the approved amount. That pull reverts in `transferFrom` even though the virtual balance allows it. Repeat with a max approval: it passes. This documents D10.
**`test/fork/SepoliaEns.fork.t.sol`** (T2b and T9). Skipped unless `SEPOLIA_RPC_URL` is set.

- T-F-1 (hour 1, T2b): gas of `getSubregistry` ×2, `getExpiry`, `getResolver`, `resolve(addr)` and `resolve(multicall(data, data))` against an existing ENSv2 name on Sepolia. Report the numbers in the PR.
- T-F-2 (T9): full gate and price against the real `dao-treasury-a.eth` names once the ENS lane has created them.
**TS tests (****`ts/`****, vitest)** (T5)

- T-TS-1: every encoding in §9 matches byte-for-byte.
- T-TS-2: `priceMirror` reproduces every amount in §9, including V4. `priceMirror` implements step 7b.
- T-TS-3: `buildTakerData` decodes back with the SDK's `TakerTraits.decode`, and `instructionsArgs` equals the taker vector.
- T-TS-4: `strategyHash(order) == keccak256(order.encode())`, and it equals the Solidity `hash(order)` for the same order (the vector is recorded from T-I-8).
**TS desk client tests (****`ts/test/client/`****, vitest against a local anvil with the Foundry deployment)** (T5b)

- T-TS-5: `findStrategies` / `findLiveStrategy` after ship, after dock, after dock+ship, and with two live strategies (warning `MULTIPLE_LIVE`); log scanning across more than one chunk.
- T-TS-6: `decodeProgram(buildProgram(x))` round-trips every field; an unknown opcode is reported, not dropped; `describeProgram` lines for the default config match the literal strings in §7.2.
- T-TS-7: `planShip` orders transactions exactly as §7.2 and skips approvals already at max; `planMultiSend` calldata executes on a local Safe.
- T-TS-8: `readDeskState` matches the contract: for each MM status (ok, expired, no-terms, wrong-resolver, no-addr) the router's `quote` either succeeds or reverts with the matching error.
- T-TS-9: `quoteFor` equals `priceMirror` on every §9 vector configured on anvil; `mirrorMatches` is true.
- T-TS-10: `verifyFill` reproduces the amounts of real fills made in the anvil run, including a V4 size-floor fill.
- T-TS-11: `decodeDeskError` maps every error in Desk dictionary §3 raised in the anvil run to its code; an unknown revert returns `UNKNOWN` with raw data.

## 11. Interfaces to the other lanes

| Lane | Consumes from us | Provides to us |
| --- | --- | --- |
| ENS lane | §6 exactly; `encodeTerms` and `encodeSpread` from `ts/src/lib` | `ethRegistry`, `deskRegistry`, `clientsRegistry`, `resolver`, suffix, the MM name → address list, in `config/sepolia.json` |
| Risk agent (web app lane) | `readFills` and `findLiveStrategy` from the desk client, `DeskFill` (§5.4), `MockOracle` answers, `encodeSpread` | writes `desk.spread` (abi-encoded, version 1, `validUntil` required) and `desk.stats` |
| Web app lane | Only the desk client (§7.2) and encoders (§7.1). The app never builds calldata, never decodes events and never computes prices itself. | the web app built from Treasury web app, including the Safe signing flow (Treasury web app §7) |

What the other lanes may rely on:

- The router never reverts because of the agent's record.
- An expired name never fills.
- A fill never moves more than `capPerFill` of USDC notional.
- A fill never runs at a price better for the MM than `r·(1 ± sMin)`. The agent cannot push the spread past `sMax`; only the size floor can, and only against the MM.
- A buy followed by a sell back never profits the MM (D16).

## 12. License and attribution

This implements SwapVM-1.1 §2.4, §3.1 A–E and §7.4 (`swap-vm/LICENSES/SwapVM-1.1.txt:31,34-44,77`).

- `DeskRouter.sol`, `DeskOpcodes.sol`, `EnsGate.sol`, `DeskPrice.sol` and `DeskArgs.sol` use `// SPDX-License-Identifier: LicenseRef-Degensoft-SwapVM-1.1`. Instructions that run inside the router count as "Modify" (license §1.7(b)).
- Derived files keep the upstream `@custom:license-url` and `@custom:copyright` lines and add `/// @notice Derived from swap-vm v1.0.2 <path> (© 2025 Degensoft Ltd). Modified by the Desk team on <YYYY-MM-DD>: <what>.`
- The repo root keeps `LICENSES/SwapVM-1.1.txt` (copied verbatim) and a `NOTICE.md` that lists every modified file with its change and date, plus build and deploy instructions (§3.1 E).
- The README and web app footer show: **"Powered by SwapVM. Copyright © 2025 Degensoft Ltd."**.
- The TS lib uses the SDK (`LicenseRef-Degensoft-SwapVM-1.1`) unmodified, so it is Pure Caller Use; the lib itself can be MIT. Mocks and scripts are MIT.
- No text, logo or UI may suggest 1inch or Degensoft endorsement. Say "built on 1inch Aqua and SwapVM", not "1inch Desk".

## 13. Assumptions, open items and build-day checks

**Assumptions**

- A1: The treasury owns all MM names (proposed; see Open questions below and arch §7). If MMs own their names instead, #34 still works as long as the MM label's resolver is R and the MM holds no role on R. In that case, re-check whether an MM can change its own resolver (the arch page says yes); if so, the resolver check in step 7 is what stops it.
- A2: MockOracle drives the demo. Chainlink ETH/USD on Sepolia is `0x694AA1769357215DE4FAC081bf1f309aDC325306` (8 decimals) and plugs into the same args if wanted. That requires a re-ship.
- A3: Aqua on Sepolia is the official v1.0.0 bytecode (same address and bytecode as mainnet, per the 09-24 verification).
- A4: MMs are plain EOAs in the bot. A contract wallet is only proven in T-I-5.
**Build-day checks.** Each has an owner and a deadline.

- C1 (hour 0, Aqua lane): **ENS addresses disagree.** The handoff lists `ETHRegistry 0x657ea849…` and `RootRegistry 0x9703dbd2…` (unverified). Branch `deploy/sepolia-migration-20260915` (`contracts/docs/addresses/sepolia.md`, commit `07690a9`) lists `ETHRegistry 0x1bd29e26f09b4c68c623141673e5f0a5d02709f6`, `RootRegistry 0x0f62fbf8a820b4f2590a6631d846467da7384a55`, `UniversalResolverV2 0xc105976531cd90285b91fbef70ca7d8d6597095d`, `PermissionedResolverImpl 0x742b36ef4c9f0d8b9af99a1be555200e09d6ecc0`, `VerifiableFactory 0xd1e4b08ae3fd896d3e1990c6a73d4320940f3cdb`, `UserRegistryImpl 0xb146a81b83ac63065aeafa16f25971f70176143e` and `MockUSDC 0xf9a8540590bc66a2b98692cd6d20f122d947c752` (unverified). Neither set has been confirmed on-chain yet. Confirm which set has code and which one the ENS app uses, and record it in `config/sepolia.json`. This does not change the design, because every address is config.
- C2 (hour 0): role constants, re-read from the verified source of whichever `PermissionedResolverImpl` is live.
- C3 (hour 1, T2b): gas of the ENS reads (T-F-1). If the reads exceed \~250k, which puts a fill at roughly 400k or more (unverified), tell the page Owner. The proposed response (T2b Plan, fallbacks) is to keep the design and report the number, because Sepolia gas is only a demo cost.
- C4 (Friday, Aqua lane): whether 1inch accepts a Sepolia submission using the official registry and our router (unverified; ask on Discord).
- C5 (hour 0): `dao-treasury-a.eth` still unregistered on Sepolia (unverified).
**Open questions**

| Question | Proposed default | Who answers |
| --- | --- | --- |
| Does the treasury own every MM name, or does each MM own its own name (A1, §6.1)? | The treasury owns every name. | Team |
| During the demo, does the Safe edit `desk.terms` through the desk client (`planSetTerms`, `planCutOff`), or do the ENS lane's scripts? | The Safe edits terms through the desk client. | ENS lane |

**Out of scope for this lane:** the ENS name setup script, the risk agent's logic, the web app's code (built by the web app lane from Treasury web app), and MM commitments.
<details>
<summary>Change log</summary>

No entries while Draft.

</details>
