# ens — ENS lane

지갑 안의 OTC 데스크의 ENS 파트. 트레저리가 소유한 이름 계층을 만들고, MM별 거래 조건을 레코드로 기록하고, 리스크 에이전트에게 스프레드 키 하나만 위임한다. 라우터가 읽는 계약은 `docs/code/desk-system.md` §6(브랜치 `claude/sleepy-ritchie-5lp65m`)이 기준이다.

레코드 형식과 단위는 main #21(`DeskPrice._records`)을 따른다.

- `desk.terms = abi.encode(uint8 1, uint16 sSellBps, uint16 sBuyBps, uint128 cap)`, 128바이트. `cap`은 WETH 기본 단위(18자리)이고, 체결의 WETH 수량이 `cap`을 넘으면 라우터가 revert한다(`wethAmt > cap`). Safe가 쓰고, ENS 파트는 쓰지 않는다(2026-09-26 Aqua 레인 요청).
- `desk.spread = abi.encode(uint8 1, uint16 spreadBps, uint64 validUntil)`, 96바이트. 형식과 에이전트 위임은 그대로지만, #21부터 라우터는 읽지 않는다. `npm run verify`는 정보로만 보여 준다.

## 현재 배포 (Sepolia, 2026-09-25)

데모 데스크 이름은 팀 설계대로 `dao-treasury-a.eth`다(데스크는 DAO 자신의 이름 아래 둔다, §6.1). `npm run verify`의 모든 필수 검사가 실제 체인에서 통과했고, mm-a의 `dnsName`은 §9 골든 벡터와 바이트 단위로 같다. 이름 변경 전의 `desk.eth` 배포는 `deployments/sepolia.desk.json`에 기록만 남겨 둔다. 다른 파트로 넘길 값은 `npm run export`가 `deployments/config.dao-treasury-a.json`에 `config/sepolia.json`(§8.0) 형식으로 쓴다.

| 항목 | 주소 |
| --- | --- |
| resolver R | `0x228bd144dB976960E8D5AbfAe6d5CeB15346970F` |
| desk registry D (`dao-treasury-a.eth`의 하위) | `0x72B3d4B4adCd057c904B3bB59fa201bF10F983b2` |
| clients registry C (`clients.dao-treasury-a.eth`의 하위) | `0x8f6c1e8DE9BDAe6Be0f028e7Ce596F9e530a984e` |
| agents registry | `0x5A6b0C2DAb9A29FA2cc949Dbc8a38f222609b5CF` |
| mm-a / mm-b | `desk.terms` = (1, sSell 3 bps, sBuy 10 bps, cap 50 WETH): Safe가 2026-09-26 Sepolia 블록 11784991에 씀. 만료 2026-10-25 |
| mm-c | mm-a와 같은 조건, 만료 15분 (데모 3번용 — 인계 뒤에는 데모 직전 Safe 트랜잭션으로 재등록) |
| risk.agents.dao-treasury-a.eth | 에이전트 `0xcCf3e2aD56Af881C13CCEb19Ab6cEbFbDD739899` (Aqua 레인 지갑, 주소만 받음, 2026-09-26). `desk.spread`·`desk.stats` 권한만 있다 |

데모용 트랜잭션:

