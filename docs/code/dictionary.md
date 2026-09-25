---
title: Desk dictionary
domain: Code
type: Explainer
status: Draft
as_of: 2026-09-24
written_from: [Desk system]
notion: https://app.notion.com/p/3e58f1ec11b481a881ddf68345804774
---

# Desk dictionary

This page defines the desk's shared terms, units and error catalogue, so code, UI, docs and pitch use one word per concept.
§3 is the single error catalogue: `decodeDeskError` (Desk system §7.2) implements it, the web app shows its titles and hints, and the bot prints them.

## 1. Terms

| Term (UI) | Term in code | Meaning |
| --- | --- | --- |
| Desk | (none) | The product: a treasury's standing two-sided quote to named market makers. |
| Treasury | maker, `order.maker` | The DAO's Safe. Holds the tokens; ships the program. |
| Market maker | taker, `ctx.query.taker` | A named counterparty that fills against the desk. |
| Program | strategy, order, `strategyBytes` | The SwapVM bytecode the Safe ships. Immutable once shipped. |
| Open a desk / Stop the desk | `ship` / `dock` | Aqua calls that start and end a program. |
| In the desk | virtual balance, `safeBalances` | What Aqua lets the program use from the Safe. A ceiling, not a deposit. |
| In the Safe | ERC-20 `balanceOf(safe)` | The tokens the Safe really holds. |
| ETH share | `w`, `wWad` | ETH value ÷ (ETH value + USDC value) of what is in the desk. |
| Target | `w*`, `wStarBps` | The ETH share the treasury aims for (70%). |
| Skew strength | κ, `kappaBps` | How far the reference price moves per point of distance from target. |
| Mid | `P`, `pWad`, `midWad` | The oracle price. |
| Reference price | `r`, `rWad` | The mid after the inventory skew. |
| Ask / bid | `askWad` / `bidWad` | The price at which the desk sells / buys ETH. |
| Spread | `s`, `spreadBps` | The final half-spread used, in bps. |
| Tier | `tierBps` in `desk.terms` | A market maker's default spread. |
| Agent spread | `desk.spread` | The spread the risk agent set for a name, valid until a time. |
| Size floor | `floorBps`, source 2 | The minimum spread a large fill pays (Desk system D16). |
| Spread range | `sMinBps`, `sMaxBps` | The treasury's bounds on the policy spread. |
| Cap per fill | `capPerFill` | Largest USDC notional a name may trade in one fill. |
| Name | DNS-encoded name, `dnsName` | A market maker's ENS name under `clients.dao-treasury-a.eth`. |
| Price feed max age | `maxStaleness` | Oldest acceptable oracle update, in seconds. |
| Desk closes | program deadline (`_deadline`) | After this time the program refuses every fill. |
| Verify a fill | `verifyFill` | Recomputing a fill's price from its event. |

## 2. Units

- Token amounts on-chain: WETH wei (18 decimals), USDC base units (6 decimals).
- Prices and shares on-chain and in the library: WAD (1e18 = 1.0), always USDC per ETH for prices.
- Spreads, skew, target, bounds: basis points (1 bps = 0.01%).
- Time: unix seconds on-chain; JST in the UI.
- Oracle answer: 8 decimals (MockOracle, and Chainlink ETH/USD (unverified)).

## 3. Error catalogue

Columns: the code `decodeDeskError` returns (the Solidity error name, or a client code in capitals) · who raises it · the UI title · the hint · severity (`user` = expected refusal, `config` = setup problem, `system` = bug or infrastructure).

### 3.1 Desk instructions (ours)

| Code | Title | Hint | Severity |
| --- | --- | --- | --- |
| `EnsGateInvalidArgs` | The desk program is misconfigured | The gate's settings in the program are invalid. The treasury must reopen the desk. | config |
| `EnsGateMissingName` | No name was sent | Trade from the Trade page, which sends your ENS name with the order. | system |
| `EnsGateNameNotUnderDesk` | That name isn't one of the desk's clients | Only names under clients.dao-treasury-a.eth can trade. | user |
| `EnsGateDeskMismatch` | The desk's ENS name is not active | dao-treasury-a.eth has expired or points somewhere else. The treasury must renew it. | config |
| `EnsGateClientsMismatch` | The client list is not active | clients.dao-treasury-a.eth has expired or was relinked. The treasury must renew it. | config |
| `EnsGateNameExpired` | Your name has expired | Ask the treasury to renew your name to trade again. | user |
| `EnsGateWrongResolver` | Your name isn't set up for the desk | Its resolver must be the treasury's resolver. Ask the treasury. | config |
| `EnsGateTakerMismatch` | This wallet isn't on the desk's list | Only the address in a client name's ENS record can trade under that name. | user |
| `DeskPriceInvalidArgs` | The desk program is misconfigured | The pricing settings in the program are invalid. The treasury must reopen the desk. | config |
| `DeskPriceMissingName` | No name was sent | Trade from the Trade page. | system |
| `DeskPriceUnsupportedPair` | This desk only trades WETH/USDC | Choose WETH and USDC. | user |
| `DeskPriceRecomputeDetected` | Internal pricing error | Please report this with the transaction data. | system |
| `DeskPriceOracleInvalid` | The price feed returned an invalid price | Trading is paused until the feed recovers. | user |
| `DeskPriceOracleStale` | The price feed is too old | Trading pauses when the price is older than the limit. It resumes on the next update. | user |
| `DeskPriceInvalidRecords` | Couldn't read your terms | The resolver returned something unexpected. Ask the treasury. | config |
| `DeskPriceNoTerms` | You have no trading terms | Your name has no terms, or its cap is zero. Ask the treasury. | user |
| `DeskPriceEmptyBook` | The desk is empty | The treasury has nothing committed to the desk. | config |
| `DeskPriceSizeTooLarge` | Too large for this desk | This size is too big relative to the desk. Try a smaller amount. | user |
| `DeskPriceCapExceeded` | Over your cap per fill | Your cap is \{cap\} USDC per fill. Split the trade. | user |
| `DeskPriceInsufficientInventory` | Not enough inventory | The desk holds only \{balanceOut\}. Try a smaller amount. | user |

