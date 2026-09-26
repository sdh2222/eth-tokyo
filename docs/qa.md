# QA

The QA agent (`.cursor/agents/qa.md`) or the member who opened the pull request runs this. The implementer agent does not.

## Before a judgment

1. Read `requirements/NNN-short-slug.md` on the pull request branch.
2. Read `docs/design-constraints.md` and `docs/review.md`.
3. Confirm the head branch is `aqua/`, `ens/`, `docs/`, or `design/` plus a lowercase slug, and that the prefix matches the lane in `docs/branches.md`.
4. Wait until the GitHub Actions job `check` is green. That job runs `make check`. A red `check` is an implementation fail. Do not re-judge the requirement to excuse it.

## Run the acceptance checks

Run every checkbox under `## Acceptance` in the requirement file. Record the command and the observed result. An unchecked box that you did not run is a fail.

When the change touches Solidity, also run:

```bash
make check
```

## Judgment

Use only the three outcomes in `docs/review.md`: pass, implementation fail, requirement fail.

Pass only when CI is green, every acceptance check passed, the diff stays inside the requirement's in-scope list, and `docs/design-constraints.md` still holds.

Comment the outcome on the pull request. Do not approve a pull request you implemented.
