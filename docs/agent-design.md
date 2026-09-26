# Agent design

The quote on router `1.0.2-desk.4` (`0x82b5303b41E0963C10c2fdA2fe5AF3732877204C`) scales the two widths by the inventory percentage. It does not move the oracle. This note does not merge PR #18.

## What the quote does

The oracle answer is the price. On a book that is 90% ETH, the distance from the 70% target is 0.20. The stored 3 bp sell width is multiplied by 0.80, and the stored 10 bp buy width is multiplied by 1.20. At an oracle of 4000 the ask is 4000.96 and the bid is 3995.20. Below 70% ETH the sell width grows and the buy width shrinks. A sell still reverts at or below 70%. The router does not read `desk.spread`.

The walker on this machine moves the mock mid by $1 on each new Sepolia block, between 3980 and 4020. That changes the oracle. It does not change the widths.

## What PR #18 would add

`chooseSpread` on `aqua/risk-agent` widens one `desk.spread` from the same distance, `|w - 0.70|`. The router already uses that distance to scale the two widths. Reading `desk.spread` as well would count the inventory gap twice. The router ignores that record, so the write does not change what a counterparty pays.

## Job left

An agent may still write `desk.spread`. It may not change address, cap, expiry, or the oracle. A counterparty's price changes from that record only after a later router is changed to read it. This pass does not grant the write, and it does not merge PR #18.
