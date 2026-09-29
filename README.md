<p align="center">
  <img src="web/public/favicon.png" alt="watermark" width="200" />
</p>

<h1 align="center">watermark</h1>

<p align="center">
  <strong>Solving the DAO treasury asset disposal problem.</strong><br />
  DAO treasuries should stop losing money to the spread every time they sell.
</p>

<p align="center">
  🏆 <strong>ETHGlobal Tokyo 2026 · Finalist</strong><br />
  🥉 <strong>ETHGlobal Tokyo 2026 Partner Track · 1inch Build an Aqua App · 3rd place</strong>
</p>

<p align="center">
  Built on <a href="https://github.com/1inch/aqua">1inch Aqua</a> and <a href="https://ens.domains/ensv2">ENSv2</a> · Sepolia testnet · not audited
</p>

---

**watermark**, a tool for how DAO treasuries sell their assets. Instead of dumping into the market as a taker and paying the spread, the treasury quotes its own prices to market makers it names and earns the spread instead, built on 1inch Aqua and ENSv2.

## The problem: treasury asset disposal

When a DAO sells treasury assets today, it is the taker. It dumps into a pool and pays slippage on size, or sells to a solver whose price already holds its cut. Either way the spread goes to someone else. Selling in smaller slices doesn't fix it: every slice through a multisig means another proposal, another round of signatures and another price, so the whole amount usually goes out at once.

## What watermark does

watermark flips the treasury from taker to maker.

- **Quote, don't dump.** The Safe signs once and ships one SwapVM strategy to 1inch Aqua. The treasury quotes its own buy and sell prices around the oracle price, and market makers fill them in small pieces over time. The treasury earns the spread on every fill instead of paying it, and tokens leave the Safe only at the moment of each fill. In the demo a sale fills 3 bp above the oracle price, where dumping with a 2% slippage budget can cost up to 2%.
- **Only market makers it names.** An open quote is a free option: when the price moves, the fastest bot takes the treasury's price before the treasury can change it. So each market maker gets an ENS name under the treasury, like `mm-a.clients.dao-treasury-a.eth`. At every fill the router checks that name. It must point to the wallet that is trading, it must not have expired, and it must carry the treasury's terms. Any other wallet is refused on chain before a token moves.
- **Spreads that follow behavior.** The treasury writes its policy once, in plain English, and sets the widest spread any market maker can get. After each fill a risk agent looks at how that market maker traded (how big, how often, and whether the price jumped their way right after) and writes its next spread to its ENS name. It never goes past the limit and needs no new Safe signature. Market makers who trade fair get up to 3× tighter spreads. Those who trade sharp stay at the edge.

## How it works

### Terms

| Term | What it means | Name in the code |
| --- | --- | --- |
| **Treasury** | The DAO's Safe multisig. It holds the assets and sets the prices, so it is the maker. | `safe` |
| **Desk** | One treasury's standing offer to trade: the strategy the Safe ships once to 1inch Aqua, plus the rules kept on the treasury's ENS names. In the web app, "Open a desk" sets one up. | `DeskRouter`, `@desk/lib`, `desk.*` records |
| **Named market maker** | A trading firm the treasury allows to fill its prices, identified by an ENS name under the treasury, like `mm-a.clients.dao-treasury-a.eth`. The contracts call it the taker. | `taker`, `mms` |
| **Terms** | The widest spread and the largest single fill the treasury allows one market maker. Only the Safe can change them. | `desk.terms` |
| **Spread** | How far above the oracle price the treasury sells, and how far below it buys, for one market maker right now. The risk agent sets it inside the terms; when none is set, the terms apply. | `desk.spread` |
| **Policy** | The treasury's rules for the risk agent, in plain English. | `desk.policy` |
| **Fill** | One trade by a named market maker against the treasury's prices. | `DeskFill` event |

```mermaid
flowchart LR
  Safe["DAO Safe<br/>(maker, 2-of-3)"] -- "ships one strategy" --> Aqua["1inch Aqua"]
  Safe -- "desk.terms · desk.policy" --> ENS["ENSv2 names<br/>*.clients.dao-treasury-a.eth"]
  Taker["Named market maker<br/>(mm-a, mm-b)"] -- "swap" --> Router["DeskRouter<br/>(SwapVM v1.0.2)"]
  Aqua --> Router
  ENS -- "EnsGate: addr · expiry" --> Router
  ENS -- "DeskPrice: terms · spread" --> Router
  Oracle["Oracle mid"] --> Router
  Router -- "DeskFill" --> Agent["Risk agent<br/>(keeper)"]
  Agent -- "desk.spread · desk.stats" --> ENS
```

