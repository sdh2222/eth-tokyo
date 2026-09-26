# Agent design

The Safe owns one agent. This repo publishes the book and the screen. The agent signs `desk.spread` and `desk.stats`. PR #18's inventory formula stays out.

The quote on router `1.0.2-desk.4` (`0x82b5303b41E0963C10c2fdA2fe5AF3732877204C`) scales the two widths by the inventory percentage. It does not move the oracle. It does not read `desk.spread`.

## Who the agent is

The Safe appoints one address and records it on `risk.agents.<desk>.eth`. That address may write `desk.spread` and `desk.stats` on the desk resolver. It may not change an address, the cap, an expiry, or the oracle, and it does not dock or re-ship the order.

One agent per Safe, created when that Safe's resolver is deployed. `grantSetterRoles` runs then, once for `desk.spread` and once for `desk.stats`. A new Aqua order does not get a new agent. `ship` and `dock` leave the grant where it is. Replacing the agent is a separate act: the Safe revokes the old address and grants the new one.

The ENS grant covers every name on that resolver, and each treasury has its own resolver. A counterparty's key signs that counterparty's fill. It does not receive the spread grant.

The Safe holds the agent's key and runs the process. This repo does not hold the key and does not send the spread transaction.

## What this repo provides

A read of the book in the router's units, `GET /v1/desks/{name}`, as `DeskBook` in `ts/src/lib/agent.ts`: the oracle answer and its age, the ETH share, the widths and the cap in `desk.terms`, the spread on the name and its `validUntil`, and which counterparty names are still live. The read moves when a fill lands or the oracle moves. There is no write endpoint.

The bytes their writer must match. `encodeAgentSpread` is `abi.encode(uint8 1, uint16 sellBps, uint16 buyBps, uint64 validUntil)`, 128 bytes. `encodeAgentStats` is the text JSON `{version, sellBps, buyBps, validUntil, writtenAt}`. `planAgentWrites` returns the unsigned `setData` and `setText`. The live widths have to sit inside the Safe's widths. The older `encodeSpread` still stores one `spreadBps`. This pass does not teach opcode 35 to read the new record.

The screen. For the Safe: the quote a fill would pay now, the fence in `desk.terms`, the counterparty book, and the agent address with its last widths. For a counterparty: that quote, their name, and whether the gate would pass.

A default policy they can copy. The policy they run is theirs.

## What the quote does

The oracle answer is the price. On a book that is 90% ETH, the distance from the 70% target is 0.20. The stored 3 bp sell width is multiplied by 0.80, and the stored 10 bp buy width is multiplied by 1.20. At an oracle of 4000 the ask is 4000.96 and the bid is 3995.20. Below 70% ETH the sell width grows and the buy width shrinks. A sell still reverts at or below 70%.

The walker on this machine moves the mock mid by $1 on each new Sepolia block, between 3980 and 4020. That changes the oracle. It does not change the widths.

## What PR #18 would add

`chooseSpread` on `aqua/risk-agent` widens one `desk.spread` from the same distance, `|w - 0.70|`. The router already uses that distance to scale the two widths. Reading `desk.spread` as well would count the inventory gap twice. The router ignores that record, so the write does not change what a counterparty pays. This pass does not merge PR #18.

## When a spread changes a fill

Opcode 35 uses `desk.spread` only inside the widths in `desk.terms`. A write outside those bounds, or a write past `validUntil`, falls back to `desk.terms`. Until that read exists, an agent write changes the screen and does not change what a counterparty pays.
