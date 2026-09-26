# Agent design

Written after router `1.0.2-desk.3` (`0x4aEd37b536E2a8828A0dC29bc705FE2ED2e4414D`) was shipped. This note changes no contract. It does not merge PR #18.

## What already moves the quote

The live router moves the quote with inventory. Kappa is 200 bp. On a fill, `r` is the oracle mid times `(1 - 0.02 * (w - 0.70))` when the book is above the 70% ETH share, and the sign flips when the book is below it, so `r` rises. The 3 bp sell width and the 10 bp buy width sit on `r`. A sell still reverts at or below 70% ETH. The router does not read `desk.spread`. A test that writes 40 bp into that record leaves the quote unchanged.

The walker on this machine moves the mock mid by $1 on each new Sepolia block, between 3980 and 4020, and each `setAnswer` refreshes `updatedAt`. That is the price path. It is separate from inventory.

## What PR #18 would add

`chooseSpread` on `aqua/risk-agent` reads the newest fill's ETH share and widens one number from `|w - w*|`. It plans an unsigned `setData` for `desk.spread` only, version 1, valid for one hour. No fills means the minimum. The current router ignores that record, so the write does not change what a counterparty pays.

Using that formula together with the kappa already in `1.0.2-desk.3` would count the same inventory distance twice: once inside `r`, and again as a wider width.

## Job left

An agent may still write `desk.spread`. It may not change address, cap, expiry, or the oracle. A counterparty's price changes from that record only after a later router is changed to read it. This pass does not grant the write, and it does not merge PR #18.
