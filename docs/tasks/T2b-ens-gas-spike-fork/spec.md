---
title: T2b Spec · ENS gas spike (fork)
notion: https://app.notion.com/p/3e58f1ec11b4815a8cdad185064129cc
---

# T2b Spec · ENS gas spike (fork)

## Goal

In the first build hour, measure what the ENS reads inside a fill cost on real Sepolia ENSv2, so the design risk "gas unknown" (Desk system §13 C3) is closed early.

## Source of truth

Desk system §5.3 steps 4 to 8, §5.4 step 6, §6.4, §10 (T-F-1), §13 C1 and C3.

## Owns

- `contracts/test/fork/SepoliaEns.fork.t.sol` (T-F-1 only; T9 adds T-F-2 to the same file later)

## Requirements

1. The test is skipped unless `SEPOLIA_RPC_URL` is set (`vm.envOr`); it forks at the latest block.
2. Addresses come from `config/sepolia.json` (`ens.ethRegistry`), read with `vm.readFile` + `vm.parseJson`. The Aqua lane fills them at H0 (C1).
3. The measured name: an existing registered 2LD on Sepolia ENSv2 that has a subregistry and a PermissionedResolver, given by the page Owner in the PR request (for example a team member's own test name). If none is available at H0, the Aqua lane registers `desk.eth` first; the agent does not guess a name.
4. Measure with `gasleft()` deltas, each call on its own:
	- `getSubregistry(label)` on ETHRegistry, and on the 2LD's registry for a child label (or a missing label)
	- `getExpiry(uint256(keccak256(label)))`
	- `getResolver(label)`
	- `resolver.resolve(dnsName, abi.encodeCall(IAddrResolver.addr, (bytes32(0))))`
	- `resolver.resolve(dnsName, abi.encodeCall(IMulticallable.multicall, ([data(0,"desk.terms"), data(0,"desk.spread")])))`
5. Log each number and the total with `console2.log`; assert nothing about the values (it is a measurement), but assert every call succeeds.

## Acceptance

- `SEPOLIA_RPC_URL=... forge test --match-path test/fork/SepoliaEns.fork.t.sol -vv` green.
- The PR description contains a table: call · gas, and the total.
- Without `SEPOLIA_RPC_URL`, the test is skipped and `make check` stays green.

## Out of scope

Changing any design based on the number (see Plan: fallbacks).
