# 002 Desk router opcode table

Source: T1 Spec · DeskRouter and opcode table (`docs/tasks/T1-deskrouter-and-opcode-table/spec.md`).

## One behavior

DeskRouter deploys with the 36-entry Desk opcode table, and a test pins every opcode index.

## In scope

- `contracts/src/DeskRouter.sol`, `contracts/src/opcodes/DeskOpcodes.sol`, `contracts/test/OpcodeTable.t.sol`, and the NOTICE rows for the two derived files.

## Out of scope

- EnsGate and DeskPrice logic, mocks, and config.

## Acceptance

- [ ] `forge test --match-path test/OpcodeTable.t.sol -vv` passes.
- [ ] `forge build --sizes` shows DeskRouter runtime size below 24,576 bytes.
- [ ] `forge inspect DeskRouter storageLayout` lists only the upstream slots.
