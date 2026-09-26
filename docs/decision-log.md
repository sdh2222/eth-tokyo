# Decision log

2026-09-26. Henry's picture after the pricing walk on this date. The sell-window handoff is `docs/handoff-sell-after-oracle-update.md`. That handoff is the pricing decision. It is not implemented in the open pull requests. This file records what Henry is holding, then what a read of the pull requests contradicts.

## Held

- The Safe is the maker. It holds the ETH and the USDC and ships the order. Tokens stay in the Safe until a fill.
- `mm-a` and `mm-b` are named counterparties. The letters MM mean an allowed counterparty. They do not post the inventory. Aqua records that counterparty as `taker`.
- A client name is `mm-a.clients.dao-treasury-a.eth`. The clients registry holds that label, its expiry, and which resolver to ask. The resolver stores records on the full name. `desk.terms` is written by the Safe. The Safe appoints one agent for the desk, holds that key, and that agent may write `desk.spread`. This repo publishes the read. The note is `docs/agent-design.md`.
- Opcode 34 checks that the address on the name is the counterparty on the Aqua query. That behavior is merged (PR #6).
- The book is ETH marked at the oracle mid, plus USDC. A sale near that mid removes ETH value and adds about the same number of USDC, so the book stays about the same size. On 900 ETH and 400,000 USDC at a mid of 4,000, 70% is about 700 ETH left, which is about 200 ETH sold.
- The 70% line is recomputed from the balances on every fill. There is no stored counter of 200 ETH.
- The demo oracle is `MockOracle`. It starts at 4,000 with 8 decimals. It stays at 4,000 until the deployer calls `setAnswer`. `setUpdatedAt` refreshes the timestamp only.
- Pricing decision from the handoff, which replaces the inventory-skew quote:
  - The mid is the oracle answer. Inventory does not push the mid under the oracle.
  - `ask = mid * (1 + s_sell)`, `bid = mid * (1 - s_buy)`, with `s_sell` tighter than `s_buy`.
  - A fill is allowed only for a few blocks after `updatedAt`. The check replaces "stale after 3600 seconds." The strategy stays shipped. Nothing docks and re-ships on each update.
  - When `w <= w*`, a sell reverts. The example target is 0.70.
- The agent can still move the spread. PR #18's inventory-deviation formula is not the decided rule. The Safe's agent writes the spread. This repo does not run that agent. A keeper that opens the quote or docks on each update stays out of this version.

## Illustrations, not fixed

- Sell 3 bp and buy 10 bp (ask 4,001.20, bid 3,996 at a mid of 4,000). Henry used these in the walk. The handoff's example is 2 bp and 15 bp, and it says those integers are not fixed.
- `MAX_BLOCKS` of 2 or 3. The handoff says the integer is not fixed. What is fixed is that the limit is a block count.
- Whether a buy also reverts once `w <= w*` is left open by the handoff.
- The handoff's per-fill example is 50 ETH. That number is an example.

## Superseded for this version

- The quote `r = mid * (1 - kappa * (w - w*))`, then one spread on both sides of `r`. That is the 3,984 / 3,987.984 path.
- A keeper opening or closing the quote, and docking plus re-shipping on each oracle update.
- PR #18's current `chooseSpread`: one width from `|w - w*|`, valid for one hour. An agent that writes spread can stay. That formula does not.

## Action items

Henry, 2026-09-26, after the review. The contract pass locks the open integers: `MAX_BLOCKS` is 3, the sell width is 3 bp, the buy width is 10 bp, the per-fill cap is 50 WETH, and a buy still fills when `w <= w*`. Opcode 35 reads `desk.terms` only. The review below is the picture of the code before that pass.

1. **Freshness window.** In the order args and in opcode 35, stop using `maxStaleness` of 3600 seconds. A fill is allowed only while `block.timestamp - updatedAt` is within a few blocks (`MAX_BLOCKS * 12` seconds), then it reverts. "Stale after a few blocks" and "open for a few blocks" are that same check. The block count is not chosen yet.

2. **Drop the skewed mid.** Change PR #8 `DeskPrice._quotes` and PR #9 `priceMirror` so the mid is the oracle answer. `ask = mid * (1 + s_sell)`, `bid = mid * (1 - s_buy)`, with the sell width tighter than the buy width. The 3 bp / 10 bp pair and the handoff's 2 bp / 15 bp pair are examples, not the constants.

3. **Store two widths.** `desk.terms` and `desk.spread` each hold one basis-point number today, and that number is applied to both sides. The records need a sell width and a buy width. Who is allowed to write each one is part of the agent discussion in item 6.

4. **Stop a sell at the target.** When `w <= w*`, a sell reverts. `w*` stays a share of the current book, recomputed every fill, not a stored count of ETH. Whether a buy reverts on the same test is still open.

5. **Per-fill cap unit.** The code compares the fill with a USDC cap (tests use 100,000 USDC). The handoff's example is 50 ETH. Pick the unit and store it in `desk.terms` before changing the check.

6. **Agent, as a discussion, not a deletion.** Keep an agent that can move the spread. Do not merge PR #18's formula as the rule. Decide the spread logic and which agent system runs it. The agent still must not change address, cap, expiry, or the oracle, and it does not dock or re-ship the order. Settled the same day: the Safe appoints that agent and holds the key, and this repo publishes the read. The note is `docs/agent-design.md`.

7. **Demo oracle script.** Add a deployer script that calls `MockOracle.setAnswer` on a realistic path, so `updatedAt` refreshes and the few-block window opens during the demo. The price must move. Leaving the answer at 4,000 all afternoon leaves the quote closed under item 1. The path itself is not chosen yet.

8. **Fix `docs/design-constraints.md`.** Replace the skewed-mid formula with the oracle mid and the two widths. Call `mm-a` an allowed counterparty. Describe the merged gate: `addr` is compared to the counterparty on the Aqua query (`ctx.query.taker`), and expiry is checked on the client label. Replace the line that treats PR #18's bounded inventory spread as already decided.

## Review against the pull requests

Read on 2026-09-26. Merged: #1, #2, #3, #4, #5, #6, #7. Open and relevant: #8 Desk price, #9 encoders and price mirror, #18 risk agent. `docs/design-constraints.md` still states the old price formula as a gate.

Henry's picture of roles, the name check, and the book matches the merged work and the handoff. It does not match the open price code. The collisions:

1. PR #8 and #9 still skew the mid. `_quotes` in `contracts/src/instructions/DeskPrice.sol` sets `r = p * (1 - kappa * (w - w*))`, then `ask = r * (1 + s)` and `bid = r * (1 - s)` with the same `s`. `ts/src/lib/price.ts` copies that. Config ships `kappaBps` 200 and `wStarBps` 7000, which is the 3,984 center on the 900 ETH book. The handoff says to drop this.

2. One width, not two. `desk.terms` is `(version, tierBps, cap)`. `desk.spread` is `(version, spreadBps, validUntil)`. Both are a single basis-point number, clamped to `[sMin, sMax]`, and applied symmetrically. There is no `s_sell` / `s_buy` field. Henry's 3 bp / 10 bp quote cannot be stored in the current records.

3. The freshness check is the opposite window. The order arg is `maxStaleness`, and config sets it to 3600 seconds. A fill reverts when the oracle is older than one hour. The handoff allows a fill only for `MAX_BLOCKS` blocks after `updatedAt`, about 24 or 36 seconds, and closes the quote after that. The same `updatedAt` field is used. The allowed age is different, and 3600 is the old value.

4. Selling does not stop at 70%. PR #8 uses `w*` only to move the mid. A sell below the target still fills, at a higher mid. The handoff reverts that sell.

5. The per-fill cap is USDC, not ETH. PR #8 compares the USDC size of the fill with the `uint128` cap in `desk.terms`. Tests use 100,000 USDC. The handoff's example cap is 50 ETH. The unit is undecided relative to his picture.

6. PR #18's formula is not the spread rule. `chooseSpread` on `aqua/risk-agent` sets one `desk.spread` from the distance between `w` and `w*`, valid for one hour. It does not set a tighter sell width, and it does not open or close the quote. Henry kept an agent in this version. The logic and the system are action item 6.

7. The mock oracle and the window do not run themselves. `MockOracle` does not follow ETH. Under the handoff, a fill is possible only in the few blocks after the deployer calls `setAnswer` or `setUpdatedAt`. A mid that sits at 4,000 all afternoon is a closed quote. Henry's "the price stays 4,000" and "trade in the blocks after an update" are both right, and together they mean the demo is closed except right after that call.

8. `docs/design-constraints.md` still requires the old formula ("Chainlink mid, skewed by inventory") and still says the risk agent may write a bounded spread. It also calls `mm-a.clients.ensdao.eth` a maker, and it says the gate checks `msg.sender` and expiry at each registry level. The merged gate compares `addr` to `ctx.query.taker`, and it checks expiry only on the client label. Henry's taker picture matches the code. The constraint file matches neither the code nor the handoff.

No order is shipped. `config/sepolia.json` still has empty `oracle`, `router`, `tokens.weth`, and `tokens.usdc`.