- `dao-treasury-a.eth` 등록 — [0x1844…1d2b](https://sepolia.etherscan.io/tx/0x18445307c7ce6b56e558448dcd7ab830d74fe848f9134fc36573d4a367b01d2b)
- (이전 에이전트 `0x7ab7…5Ca3`, 09-25) 에이전트가 `desk.spread`를 씀 (허용) — [0x3497…a6b](https://sepolia.etherscan.io/tx/0x3497b52c9ad5938ecff01f1024959f36fbaf21e09d2e1a04de0b1831c88bb1a6)
- (이전 에이전트 `0x7ab7…5Ca3`, 09-25) 에이전트가 `desk.terms`를 쓰려다 revert (거부) — [0x0b8c…835](https://sepolia.etherscan.io/tx/0x0b8cd052895b653ef4da15455a22177a89deb92fe1f98b84cabfb6f5fb390835)

Safe 인계 (2026-09-26 완료):

- treasury Safe `0x213C5832c77F8e27b544881325f9E68C0434027a` (v1.4.1, 2-of-3; owner 1·2 = Aqua 레인, owner 3 = ENS 레인)가 resolver R·레지스트리 D·C·agents의 root 권한을 모두 갖고, `dao-treasury-a.eth`와 살아 있는 하위 이름(`clients`·`agents`·`mm-a`·`mm-b`·`risk`)을 모두 소유한다. 설정용 EOA의 권한은 0이다. 실행 기록은 PR #19, 코드는 `ens/safe-handoff`(#17)·`ens/subname-owner`(#19).
- 그래서 `02`–`04` 스크립트는 이제 EOA로는 동작하지 않는다. mm-c 재등록, addr·terms 변경은 Safe 트랜잭션이고, ENS(owner 3) 서명에 Aqua 소유자 한 명의 서명이 더 필요하다.
- mm-c는 만료 상태다. 데모 3번 직전에 Safe가 다시 등록한다.
- `config/sepolia.json`의 `ens`·`mms`·`safe`는 PR #5에 있다.

```
dao-treasury-a.eth            트레저리 소유, 트레저리 resolver
├─ clients.dao-treasury-a.eth MM 명단 (UserRegistry)
│   ├─ mm-a / mm-b / mm-c     addr + desk.terms
└─ agents.dao-treasury-a.eth
    └─ risk                   리스크 에이전트 신원
```

## 실행

```bash
npm install
npm run keys       # .env에 테스트넷 키 생성 (이미 있으면 유지), 주소 출력
npm run check      # 읽기 전용 점검 — 가스 불필요
npx tsx scripts/00-probe.ts   # 인코딩을 배포된 컨트랙트의 pure 함수로 검증 + 배포 시뮬레이션 — 가스 불필요
# TREASURY 주소에 Sepolia ETH ~0.05 입금 후
npm run register   # <DESK_LABEL>.eth 등록 (commit → 60초 → register). 중단돼도 재실행하면 이어서 진행
npm run setup      # resolver + 서브레지스트리 3개 배포, <DESK_LABEL>.eth 연결
npm run clients    # mm-a/b/c 발급 + addr, desk.terms
npm run agent      # 에이전트 위임 + 경계 확인. AGENT_ADDRESS가 있으면 그 주소에 위임(키 불필요, 경계는 시뮬레이션)
                   # 기록된 에이전트를 바꿀 때는 -- --switch (이전 에이전트 권한 회수). --send-revert는 AGENT_PK일 때만
npm run verify     # 수용 기준 자동 검사 (Safe 인계 후에는 -- --safe <Safe>)
npm run export     # config/sepolia.json 형식으로 ens, mms 내보내기
npm run handoff -- --safe <Safe>   # Safe 인계 드라이런. --execute로 전송 (아래 "Safe 인계")
```

모든 스크립트는 멱등이다. 체인 상태나 `deployments/sepolia.json`을 먼저 보고 이미 된 단계는 건너뛴다. 데모 직전에 `npm run clients`를 다시 돌리면 mm-c의 만료 시계가 새로 시작된다(`MM_C_TTL_SECONDS`, 기본 900초). Safe 인계 후에는 `02`–`04`가 보내는 EOA에 권한이 없으므로, 이 재설정도 Safe 트랜잭션으로 한다.

## Safe 인계

팀 설계 §6.1·§6.3대로 이름과 권한은 트레저리 Safe가 가진다. `01`–`04`가 만든 것은 설정용 EOA(`TREASURY_PK`)가 갖고 있었고, `npm run handoff`가 이를 Safe로 넘긴다(requirement 014, 016). Sepolia에서는 2026-09-26에 실행했다(기록: PR #19).

```bash
npm run handoff -- --safe <Safe>                      # 드라이런: 상태, 보낼 호출 목록, 미리 할 수 있는 시뮬레이션. 아무것도 보내지 않는다
npm run handoff -- --safe <Safe> --execute            # 전송. 로컬 RPC(anvil 포크)에서만 된다
npm run handoff -- --safe <Safe> --execute --sepolia  # 로컬이 아닌 RPC(실제 Sepolia)로 전송
npm run verify -- --safe <Safe>                       # 기존 검사 + 인계 검사
```

- 체인을 먼저 읽고 빠진 호출만 이 순서로 보낸다.
  1. R·D·C·agents에 `grantRootRoles(<ROOT_ALL>, Safe)`
  2. ETHRegistry에서 `dao-treasury-a.eth`를 `safeTransferFrom(EOA, Safe, tokenId, 1, 0x)`
  3. 살아 있는 하위 이름(`clients`, `agents`, 살아 있는 MM 이름, `risk`)마다 `unregister`, 곧바로 `register(label, Safe, 같은 subregistry·resolver·expiry, roleBitmap 0)`. 만료된 이름(지금은 mm-c)은 건너뛰고 보고한다.
  4. 체인을 다시 읽어 Safe가 루트 권한을 모두 갖고, `dao-treasury-a.eth`와 살아 있는 하위 이름을 모두 소유하고, 재발급한 이름의 값이 그대로인지 확인한 뒤에야 EOA의 루트 권한을 `revokeRootRoles`로 전부 회수한다.
- 끝난 뒤 다시 돌리면 아무것도 보내지 않는다.
- 첫 전송 전에, 앞선 호출에 기대지 않는 호출(부여, 이전, `unregister`, 회수)을 모두 현재 상태에 시뮬레이션한다. `register`는 같은 이름의 `unregister`가 먼저 반영돼야 해서 미리 시뮬레이션할 수 없다(아직 `LabelAlreadyRegistered`). 그래서 조건(EOA의 `ROLE_REGISTRAR`, 미래의 만료, Safe의 ERC-1155 수신)만 미리 확인하고, `send()`가 그 `unregister`가 반영된 직후에 시뮬레이션한다. 하나라도 걸리면 아무것도 보내지 않는다.
- 도중에 실패하면 회수 전에 멈추고, 지금 등록이 풀린 이름과 그 값(실행 전 값, 다시 등록할 기록값)을 출력한다. 같은 명령을 다시 돌리면 그 이름을 `deployments/`의 기록값으로 Safe에 다시 등록하고 나머지를 끝낸다.
- `--execute`는 RPC가 로컬이 아니고 `--sepolia`가 없으면 키를 읽기 전에 거부한다. 드라이런은 키 없이도 된다(`deployments/`의 treasury 주소로 계획한다).
- `tokenId`는 역할이 바뀔 때마다 새로 발행되므로 저장하지 않고 매번 `getTokenId(labelhash)`로 읽는다.
- 인계 후 `npm run verify`를 `--safe` 없이 돌리면 첫 검사(소유자 = 설정용 EOA)가 실패한다. 의도된 동작이다.

**등록이 풀리는 짧은 구간. 체결이 열리기 전에 돌린다.** 이름마다 `unregister`와 `register` 사이에 그 이름은 AVAILABLE이고, owner·resolver·subregistry가 0으로 읽힌다. 포크에서는 1블록, Sepolia에서는 보통 1–2블록이다. `clients`의 구간에는 모든 MM 이름이 게이트에서 막히고, MM 이름의 구간에는 그 MM만 막힌다. 레코드(`addr`, `desk.terms`)는 R에 이름별로 저장돼 있어 그대로다.

| 대상 | 인계 후 |
| --- | --- |
| resolver R 루트 권한 | Safe = `RESOLVER_ROOT_ALL`(모든 역할과 admin), EOA = 0 |
| 레지스트리 D·C·agents 루트 권한 | Safe = `REGISTRY_ROOT_ALL`, EOA = 0 |
| ETHRegistry의 `dao-treasury-a.eth` | 소유자 = Safe. 토큰 역할(`SET_SUBREGISTRY`, `SET_RESOLVER`, 둘의 admin, `CAN_TRANSFER_ADMIN`)이 전송과 함께 Safe로 가고 EOA = 0 |
| 하위 이름 `clients`, `agents`, `mm-a`, `mm-b`, `risk` | 소유자 = Safe(재발급). 만료·subregistry·resolver·레코드는 그대로, 토큰 역할은 이전처럼 없음(roleBitmap 0) |
| 만료된 `mm-c` | 건너뛴다. Safe가 재설정할 때 직접 `register`한다 |
| 에이전트의 키 단위 권한(`desk.spread`, `desk.stats`) | 그대로. 루트 권한과 별개인 grant라 EOA 회수와 무관하다 |
| 라우터가 읽는 값(3단계 만료, resolver, addr, `desk.terms`) | 그대로 |

**왜 `safeTransferFrom`인가.** ETHRegistry는 emancipated(`isEmancipated() == true`)라 safe 경로가 열려 있다. safe 경로만 "보내는 쪽이 그 토큰 역할의 유일한 보유자"(`isOnlyAssignee`)를 요구하므로, 전송 뒤 `dao-treasury-a.eth`에 역할을 가진 계정은 Safe뿐이다. `unsafeTransfer`가 건너뛰는 것은 emancipation 검사와 이 검사뿐이고, ERC-1155 수신 확인(`onERC1155Received`)은 두 경로 모두 한다. Safe 1.4.1의 기본 fallback handler(CompatibilityFallbackHandler)가 `0xf23a6e61`을 돌려주므로 Safe는 받는다. (확인: 배포본 `PermissionedRegistry._update`와 `ERC1155Singleton._updateWithAcceptanceCheck` 소스, 포크에서 수신 함수가 없는 R로 보낸 `unsafeTransfer`가 `ERC1155InvalidReceiver`로 revert)

**하위 이름은 전송 대신 재발급한다.** 하위 이름은 roleBitmap 0으로 등록돼 EOA에 토큰 역할이 없다. 전송하려면 보내는 쪽에 그 토큰의 `ROLE_CAN_TRANSFER_ADMIN`이 있어야 하는데, 이 역할은 등록할 때만 줄 수 있고 루트 권한으로는 대신할 수 없다. 포크에서 확인한 결과(requirement 014):

- `safeTransferFrom` → `TransferUnsafeUntilRegistryIsEmancipated`(UserRegistry는 emancipated가 아니다)
- `unsafeTransfer` → `TransferDisallowed`
- 토큰에 `ROLE_CAN_TRANSFER_ADMIN` 부여 → `EACCannotGrantRoles`

그래서 EOA가 루트 권한(`UNREGISTER`, `REGISTRAR`)을 가진 동안 지우고 다시 등록한다. 포크에서 본 동작(배포본 소스와 일치):

- `unregister`는 만료를 그 블록의 시각으로 바꾼다. 이름은 바로 AVAILABLE이 되고, `getOwner`·`getResolver`·`getSubregistry`는 0을 돌려준다. 이전 토큰은 소각되고, 다음 토큰 id의 버전이 1 오른다. 저장된 subregistry·resolver는 지워지지 않고 만료 검사에 가려질 뿐이다.
- 바로 다음 트랜잭션의 `register`가 같은 값으로 되살린다. 같은 블록 안에서 `unregister` 다음에 와도 된다(만료 검사가 `block.timestamp >= expiry`).
- 이미 만료된 이름의 `unregister`는 `LabelExpired`로 revert한다. 그래서 mm-c는 건너뛴다.

**Safe 소유자와 인계 후 운영 (팀 결정).**

- 실제 Safe는 2-of-3이다. 소유자 1·2는 Aqua 파트, 소유자 3은 ENS 파트다. ENS 파트는 소유자 3의 키만 갖는다. 키는 파트를 넘지 않고, 세 키가 한 파일에 모이지 않는다.
- 인계 후 ENS 쪽 변경은 전부 Safe 트랜잭션이고 Aqua 소유자 한 명의 공동 서명이 필요하다. 예: 데모 직전 mm-c 재설정, MM의 `addr` 변경, `desk.terms` 변경. 리스크 에이전트의 `desk.spread` 쓰기는 지금처럼 된다.
- `src/safe.ts`는 이 흐름대로 세 단계다. `proposeSafeTx`(키 불필요, 트랜잭션과 safeTxHash를 JSON으로 고정) → `signSafeTx`(소유자가 자기 키 하나로 서명. 서명은 공유해도 된다) → `execSafeTx`(서명이 threshold에 차면 아무 계정이나 제출). 이를 쓰는 CLI는 다음 requirement다.

**실제 Sepolia 인계 순서** (실제 Safe가 생긴 뒤, 체결이 열리기 전):

1. T6a가 만든 실제 Safe 주소(`config.safe`)와 소유자·threshold를 확인한다. 인계 뒤에는 EOA로 아무것도 못 하므로, EOA로 할 일(예: `npm run clients`)이 남았는지 먼저 본다.
2. 리허설: 그 시점의 Sepolia를 포크한 anvil에서 `FORK_IMPERSONATE=1 npm run handoff -- --safe <Safe> --execute` → `npm run verify -- --safe <Safe>`.
3. Sepolia 드라이런: RPC_URL을 Sepolia로 두고 `npm run handoff -- --safe <Safe>`. 계획(부여 4 + 이전 1 + 살아 있는 하위 이름마다 2 + 회수 4, 지금이면 19건)과 확인 결과를 본다.
4. 전송: `npm run handoff -- --safe <Safe> --execute --sepolia`. 중간에 끊기면 같은 명령을 다시 돌린다. 빠진 호출만 보내고, 등록이 풀린 이름은 기록값으로 다시 등록한다.
5. `npm run verify -- --safe <Safe>`. 같은 전송 명령을 한 번 더 돌려 "nothing to do"를 확인한다.

**키 없는 포크 실행 (팀 보안 SEC-05: 코딩 에이전트는 키를 받지 않는다).**

- `FORK_IMPERSONATE=1`이면 `wallet('TREASURY_PK')`와 `wallet('AGENT_PK')`가 `deployments/`에 기록된 주소(`treasury`, `agent.address`)로 보낸다. anvil impersonation(`anvil_impersonateAccount`)을 쓰므로 키가 필요 없다. `.env`에는 `RPC_URL=http://127.0.0.1:8546` 한 줄이면 된다.
- 로컬 RPC에서만 된다. 로컬이 아닌 RPC에서는 어떤 스크립트든 키나 네트워크를 쓰기 전에 거부한다(`--sepolia`를 줘도 마찬가지).
- 키가 `.env`에 있어도 `FORK_IMPERSONATE=1`이면 impersonation이 우선한다.

**포크 하네스 (포크 전용).** `scripts/fork-handoff-demo.ts`는 로컬 RPC가 아니면 거부한다.

```bash
anvil --fork-url https://ethereum-sepolia-rpc.publicnode.com --chain-id 11155111 --port 8546
npm run verify
FORK_IMPERSONATE=1 npx tsx scripts/fork-handoff-demo.ts
npm run verify -- --safe <하네스가 출력한 Safe>
```

- Safe 소유자는 anvil 기본 계정 1–3이다. 공개 테스트 니모닉에서 실행 중에 유도하고 출력하지 않는다. 실제 소유자를 대신하는 포크 전용 대역이다.
- 순서:
  1. 2-of-3 Safe 배포(saltNonce = `keccak256("ens-handoff-fork")`, T6a와 같은 방식)
  2. 인계 전 이름·값·레코드 기록
  3. handoff 드라이런(계획 구조 확인), 실행, 재실행(EOA nonce와 블록 번호가 그대로인지 확인)
  4. 이름마다 소유자 = Safe, 값·레코드는 인계 전과 같은지 확인
  5. EOA의 `desk.terms` 쓰기 revert(시뮬레이션과 실제 채굴), Safe 트랜잭션(소유자 1·2 서명, 소유자 1 실행)으로 mm-a `desk.terms`를 바꿨다가 원래 값으로, 에이전트의 `desk.spread` 쓰기
- 포크에서만 EOA와 에이전트의 잔액이 모자라면 채운다. `deployments/`는 바꾸지 않는다.

## 배포본 기준 사실 (저장소 main과 다르다)

아래는 Sepolia에 **배포된** 컨트랙트의 Blockscout 검증 소스에서 읽었고, `scripts/00-probe.ts`가 배포된 `decodeSetter`로 재확인한다. `ensdomains/contracts-v2@main`과 다르니 저장소를 보고 고치지 말 것.

| 항목 | 배포본 | main (쓰지 말 것) |
| --- | --- | --- |
| `ROLE_SET_DATA` | `1<<24` | `1<<36` |
| `ROLE_SET_ABI` / `ROLE_SET_INTERFACE` / `ROLE_SET_NAME` | `1<<12` / `1<<16` / `1<<20` | `1<<16` / `1<<20` / `1<<24` |
| `ROLE_LINK` | `1<<28` | 없음 |
| setter 첫 인자 | DNS 인코딩 이름 `bytes` | `bytes32 node` |
| 주소 setter | `setAddress(bytes,uint256,bytes)` | `setAddr(...)` |
| 키 단위 위임 | `grantSetterRoles(bytes setter, address)` | `authorizeDataRoles(...)` |
| `grantRoles` | **항상 revert** (`EACCannotGrantRoles`) | 동작 |
| resolver 초기화 | `initialize((address,uint256)[] grants, bytes[] calls)` | `initialize(address,uint256,bytes[])` |

- resolver 인스턴스는 `VerifiableFactory.deployProxy(PermissionedResolverImpl, salt, initData)`로 만든다. 주소는 `keccak(msg.sender, salt)` 기반 CREATE2라 미리 계산된다.
- `initialize`의 `calls`는 권한 검사 없이 실행된다. 기본 레코드를 여기서 넣는다.
- **기본 레코드 = 루트 이름(`0x00`)의 레코드.** 자기 레코드가 없는 이름은 이걸 통째로 쓴다. 대체는 **레코드 단위**다 — mm-a가 레코드를 하나라도 가지면 비어 있는 키(예: `desk.spread`)도 기본값으로 가지 않고 빈 값이 온다.
- 위임할 때 `setter`는 `setData(<아무 이름>, "desk.spread", "")`를 ABI 인코딩한 바이트다. resolver가 키에서 리소스(`keccak256("desk.spread")`)와 역할(`ROLE_SET_DATA`)을 스스로 뽑는다. 이름과 값은 무시된다.
- 키 단위 권한은 resolver 인스턴스 전체에 걸린다. 에이전트는 모든 MM의 `desk.spread`를 쓸 수 있다(의도된 설계).

## 참고: 체결 안에서 ENS 읽는 법

라우터의 기준은 팀 설계 §5.3·§6.4다(만료는 `getExpiry(labelhash)`로 읽는다). 아래는 배포된 컨트랙트로 확인한 읽기 경로를 요약한 참고용이다. `findExpiry(string label)`도 같은 값을 준다.

**게이트 (#34)** — 이름 `mm-a.clients.dao-treasury-a.eth`, taker = `msg.sender`

```solidity
// 1~2. 만료 3단계. 해석 실패를 기대하지 말고 레지스트리에서 직접 읽는다.
require(ETHRegistry.findExpiry("dao-treasury-a")> block.timestamp);
require(deskRegistry.findExpiry("clients")  > block.timestamp);
require(clientsRegistry.findExpiry("mm-a")  > block.timestamp);   // NameExpired
// 3. resolver 동일성
require(clientsRegistry.getResolver("mm-a") == treasuryResolver);  // WrongResolver
// 4. addr == taker
bytes memory r = IExtendedResolver(treasuryResolver).resolve(dnsName, abi.encodeCall(IAddrResolver.addr, (bytes32(0))));
require(abi.decode(r, (address)) == taker);                        // TakerMismatch
```

`resolve(name, data)`는 `data`의 첫 인자(node)를 **무시하고** `name`에서 namehash를 직접 계산한다. 그래서 `bytes32(0)`을 넣어도 되고, 라우터가 namehash를 계산할 필요가 없다.

**조건 읽기 (#35, `DeskPrice._records`)**: #21부터 라우터는 `desk.terms` 하나만 읽는다.

```solidity
bytes memory ret = IExtendedResolver(treasuryResolver).resolve(dnsName, abi.encodeCall(IDataResolver.data, (bytes32(0), "desk.terms")));
bytes memory terms = abi.decode(ret, (bytes));   // resolve()는 data()의 반환값을 ABI 인코딩한 채로 준다: 128바이트 값이면 192바이트
if (terms.length != 128) revert DeskPriceNoTerms();
// 32바이트 워드 네 개를 그대로 읽는다: version, sSell, sBuy, cap
```

- `resolve()`의 반환값은 레코드 값이 아니다. 오프셋(0x20)·길이 워드가 앞에 붙은 `abi.encode(bytes)`이므로, 먼저 `abi.decode(ret, (bytes))`로 풀고 나서 길이를 본다.
- 풀어낸 값이 128바이트가 아니면 revert한다(`DeskPriceNoTerms`).
- 네 워드 중 다음 하나라도 맞으면 같은 에러로 revert한다.
  - `version != 1`
  - `sSell > 0xFFFF` 또는 `sBuy > 0xFFFF`: 워드를 그대로 비교하므로 `uint16`으로 잘라 읽지 않는다
  - `sSell >= sBuy`
  - `sBuy >= 10000`
  - `cap == 0` 또는 `cap > type(uint128).max`
- 기본 레코드(루트 이름)는 Sepolia에서 아직 #21 이전의 96바이트(cap 0)라 길이에서 걸린다. 새로 배포하면 (1, 3, 10, 0)이고 `cap == 0`에서 걸린다. 어느 쪽이든 레코드가 없는 이름은 체결되지 않는다.
- `npm run verify`(`src/read.ts`)는 multicall 한 번으로 `addr`, `desk.terms`, `desk.spread`를 읽고, 각 결과를 `abi.decode(…, (bytes))`로 푼 뒤 `src/encode.ts`의 `decodeTerms()`로 같은 규칙을 적용한다.
- **main의 라우터는 아직 풀지 않는다 (Aqua 레인에 보고함, 2026-09-26).**
  - `DeskPrice._records`는 `resolve()`의 반환값 길이를 그대로 128과 비교한다. 실제 PermissionedResolver에서는 128바이트 레코드가 192바이트로 돌아오므로 모든 체결이 `DeskPriceNoTerms`로 revert한다. 테스트의 `MockEnsResolver`는 `data()`에서 값을 감싸지 않고 돌려줘서 통과한다.
  - 포크에서 확인했다: Safe가 128바이트를 쓴 뒤, 라우터와 같은 호출이 192바이트를 돌려준다.
  - 고치는 법: `DeskPrice`에서 `abi.decode(resolve(...), (bytes))`, 목에서 `return abi.encode(rec.value);`. 그다음 라우터를 재배포하고 전략을 다시 ship한다.

`takerData`는 팀 설계 §5.3에 따라 `uint8 len ‖ dnsName`이다. `dnsEncode()`는 그중 `dnsName` 부분만 만든다. `npm run verify`가 mm-a의 `dnsName`을 출력한다.
