# NOTICE

This repository builds on SwapVM v1.0.2 (https://github.com/1inch/swap-vm, git submodule `contracts/lib/swap-vm`): SwapVM — © Degensoft Ltd 2025, licensed under `LicenseRef-Degensoft-SwapVM-1.1`. The license text is in [LICENSES/SwapVM-1.1.txt](LICENSES/SwapVM-1.1.txt), copied verbatim from swap-vm v1.0.2. This project is not affiliated with or endorsed by Degensoft or 1inch.

## Modified files

Every file that is derived from SwapVM or modifies it, with its change and date (SwapVM-1.1 §3.1 D; Desk system §12).

| File | Derived from | Change | Date |
| --- | --- | --- | --- |
| contracts/src/opcodes/DeskOpcodes.sol | swap-vm v1.0.2 src/opcodes/AquaOpcodes.sol | opcode table drops fees and AMMs; adds EnsGate and DeskPrice | 2026-09-25 |
| contracts/src/DeskRouter.sol | swap-vm v1.0.2 src/routers/AquaSwapVMRouter.sol | Desk opcode table; no AquaOpcodes constructor arg | 2026-09-25 |

## Build

```bash
git submodule update --init
(cd contracts/lib/swap-vm && yarn install --frozen-lockfile)
pnpm install
make check
```

## Deploy (Sepolia)

The scripts below come from Desk system §8.1 to §8.3 and land with tasks T4, T6a and T6b.

```bash
(cd contracts && forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify)
pnpm safe:setup --mint
pnpm ship
```

Between the Safe setup and the ship, the ENS names and records of Desk system §6 must exist.
