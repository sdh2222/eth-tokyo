# 012 Market-maker bot

## One behavior

The bot quotes and builds fills through the desk client. Its keys stay in the environment.

## In scope

- `ts/src/bot`.

## Out of scope

- Writing `addr` records. The ENS lane does that after Aqua sends the two addresses.

## Acceptance

- [ ] The leg rule accepts exactly one of `--weth` and `--usdc`.
- [ ] A taker mismatch is printed as `✖ This wallet isn't on the desk's list`.
- [ ] No private key is read from the repository.
