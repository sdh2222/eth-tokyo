# Handoff: sell only in the blocks after an oracle update

2026-09-26. This decision is not in the architecture yet. The same day the team confirmed the oracle rule as a hard limit on the number of blocks after an update. An agent switch or an off-chain keeper is not in this version, because of the dependency and the uptime. It can be a follow-up. The reader changes the pricing from this document alone.

Documents that still describe the old pricing: "How the price would move" in `value-proposition.md`, and `OracleSkewQuote` in `research/how-it-works-brief.md`. Both shift the Chainlink mid down by the inventory share, then put a spread on either side of that line. Drop that formula.

## What we are doing

A treasury converts ETH to USDC over months. It does not put 10,000 ETH on the market in one order. The counterparties are market makers it named in advance. The ETH stays in the multisig until a fill.

Two goals.

1. DCA. Each fill sells a small amount. A later slice does not need a new vote.
2. Smaller loss on the sale. The DAO avoids the cost of selling into the pool itself. The market maker buys cheaper than on the pool. The spread is how that difference is split. It is not a discount under the screen, used to push inventory out.

## Problem 1. The oracle and the exchange

The Chainlink price lags the exchange. Mainnet ETH/USD usually updates after a 50 bp move or after one hour. Whether the Sepolia feed matches that is unchecked. The place to check is the Chainlink row in `docs/research/research-log.md`.

A quote left open between updates does this. Chainlink says $4,000, the exchange is already $4,040, and our ask is near $4,000. A named market maker buys from us and sells on the exchange. ENS does not stop that address. It is on the list.

Widening the ask to 50 bp shrinks that pick-off. The ask is then more expensive than the 5 bp fee on the Uniswap 0.05% pool, so ordinary buys stop too. The width that stops a pick-off and the width that gets a counterparty to buy cannot both be in force.

A `swap()` cannot wake an off-chain agent in the middle of the transaction. The transaction reads values already on the chain, or it reverts. An agent transaction that changes the spread lands in a later block. A fill that landed first uses the old price. Moving the width from 2 bp to 10 bp still leaves the ask cheap if the exchange is $40 higher.

## Problem 2. The current spread is a bad sale for the DAO

The old formula. Mid is $4,000. When the ETH share is above target, the formula sets a base of $3,984. Adding a 10 bp sell spread produces an ask of $3,988.

There was no trade at $3,984. A sale at $3,988 is $12 under the screen. That $12 is the market maker's gain. It is not a spread the DAO received. The bid is about $3,980, so a holder of ETH sells on the screen instead. In this region the desk only sells. There is no round trip that earns a spread.

The comparison we want is not that discount. Milkman sells 10,000 ETH in one order and accepts as little as 98% of the pool price at that moment. The 2% limit is about $323,000 of room on this size. The spread actually paid is not public. The cost we are cutting is that taker cost.

## Decision

Three rules, used together.

### 1. Open only for a few blocks after the oracle update

Team decision. This version uses only a hard limit in the router. Opening and closing the quote with an agent switch or an off-chain keeper is not in this version, because of the dependency and the uptime. It can be a follow-up.

The strategy is shipped once. The keeper does not `dock()` and `ship()` on every update.

Chainlink does not report the update's block number. It reports `updatedAt`. The block limit is this check.

```
block.timestamp - updatedAt <= MAX_BLOCKS * 12 seconds
```

Ethereum blocks are 12 seconds. `MAX_BLOCKS` of 2 is about 24 seconds. `MAX_BLOCKS` of 3 is about 36 seconds. The integer is not fixed yet. What gets fixed is a block count, not a number of seconds chosen on its own.

Inside the window, Chainlink has just been set to the exchange. Outside it, there is no quote. The 50 bp hole is what you get by leaving the quote open all day. This rule closes it.

What remains is the exchange moving during those few blocks. That loss is a few bp, the same size as the gain on the sale. The per-name cap N bounds the size of that fill. The counterparties are institutions. They are built to trade inside that window. This is not a design against an anonymous bot picking off a quote that sits open all day. The gap inside those few blocks is accepted.

The DCA is not a TWAP that sells every 10 minutes. Each oracle print opens a window in which that name can buy up to N. One name buying 50 ETH once an hour is more than 10,000 ETH in a year. If nobody comes in the window, that hour sells nothing.

### 2. The spread sits on the oracle price, tighter on the sell

The mid is not pushed under the screen. The mid is the Chainlink `answer`.

```
ask = mid * (1 + s_sell)
bid = mid * (1 - s_buy)
s_sell < s_buy
```

The example is `s_sell = 2 bp`, `s_buy = 15 bp`. Those are not fixed constants.

At a mid of $4,000 the ask is $4,000.80 and the bid is $3,994.

- Ask $4,000.80. The DAO receives $0.80 per ETH more than the screen. At zero spread it receives the screen price. Selling into the pool means the DAO pays the 5 bp fee on the 0.05% pool. Not paying that fee is the gain on the sale.
- Bid $3,994. A holder of ETH sells on the screen instead. Almost nobody delivers more ETH to the desk. Only the sell side accumulates, so the ETH share falls.
- Why the market maker buys. $4,000.80 is cheaper than the 5 bp pool fee, about $2 per ETH. Size also walks the pool price. How many bp 50 ETH walks the 0.05% pool has not been measured.

This is not a round trip that earns both sides of the spread. Each ETH the treasury already meant to sell receives the thin sell width on top.

### 3. Stop selling once the share passes the target

When the ETH value share `w = B_ETH * mid / (B_ETH * mid + B_USDC)` is at or below the target `w*`, sells revert. The example is `w* = 0.70`.

Left at 2 bp forever, the ask stays attractive and ETH sells through the target. The stop is on the inventory share. An agent does not decide that the oracle is wrong.

There is no reason to keep buying once the book is under the target. The desk's job is to reduce ETH. Reaching the target can revert sells only. Whether buys revert on the same condition is decided in the implementation, and it should use the same test.

## One fill

1. Only a named address passes. Missing or expired reverts.
2. Over that name's per-fill cap N reverts. The example is 50 ETH.
3. `updatedAt` older than `MAX_BLOCKS` reverts.
4. `w <= w*` reverts a sell.
5. A sell uses `ask`. A buy uses `bid`.
6. Aqua `pull()` / `push()`. A failure reverts the whole transaction. ETH leaves the multisig only in a fill that succeeds.

## Do not

- Do not push the mid under the screen because inventory is heavy. Do not use `r = mid * (1 - kappa * (w - w*))`.
- Do not describe the gap between $3,984 and $3,988 as a spread the DAO earned.
- Do not have an agent `dock()` and `ship()` on every oracle update.
- Do not wake an off-chain keeper inside `swap()` or on the update timestamp in this version. Opening and closing the quote with a keeper is a follow-up.
- Do not widen the spread to the oracle gap (tens of bp) to stop pick-offs. The ask then loses to the pool.
- Do not write that ENS DAO paid the spread, or paid 0.5%. What is public is a 2% limit, and a fill 0.5% ($80,992.87) better than that limit.

## Not measured yet

- The Sepolia ETH/USD deviation and heartbeat. Only the integer `MAX_BLOCKS` waits on that. The mechanism is already a block-count hard limit.
- How far 50 ETH walks the 0.05% pool. The sell width has to be inside that walk plus the 5 bp fee, or the market maker does not come.
- Whether anyone fills inside the window. If nobody comes, nothing sells. A sale that must clear by next week is a Milkman order, not this.