The router is a copy of the SwapVM v1.0.2 Aqua router with its opcode table cut down (no fees, no AMM curves) and two instructions added. The contracts store no configuration. Everything they read at fill time lives in ENS.

| Piece | What it does |
| --- | --- |
| **EnsGate** (opcode 34) | The taker (the market maker filling the quote) must be the `addr` of a name under `clients.dao-treasury-a.eth` that has not expired and uses the treasury's ENS resolver. Otherwise the fill reverts. |
| **DeskPrice** (opcode 35) | Prices from the oracle mid: `ask = mid × (1 + sell)`, `bid = mid × (1 − buy)`. The widths come from that name's live `desk.spread`, or else its `desk.terms`. The oracle must be fresh (600 s), one fill is capped by the name's terms, and the treasury stops selling ETH once ETH falls to 70% of its holdings by value. |
| **Risk agent** | A keeper watches `DeskFill`, reads `desk.policy`, picks the filler's next tier and writes `desk.spread` and `desk.stats` on that name. The Safe grants it those two records only: it cannot touch terms, addresses, caps, expiry or the oracle. |
| **Web app** | Treasury view (Dashboard, Open a desk, Counterparties, Risk agent, Fills, Controls), market maker view (Trade, My fills), and Verify a fill, which recomputes any fill's price from chain data. |

### The demo setup

| Setting | Value |
| --- | --- |
| Treasury ENS name | `dao-treasury-a.eth` |
| Named market makers | `mm-a.clients.dao-treasury-a.eth`, `mm-b.clients.dao-treasury-a.eth` |
| Terms (widest spread) | sell 3 bp, buy 10 bp |
| Agent tiers (sell / buy) | tight 1 / 4 bp, standard 2 / 8 bp, limit 3 / 10 bp |
| Cap per fill | 50 ETH |
| ETH sales stop at | 70% of holdings by value |
| Oracle freshness | 600 s (50 blocks) |

## Live on Sepolia

