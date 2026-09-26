# Agent design

The Safe owns one agent. This repo publishes the book and the screen contract. The agent signs `desk.spread` and `desk.stats` on the counterparty name that just filled. Inventory changes those widths. The oracle mid stays put. The frontend agent edits only `web/` on `origin/frontend`. This file does not change those screens.

## Live chain

Sepolia. Aqua registry `0x1111113ccf1426a8e30e2bff5e005d929bf6a90a`.

Router `1.0.2-desk.7` is the fill router once `pnpm -C ts demo setup` replaces `1.0.2-desk.6`. The Safe owns it. It reads `desk.spread` on the taker name and uses those widths when they are live. Otherwise it uses that name's `desk.terms` widths. Ask is `floor(mid * (10000 + sell) / 10000)`. Bid is `floor(mid * (10000 - buy) / 10000)`. The mid is the oracle. Inventory does not enter that formula. A sell of ETH by the desk reverts at or below a 70% ETH share. The cap is 50 ETH. A fill is allowed for 600 seconds after the oracle `updatedAt` (`maxBlocks` 50). `1.0.2-desk.6` at `0xB4233b46C959a6Ed2bcC53BF752f3DD3E329eEcE` is no longer the fill router after that setup.

Safe `0x213C5832c77F8e27b544881325f9E68C0434027a`. Resolver `0x228bd144dB976960E8D5AbfAe6d5CeB15346970F`.

`desk.terms` stays on the client names. Both `mm-a.clients.dao-treasury-a.eth` (`0x36e2658f69b83f97C4c965Cc8B6eE7486bdF9630`) and `mm-b.clients.dao-treasury-a.eth` (`0x32737088c3116eF4A4f030991f26E9f958D80D71`) store version 1, sell 3 bp, buy 10 bp, cap `50e18`. `mm-a` also has an old 96-byte `desk.spread` of 40 bp. A 96-byte record is not live.

`desk.spread` and `desk.stats` sit on the counterparty name that filled. `mm-a` and `mm-b` each have their own record. The next fill by that name reads its own record. `desk.policy` stays on `dao-treasury-a.eth`.

Oracle `0xbD625C653F6f703a4040d892882d3Ed254947404`. Owner `0x1AC95a5e4CD739D01130f705f93D3bE070407c2b`, set in `0x7c1e2d75a6be3298a3ce196fa3a5ec3bc256e1348a7295128914dd2352d4aaad`. The walker signs with the `oracle` label in the wallet file on this machine, not the risk-agent key. The freshness window is closed. Do not start the walker.

## Who the agent is

The Safe appoints one address and records it on `risk.agents.<desk>.eth`. The live name is `risk.agents.dao-treasury-a.eth`, address `0xcCf3e2aD56Af881C13CCEb19Ab6cEbFbDD739899`. That address may write `desk.spread` and `desk.stats` on the desk resolver. It may not write `desk.policy`, `desk.terms`, an address, a cap, or an expiry, and it may not change the oracle. It does not dock or re-ship the order.

One agent per Safe, created when that Safe's resolver is deployed. `grantSetterRoles` runs then, once for `desk.spread` and once for `desk.stats`. It is not extended to `desk.policy`. A new Aqua order does not get a new agent. `ship` and `dock` leave the grant where it is. Replacing the agent is a separate act: the Safe revokes the old address and grants the new one.

The ENS grant covers every name on that resolver, and each treasury has its own resolver. A counterparty's key signs that counterparty's fill. It does not receive the spread grant.

The Safe holds the agent's key and runs the process. The key stays in `~/.aqua-eth-tokyo/wallets.txt` on this machine. It is not copied into the repo or `.env`. `pnpm -C ts keeper` stays up. It keeps a cursor in `~/.aqua-eth-tokyo/keeper.json` and scans `DeskFill` from that block. Each new fill is read, sent to Jev, and written to that filler's `desk.spread` and `desk.stats` before the cursor moves. The fill that emitted the event already used the previous record on that name. The next fill by the same name reads the record the keeper wrote. `planAgentWrites` still only packs the calls.

## Records

`desk.terms` is `abi.encode(uint8 1, uint16 sellBps, uint16 buyBps, uint128 cap)`, 128 bytes. Cap is WETH wei. Opcode 35 reads it on the taker name.

`desk.spread` is `abi.encode(uint8 1, uint16 sellBps, uint16 buyBps, uint64 validUntil)`, 128 bytes, on the taker name. A 96-byte record is not a live spread. The old encoder's single `spreadBps` is not the record. A spread is live only when the length is 128, the version is 1, `0 < sellBps < buyBps < 10000`, both widths sit inside that name's `desk.terms`, and `validUntil` is still ahead. Otherwise the quote uses that name's terms widths. Either pair sits on the oracle mid.

`desk.stats` is the text JSON `{version, sellBps, buyBps, validUntil, writtenAt}`. The screen can show it. The router does not read it.

