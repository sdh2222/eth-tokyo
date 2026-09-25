# Aqua lane tasks

One Spec and one Plan per task. Each task folder holds `README.md` (the task row), `spec.md` and `plan.md`.

| Task | Wave | Estimate (h) | Depends on | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| [T0 · Repo scaffold](T0-repo-scaffold/README.md) | H0 | 0.75 | none | Aqua lane + agent | Not started |
| [T1 · DeskRouter and opcode table](T1-deskrouter-and-opcode-table/README.md) | Wave 1 | 1 | T0 | Agent | Not started |
| [T2 · #34 EnsGate and ENS mocks](T2-34-ensgate-and-ens-mocks/README.md) | Wave 1 | 2 | T0 | Agent | Not started |
| [T2b · ENS gas spike (fork)](T2b-ens-gas-spike-fork/README.md) | Wave 1 | 0.75 | T0, C1 addresses | Agent | Not started |
| [T3 · #35 DeskPrice and DeskArgs](T3-35-deskprice-and-deskargs/README.md) | Wave 1 | 3 | T0 | Aqua lane + agent | Not started |
| [T4 · Deploy script](T4-deploy-script/README.md) | Wave 2 | 0.75 | T1 (with T2, T3 merged) | Agent | Not started |
| [T5 · TS encoders and price mirror](T5-ts-encoders-and-price-mirror/README.md) | Wave 1 | 2.5 | T0 | Agent | Not started |
| [T5b · Desk client and fixture](T5b-desk-client-and-fixture/README.md) | Wave 2 | 3.5 | T4, T5, T2 (mocks) | Agent | Not started |
| [T6a · Safe setup script](T6a-safe-setup-script/README.md) | Wave 1 | 1 | T0 | Agent | Not started |
| [T6b · Ship CLI](T6b-ship-cli/README.md) | Wave 3 | 1.5 | T5b, T6a | Agent | Not started |
| [T7 · MM bot](T7-mm-bot/README.md) | Wave 3 | 2 | T5b | Agent | Not started |
| [T8 · Foundry integration tests](T8-foundry-integration-tests/README.md) | Wave 2 | 2.5 | T1, T2, T3 | Agent | Not started |
| [T8b · End-to-end runner](T8b-end-to-end-runner/README.md) | Wave 3 | 2 | T4, T5b, T6a, T6b, T7 | Agent | Not started |
| [T9 · Sepolia bring-up](T9-sepolia-bring-up/README.md) | Bring-up | 3 | all tasks + ENS lane | Aqua lane | Not started |
