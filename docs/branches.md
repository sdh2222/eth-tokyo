# Branches

A pull request head must use one of these prefixes:

```text
aqua/short-slug
ens/short-slug
docs/short-slug
design/short-slug
```

The prefix is the lane. `short-slug` is lowercase kebab-case.

| Prefix | Lane |
| --- | --- |
| `aqua/` | SwapVM router, instructions, settlement |
| `ens/` | ENSv2 names, records, roles, expiry |
| `docs/` | Docs only |
| `design/` | Design constraints and specs |

`main` is the only integration branch. GitHub rejects every other prefix at creation. The requirement file stays `requirements/NNN-short-slug.md`; the branch does not have to repeat that number.

Examples that pass: `aqua/quote-skew`, `ens/name-expiry`, `docs/qa-checklist`, `design/opcode-map`.

Examples that fail: `req/001-ens-gate`, `feature/ens`, `Aqua/quote`, `fix/typo`.
