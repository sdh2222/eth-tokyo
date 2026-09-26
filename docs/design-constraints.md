# ENS + Aqua design constraints

Source of truth for product shape: the briefing in [sdh2222/ethtokyo](https://github.com/sdh2222/ethtokyo), especially `docs/value-proposition.md` (supersedes the lending frame in `docs/ens-aqua.md`) and `docs/research/verification-2026-09-24.md`. Henry decided router path **(b)** on 2026-09-24.

These are gates. A pull request that breaks one is a requirement fail.

## Product

An OTC desk in the treasury wallet. Aqua settles. SwapVM prices. ENSv2 is the client book. The treasury is the maker. Named market makers are the takers.

## Pinned stack

- Chain: Sepolia only. ENS and Aqua sit on the same chain.
- Aqua registry: the official Sepolia deployment `0x1111113ccf1426a8e30e2bff5e005d929bf6a90a`. Do not redeploy Aqua.
- SwapVM: tag `v1.0.2`. Aqua: tag `v1.0.0`.
- Router: modified SwapVM, path (b). Copy the v1.0.2 opcode table, drop unused instructions, append ours from index 34. Two instructions: an ENS gate, then terms plus price.
- Every opcode index maps to the intended instruction. A gap is a silent no-op and is a defect.
- Compiler settings stay on the v1.0.2 profile. Contract size stays under 24,576 bytes.

## Behavior that must hold

- One desk per treasury, under that treasury's own name. The real shape, using the pitch's customer: `ensdao.eth` is the parent, `wallet.ensdao.eth` is the Safe, `clients.ensdao.eth` is the book, `mm-a.clients.ensdao.eth` is a taker. The Safe is the maker and owns the client names. A second treasury uses a second 2LD. The demo cannot register `ensdao.eth`; it registers a free name this team controls (`dao-treasury-a.eth`) and shows that label as "this DAO's name." `clients.desk.eth` in the golden vectors is the 18-byte test fixture.
- The router reads records at fill time. Addresses and caps are not hardcoded.
- The fill checks the ENS `addr` against the taker on the Aqua query, the client-label expiry, and that the resolver is the expected one.
- `tx.origin` is forbidden in `src/` and `contracts/`.
- An agent may later write a spread. The inventory-deviation formula is not the rule. The agent cannot change address, cap, expiry, or the oracle.
- Tokens stay in the multisig until the fill. Aqua holds none of them.
- Price is the oracle answer. Ask is that mid times `(1 + s_sell)`. Bid is that mid times `(1 - s_buy)`, and the sell width is tighter than the buy width. Inventory does not move the mid. A sell reverts when the ETH share of the book is at or below the target. A fill is allowed only for a few blocks after the oracle `updatedAt`. The formula is on-chain.

## Out of the product

Lending. Uniswap or any aggregator route. Cross-chain. Mainnet. A vault that custodies treasury tokens. A KYC NFT or `tx.origin` taker gate.

## Hackathon note

ETHGlobal Tokyo forbids pre-existing project-specific code, designs, and assets unless they come from public libraries. Spec files that are used must live in this repository. Treat the briefing as planning input, and keep the submission history honest about what was decided before kickoff.
