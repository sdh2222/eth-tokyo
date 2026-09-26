# 018 prompts

WR-10 disclosure: the prompts that produced the code in the requirement 018 pull request (#26, the ENS tooling reads the new desk.terms).

## Agent prompt (summary)

The orchestrating session's task prompt, summarized. It followed the requirement 014 and 016 tasks (`docs/prompts/014-ens-safe-handoff.md`, `docs/prompts/016-ens-subnames-owned-by-safe.md`).

```text
Implement requirement 018: the ENS tooling must read the new desk.terms (128 bytes).
Worktree ~/desk-terms, branch ens/terms-v2 from origin/main 4a538c7; requirement committed as c95e6bb, PR #26 open.
Do not edit requirement files, do not push, do not touch GitHub.
Main #21 changed desk.terms to abi.encode(uint8 1, uint16 sSellBps, uint16 sBuyBps, uint128 cap), 128 bytes, cap in
WETH base units (DeskPrice compares wethAmt > cap). The router's rule (DeskPrice._records): read the raw 32-byte words
(version, sell, buy, cap) and reject when length != 128, version != 1, sell > 0xFFFF or buy > 0xFFFF, sell >= buy,
buy >= 10000, cap == 0 or cap > type(uint128).max. Mirror it word by word on the value after unwrapping the
resolver's ABI-encoded return; keep the read path's bytes decoding. The router no longer reads desk.spread: keep the
agent's delegation and the desk.spread format and decoder; verify shows spread as information only and drops the
pre-clamp spread / tier fallback. The Safe writes (1, 3, 10, 50e18) to mm-a and mm-b; the ENS lane must not write
desk.terms on Sepolia. The default root record is still the old 96-byte one with cap 0; update that verify check to
the new rule.
Update: encode.ts (Terms, encodeTerms, decodeTerms), read.ts (Records, ClientView, gateOk), 99-verify.ts (per-MM
validity with sSell, sBuy and cap in WETH; no tier-specific expectations; default record by the new rule; agent
checks unchanged), every other old-format use (03-clients seeds (1, 3, 10, 50e18) with a comment that the EOA cannot
write after the handoff; the default record in setup.ts with cap 0 for fresh deployments; the fork harness's Safe
proof changes sSell 3 → 4 and back; anything else using encodeTerms/decodeTerms), and the README's record format and
"체결 안에서 ENS 읽는 법" sections.
Acceptance, every output in the PR draft: (1) a decoder self-check run, not committed; (2) a read-only verify on real
Sepolia with --safe 0x213C…027a, expected to report the old 96-byte format until the Safe writes; (3) an anvil fork
on port 8548 (8545-8547 are not yours), ens/.env with only RPC_URL, the Safe impersonated (anvil_impersonateAccount,
anvil_setBalance) writing (1, 3, 10, 50e18) to mm-a and mm-b, then verify passing with sSell 3, sBuy 10, cap 50 WETH;
(4) typecheck on a fresh clone, nothing sent to Sepolia, ens/deployments unchanged.
Separate finding for "For the author" (do not change contracts/): DeskPrice._records checks terms.length != 128 on
the raw resolve() output, but the real PermissionedResolver ABI-wraps data(), so a 128-byte record comes back as 192
bytes and every fill reverts DeskPriceNoTerms; the mock returns the value raw. Confirm on the fork by reading
resolve() from the router's view after the write. Do not call the router with a real key.
Commits by hyeon-Sec with no AI trailers; this prompt file; the PR draft in the 016 structure; a final report.
```

## How it was run

- Run on 2026-09-26 by an AI coding agent in a local git worktree (`~/desk-terms`, branch `ens/terms-v2`).
- No private key was present or used. `ens/.env` held only `RPC_URL=http://127.0.0.1:8548`. The Safe's writes on the fork went through anvil impersonation.
- Real Sepolia was only read (`eth_call` and block lookups).
- While the task ran, the treasury Safe wrote the new `desk.terms` to mm-a and mm-b on Sepolia (block 11784991). The pre-write state was therefore checked on an anvil fork pinned at Sepolia block 11784990.
- The decoder self-check and the impersonated-Safe write ran as temporary scripts that are not part of the pull request.
- The orchestrating session pushes the branch and edits the pull request.
- Human review and merge: pending (WR-07).
