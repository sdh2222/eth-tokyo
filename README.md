# eth-tokyo

Build repo for ETH Tokyo. This repository is separate from [sdh2222/ethtokyo](https://github.com/sdh2222/ethtokyo), which stays the briefing workspace. Product changes land here, one requirement per pull request.

## Loop

1. A member opens a pull request whose only new file is one requirement under `requirements/`.
2. One cloud agent claims that PR. It says whether the requirement is unclear or clear. If it is unclear, the agent asks the missing questions and stops. If it is clear, the agent implements that requirement only and pushes the commit onto the same branch.
3. The main agent, or the member who opened the PR, reviews code quality and runs QA.
4. Pass merges. A failed implementation goes back to the agent with the defects. A failed requirement is rewritten in the requirement file and starts again at the clarity check.

The full state machine is in [docs/loop.md](docs/loop.md). The reviewer checklist is in [docs/review.md](docs/review.md). The implementer rules are in [AGENTS.md](AGENTS.md).

## Why the clarity gate is hard

An agent that implements a fuzzy requirement guesses. The guess becomes code, the review argues about the guess, and the next iteration patches the guess. Stopping before any product code is the fast path. A clear requirement is one behavior, with acceptance checks someone can run.

## Labels

Create these once on the repository:

| Label | Meaning |
| --- | --- |
| `requirement` | Intake. One requirement, no product code yet. |
| `needs-clarification` | Agent stopped. Waiting on the author. |
| `implementing` | Claimed and clear. Agent is writing the one change. |
| `in-review` | Implementation is pushed. Waiting on QA. |
| `re-requirement` | The requirement itself changed. Clarity check runs again. |