### 3.2 SwapVM

| Code | Title | Hint | Severity |
| --- | --- | --- | --- |
| `DeadlineReached` | This desk has closed | The program's end date has passed. The treasury can open a new desk. | user |
| `TakerTraitsDeadlineExpired` | Your order expired | Get a fresh quote and fill again. | user |
| `TakerTraitsInsufficientMinOutputAmount` | Price moved beyond your slippage | Refresh the quote, or raise the slippage setting. | user |
| `TakerTraitsExceedingMaxInputAmount` | Price moved beyond your slippage | Refresh the quote, or raise the slippage setting. | user |
| `TakerTraitsAmountOutMustBeGreaterThanZero` | Amount too small | This amount rounds to zero. Enter a larger amount. | user |
| `MakerTraitsZeroAmountInNotAllowed` | Amount too small | Enter a larger amount. | user |
| `MakerTraitsTokenInAndTokenOutMustBeDifferent` | Choose two different tokens | (none) | system |
| `TakerTraitsTakerAmountInMismatch` / `…AmountOutMismatch` | Internal order error | Please report this with the transaction data. | system |
| `AquaBalanceInsufficientAfterTakerPush` | Settlement failed | Please report this with the transaction data. | system |

### 3.3 Aqua

| Code | Title | Hint | Severity |
| --- | --- | --- | --- |
| `SafeBalancesForTokenNotInActiveStrategy` | No desk is open | The treasury stopped the desk or hasn't opened one. | user |
| `StrategiesMustBeImmutable` | This exact program was already shipped | A program can't be shipped twice. Change the salt or a setting. | config |
| `DockingShouldCloseAllTokens` | This desk is already stopped | Nothing to stop. | config |
| `PushToNonActiveStrategyPrevented` | No desk is open | The desk was stopped during your trade. | user |

### 3.4 Tokens and ENS

| Code | Title | Hint | Severity |
| --- | --- | --- | --- |
| `ERC20InsufficientAllowance` (spender = router) | Approve the router first | Click "Approve router" once. | user |
| `ERC20InsufficientAllowance` (spender = Aqua) | The treasury's approval is missing | The Safe must approve Aqua. Reopen the desk from Controls. | config |
| `ERC20InsufficientBalance` (from = MM) | Not enough tokens in your wallet | Top up your wallet or trade less. | user |
| `ERC20InsufficientBalance` (from = Safe) | The Safe doesn't hold enough | The desk allows more than the Safe holds. The treasury must top up or reopen with less. | config |
| `SafeERC20FailedOperation` | Token transfer failed | Please report this with the transaction data. | system |
| `EACUnauthorizedAccountRoles` | Not allowed | This account doesn't hold the role for that record. | user |
| `LabelExpired` | That name has expired | Renew it first. | user |

### 3.5 Client-side codes (no revert involved)

| Code | Title | Hint | Severity |
| --- | --- | --- | --- |
| `WRONG_NETWORK` | Wrong network | The desk runs on Sepolia. | user |
| `NOT_SAFE_OWNER` | Connect a Safe owner | Only the treasury's owners can do this. | user |
| `SAME_OWNER` | That owner has already signed | Switch to another Safe owner. | user |
| `NO_LIVE_STRATEGY` | No desk is open | The treasury hasn't opened one yet. | user |
| `MULTIPLE_LIVE` | More than one desk program is live | Close all but the newest from Controls. | config |
| `INVALID_POLICY` | Check the highlighted setting | (the field's own message) | user |
| `QUOTE_EXPIRED` | Quote expired | Refresh the quote. | user |
| `USER_REJECTED` | Cancelled | (toast only) | user |
| `RPC_UNAVAILABLE` | Can't reach Sepolia | Retrying. Showing the last data we had. | system |
| `UNKNOWN` | Something went wrong | Show details for the raw error. | system |

Placeholders in braces (`{cap}`, `{balanceOut}`) are filled from the error's arguments, formatted with Treasury web app §6.
<details>
<summary>Change log</summary>

No entries while Draft.

</details>