`desk.policy` is ENS text on `dao-treasury-a.eth`. Only the Safe writes it, by a 2-of-3 Safe transaction. Empty or missing is `""`. The router does not parse it. The keeper parses the two inventory sentences and moves the next widths by the basis points those sentences name. It also parses the suspicion sentence. After a fill it reads three signs for that name: how far the oracle has moved in the taker's favor, how many blocks since that name's previous fill, and whether this size is larger than the previous one. When any sign matches, it adds the named basis points to both widths, still inside that name's terms. A policy without those sentences leaves the tier widths. The oracle mid is not an input to the price. `validUntil` has no default in this repo. The caller of `planAgentWrites` passes it.

`encodeAgentSpread` and `planAgentWrites` in `ts/src/lib/agent.ts` pack the unsigned `setData` and `setText` for the counterparty name the caller passes. They refuse a width outside the fence and an expiry already past `writtenAt`. They do not send the transaction.

## Book

`GET /v1/desks/{name}` is the field list below. `{name}` is the desk label `dao-treasury-a`. Any other name is refused. There is no POST, PUT, or PATCH, and no process in this repo listens on a port. `tsx src/scripts/desk-book.ts --name dao-treasury-a` prints the same object. Integers that do not fit a JavaScript number are decimal strings.

- `name`: `dao-treasury-a.eth`.
- `oracle.answer`: the raw 8-decimal oracle integer. `oracle.updatedAt`, `oracle.ageBlocks`, `oracle.fresh`. `fresh` is false when `updatedAt` is in the future or older than 600 seconds.
- `inventory.wBps`: the ETH share of the live Aqua strategy, in basis points. `inventory.wStarBps` is 7000. The agent uses it when writing widths. The quote mid stays the oracle.
- `terms`: `{sellBps, buyBps, cap}` when both client names store the same valid record, otherwise null. Live values are 3, 10, and `50000000000000000000`.
- `spread`: null. Each counterparty's live record is `names[].spread`.
- `policy`: the `desk.policy` string, or `""`.
- `quote`: `{ask, bid, source}` or null. `ask` and `bid` are 18-decimal wad strings on the oracle mid, using the agreed terms widths. `source` is `"terms"`. A name with a live `names[].spread` is priced from that record on the next fill.
- `agent`: `{name: "risk.agents.dao-treasury-a.eth", addr: "0xcCf3e2aD56Af881C13CCEb19Ab6cEbFbDD739899"}`.
- `names[]`: `{name, addr, expiry, live}` for each client. `live` is the ENS gate for that name.

At mid 4000 with terms 3 and 10 and no live spread, ask is 4001.2 and bid is 3996. The same name with a live spread of sell 2 and buy 8 asks 4000.8 and bids 3996.8. Inventory does not change those numbers. The agent changes the next name's widths: above 70% ETH it subtracts 1 bp from the chosen sell width and adds 1 bp to the buy width, and below 70% it does the opposite, staying inside that name's terms. A sell at or below 70% ETH still reverts. The 50 ETH cap stays.

## Screens

Routes stay on `origin/frontend`. Roles stay treasury, mm, and observer. The screen reads the fields above. It does not submit `desk.spread`. A write of `desk.policy` or `desk.terms` is a Safe transaction, not a call to this repo.

- `/desk`, all three roles. `quote.ask`, `quote.bid`, `quote.source`, `oracle.answer`, `oracle.fresh`, `inventory.wBps`, `terms.sellBps`, `terms.buyBps`, `terms.cap`, and `spread` when it is non-null. The skew label becomes `quote.source`.
- `/trade`, mm only. The same quote, the connected name from `names`, and that name's `live` flag. No policy editor and no spread writer.
- `/agent`, observer. `agent.addr`, `agent.name`, each name's `spread.sellBps`, `spread.buyBps`, `spread.validUntil`, and `policy`. There is no clamp from 5 bp to 200 bp.
- `/open` policy step, treasury. `policy` is the text the Safe will write to `desk.policy` on `dao-treasury-a.eth`. There is no kappa slider and no preview curve. `terms` on that step are read-only. This repo does not send the Safe transaction.
- `/controls`, treasury. `terms.cap`, the two term widths, `oracle.fresh`, and that the oracle owner is not `agent.addr`. Changes are Safe transactions.
- `/counterparties`, treasury and observer. One row per `names[]`: `name`, `addr`, `expiry`, `live`, and that name's `spread`. The width is that name's spread, or that name's terms when `spread` is null.
- `/fills` and `/program` stay as they are. A fill is not repriced from `inventory`.

## What stays out

PR #18 `chooseSpread` sets one width from `|w - 0.70|`. That formula is not the rule. The router reads the two widths on the taker name and prices them on the oracle mid. The agent, after it picks a tier, moves those widths by 1 bp according to `desk.policy`.

`pnpm -C ts api` listens on `127.0.0.1:8787`. It stores every `DeskFill` on the configured router in `~/.aqua-eth-tokyo/desk.sqlite` and serves `GET /v1/desks/dao-treasury-a`, `/v1/fills`, `/v1/fills/:tx`, `/v1/counterparties`, `/v1/agent`, `/v1/quote`, and `/v1/program`. There is no write route. `planAgentWrites` still only packs the widths it is given.
