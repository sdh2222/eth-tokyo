# 003 ENS lane documents

## One behavior

The ENS lane's design, its agent manual and the pre-event idea work are readable under `docs/ens/`, with superseded material marked.

## In scope

- `docs/ens/**` only.

## Out of scope

- Any other docs, the task specs, and code.

## Acceptance

- [ ] `docs/ens/README.md` lists every file in `docs/ens/` with its status.
- [ ] `grep -rn "askBps\|bidBps" docs/ens/*.md` prints nothing: the current documents match Desk system §6.2.
- [ ] Every file under `docs/ens/prework/` starts with a "superseded" note.