| Contract | Address |
| --- | --- |
| Treasury Safe (2-of-3) | [`0x213C5832c77F8e27b544881325f9E68C0434027a`](https://sepolia.etherscan.io/address/0x213C5832c77F8e27b544881325f9E68C0434027a) |
| DeskRouter | [`0xD6e721C463aa4cE0390f828da424530883975428`](https://sepolia.etherscan.io/address/0xD6e721C463aa4cE0390f828da424530883975428) |
| 1inch Aqua | [`0x1111113ccf1426a8e30e2bff5e005d929bf6a90a`](https://sepolia.etherscan.io/address/0x1111113ccf1426a8e30e2bff5e005d929bf6a90a) |
| Oracle (demo) | [`0xbD625C653F6f703a4040d892882d3Ed254947404`](https://sepolia.etherscan.io/address/0xbD625C653F6f703a4040d892882d3Ed254947404) |
| ENS resolver | [`0x228bd144dB976960E8D5AbfAe6d5CeB15346970F`](https://sepolia.etherscan.io/address/0x228bd144dB976960E8D5AbfAe6d5CeB15346970F) |
| Risk agent (`risk.agents.dao-treasury-a.eth`) | [`0xcCf3e2aD56Af881C13CCEb19Ab6cEbFbDD739899`](https://sepolia.etherscan.io/address/0xcCf3e2aD56Af881C13CCEb19Ab6cEbFbDD739899) |

Every address and setting is in [`config/sepolia.json`](config/sepolia.json). The ENS side (registries, names, the Safe handoff) is in [`ens/README.md`](ens/README.md).

## Repository

| Path | What's there |
| --- | --- |
| [`contracts/`](contracts) | Foundry. `DeskRouter`, `EnsGate`, `DeskPrice`, the deploy and oracle scripts, and tests including a Sepolia ENS fork test. SwapVM v1.0.2 is the submodule in `contracts/lib/swap-vm`. |
| [`ts/`](ts) | `@desk/lib`: encoders, the price mirror, the browser client, Safe setup, `ship`, the keeper and risk agent, the market-maker bot, demo scenes and e2e. |
| [`web/`](web) | The watermark web app: Vite, React, Astryx, wagmi and viem. Deployed on Vercel. |
| [`api/`](api) | Read API and Sepolia indexer on SQLite. Deployed on Render. |
| [`ens/`](ens) | ENS lane: resolver, subregistries, names, records and the Safe handoff. |
| [`docs/`](docs) | [Agent design](docs/agent-design.md), [decision log](docs/decision-log.md), [diagrams](docs/diagrams), the [design system](docs/design) and the build rules. |
| [`requirements/`](requirements) | One requirement per pull request. |

The code keeps the Desk names (`DeskRouter`, `@desk/lib`, the `desk.*` ENS records). The [Terms](#terms) table maps them to the words used here.

## Run it

Needs Foundry, Node 24, pnpm 11 and yarn 1.22. CI's exact versions are in [`.github/workflows/qc.yml`](.github/workflows/qc.yml).

```bash
git submodule update --init
(cd contracts/lib/swap-vm && yarn install --frozen-lockfile)
pnpm install
```

### Web app

```bash
cp web/.env.example web/.env.local   # VITE_DESK_MODE=live reads Sepolia; fixture uses seeded data
pnpm -C web dev --host 127.0.0.1 --port 5173
```

See [`web/README.md`](web/README.md) for the build, the preview and the licensed font.

### QC gate

```bash
make check
```

`make check` runs, in order: `forge fmt --check`, `forge build --sizes`, `forge test`, `pnpm -C ts lint`, `pnpm -C ts typecheck`, `pnpm -C ts test --passWithNoTests`, `pnpm secretlint "**/*"`. CI runs it on every pull request.

### Deploy and demo (Sepolia)

Copy `.env.example` to `.env` on the one machine that sends transactions. Then:

```bash
(cd contracts && forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify)
pnpm safe:setup --mint
pnpm ship
pnpm -C ts keeper          # the risk agent: writes each filler's next spread
pnpm -C ts demo <scene>    # setup, trade, target, stale, second-ship or restore
```

The ENS names and records must exist before `ship`. See [`ens/README.md`](ens/README.md).

## Team

Born at ETHGlobal Tokyo 2026. Built by **hyeon-Sec**, **sdh2222** and **3DUCK** with [@BlockchainatYU](https://x.com/BlockchainatYU).

Thank you to the 1inch and ENS teams for the ground this stands on.

## Credits

Powered by SwapVM. Copyright © 2025 Degensoft Ltd. SwapVM v1.0.2 is used under `LicenseRef-Degensoft-SwapVM-1.1`; the modified files are listed in [`NOTICE.md`](NOTICE.md). Built on 1inch Aqua and ENSv2. This project is not affiliated with or endorsed by Degensoft, 1inch or ENS.

## How we build

This repository is separate from [sdh2222/ethtokyo](https://github.com/sdh2222/ethtokyo), which stays the briefing workspace. Product changes land here, one requirement per pull request.

1. A member opens a pull request whose only new file is one requirement under `requirements/`.
2. One cloud agent claims that PR. If the requirement is unclear, the agent asks the missing questions and stops. If it is clear, the agent implements that requirement only and pushes onto the same branch.
3. The main agent, or the member who opened the PR, reviews code quality and runs QA.
4. Pass merges. A failed implementation goes back to the agent with the defects. A failed requirement is rewritten and starts again at the clarity check.

An agent that implements a fuzzy requirement guesses, and the review then argues about the guess. Stopping before any product code is the fast path. A clear requirement is one behavior, with acceptance checks someone can run.

The state machine is in [docs/loop.md](docs/loop.md), the reviewer checklist in [docs/review.md](docs/review.md) and the implementer rules in [AGENTS.md](AGENTS.md).

| Label | Meaning |
| --- | --- |
| `requirement` | Intake. One requirement, no product code yet. |
| `needs-clarification` | Agent stopped. Waiting on the author. |
| `implementing` | Claimed and clear. Agent is writing the one change. |
| `in-review` | Implementation is pushed. Waiting on QA. |
| `re-requirement` | The requirement itself changed. Clarity check runs again. |
