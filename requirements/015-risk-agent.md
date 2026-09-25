# 015 Risk agent

## One behavior

The risk agent reads a market maker's latest DeskFill and chooses `desk.spread` inside the treasury range `[sMin, sMax]`.

## In scope

- The spread choice and the unsigned `setData` for `desk.spread`.

## Out of scope

- Writing `addr`, `desk.terms`, or expiry. Sending the transaction. That waits until the ENS lane grants the agent role.

## Rule

Take the newest fill's ETH share (`wBeforeWad`). Let the distance from the treasury target be `deviation = |w - target| * 10000 / 1e18`, capped at 10000. The spread is `sMin + (sMax - sMin) * deviation / 10000`, then clamped to `[sMin, sMax]`. No fills means `sMin`. `validUntil` is one hour after the call.

## Acceptance

- [ ] A fill at the target share returns `sMin`.
- [ ] A fill far from the target returns a wider spread, and never a value outside `[sMin, sMax]`.
- [ ] The planned call writes only `desk.spread`, encoded as version 1.
