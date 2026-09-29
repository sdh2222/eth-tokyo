# Contributing

This repository is separate from [sdh2222/ethtokyo](https://github.com/sdh2222/ethtokyo). That repository is the workspace for briefs. Product changes go into this repository, with one requirement in each pull request.

## Process

1. A member opens a pull request. The only new file in the pull request is one requirement in `requirements/`.
2. One cloud agent claims the pull request. If the requirement is not clear, the agent asks the necessary questions and stops. If the requirement is clear, the agent does only that requirement and pushes to the same branch.
3. The main agent, or the member who opened the pull request, examines the code quality and does QA.
4. If the review passes, the pull request merges. If the implementation fails, the agent gets the list of defects. If the requirement fails, the author writes the requirement again and the clarity check starts again.

An agent that implements an unclear requirement must guess. Then the review is about the guess. Thus the agent stops before it writes product code. A clear requirement has one behavior and acceptance checks that a person can do.

- The state machine is in [docs/loop.md](docs/loop.md).
- The reviewer checklist is in [docs/review.md](docs/review.md).
- The implementer rules are in [AGENTS.md](AGENTS.md).

## Labels

Make these labels one time on the repository:

| Label | Meaning |
| --- | --- |
| `requirement` | Intake. One requirement, no product code. |
| `needs-clarification` | The agent stopped. The author must answer. |
| `implementing` | The requirement is claimed and clear. The agent writes the change. |
| `in-review` | The implementation is pushed. QA must examine it. |
| `re-requirement` | The requirement changed. The clarity check starts again. |
