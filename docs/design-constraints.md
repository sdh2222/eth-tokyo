# ENS + Aqua design constraints

Source of truth for product shape: the briefing in [sdh2222/ethtokyo](https://github.com/sdh2222/ethtokyo), especially `docs/value-proposition.md` (supersedes the lending frame in `docs/ens-aqua.md`) and `docs/research/verification-2026-09-24.md`. Henry decided router path **(b)** on 2026-09-24.

These are gates. A pull request that breaks one is a requirement fail.

## Product

An OTC desk in the treasury wallet. Aqua settles. SwapVM prices. ENSv2 is the client book. The treasury is the maker. The names in the client book are allowed counterparties. On a fill, Aqua calls that counterparty the taker.

## Pinned stack

- Chain: Sepolia only. ENS and Aqua sit on the same chain.
- Aqua registry: the official Sepolia deployment `0x1111113ccf1426a8e30e2bff5e005d929bf6a90a`. Do not redeploy Aqua.
- SwapVM: tag `v1.0.2`. Aqua: tag `v1.0.0`.
- Router: modified SwapVM, path (b). Copy the v1.0.2 opcode table, drop unused instructions, append ours from index 34. Two instructions: an ENS gate, then terms plus price.
- Every opcode index maps to the intended instruction. A gap is a silent no-op and is a defect.
- Compiler settings stay on the v1.0.2 profile. Contract size stays under 24,576 bytes.

## Behavior that must hold

- One desk per treasury, under that treasury's own name. The real shape, using the pitch's customer: `ensdao.eth` is the parent, `wallet.ensdao.eth` is the Safe, `clients.ensdao.eth` is the book, `mm-a.clients.ensdao.eth` is an allowed counterparty. The Safe is the maker and owns the client names. A second treasury uses a second 2LD. The demo cannot register `ensdao.eth`; it registers a free name this team controls (`dao-treasury-a.eth`) and shows that label as "this DAO's name." `clients.desk.eth` in the golden vectors is the 18-byte test fixture.
- The router reads records at fill time. Addresses and caps are not hardcoded.
- The fill checks the ENS `addr` against the counterparty on the Aqua query (`ctx.query.taker`), the client-label expiry, and that the resolver is the expected one.
- `tx.origin` is forbidden in `src/` and `contracts/`.
- The Safe appoints one agent for that desk and holds its key. The agent may write `desk.spread` on a counterparty name. This repo publishes the book read and does not hold the key. The agent cannot change address, cap, expiry, or the oracle.
- Tokens stay in the multisig until the fill. Aqua holds none of them.
- Price starts from the oracle answer. The two widths are the live `desk.spread` on the taker name when that record is inside that name's `desk.terms` fence and not expired, and otherwise that name's `desk.terms` widths. Ask is `floor(mid * (10000 + sell) / 10000)`. Bid is `floor(mid * (10000 - buy) / 10000)`. Inventory does not move the mid. The agent applies the Safe's `desk.policy` when it writes the next widths. A sell reverts when the ETH share of the book is at or below the 70% target. One fill cannot move more than the WETH cap. A fill is allowed for 10 minutes after the oracle `updatedAt` (`maxBlocks` 50). The formula is on-chain.

## Out of the product

Lending. Uniswap or any aggregator route. Cross-chain. Mainnet. A vault that custodies treasury tokens. A KYC NFT or a `tx.origin` check on the counterparty.

## Hackathon note

ETHGlobal Tokyo forbids pre-existing project-specific code, designs, and assets unless they come from public libraries. Spec files that are used must live in this repository. Treat the briefing as planning input, and keep the submission history honest about what was decided before kickoff.
