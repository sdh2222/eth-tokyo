# ens — ENS lane

지갑 안의 OTC 데스크의 ENS 파트. 트레저리가 소유한 이름 계층을 만들고, MM별 거래 조건을 레코드로 기록하고, 리스크 에이전트에게 스프레드 키 하나만 위임한다. 라우터가 읽는 계약은 `docs/code/desk-system.md` §6(브랜치 `claude/sleepy-ritchie-5lp65m`)이 기준이다.

레코드 형식과 단위는 팀 설계 §6.2·D5를 따른다: `desk.terms = abi.encode(uint8 1, uint16 tierBps, uint128 capPerFill)`, `desk.spread = abi.encode(uint8 1, uint16 spreadBps, uint64 validUntil)`, 둘 다 96바이트, `capPerFill`은 USDC 6자리.

## 현재 배포 (Sepolia, 2026-09-25)

데모 데스크 이름은 팀 설계대로 `dao-treasury-a.eth`다(데스크는 DAO 자신의 이름 아래 둔다, §6.1). `npm run verify`의 모든 필수 검사가 실제 체인에서 통과했고, mm-a의 `dnsName`은 §9 골든 벡터와 바이트 단위로 같다. 이름 변경 전의 `desk.eth` 배포는 `deployments/sepolia.desk.json`에 기록만 남겨 둔다. 다른 파트로 넘길 값은 `npm run export`가 `deployments/config.dao-treasury-a.json`에 `config/sepolia.json`(§8.0) 형식으로 쓴다.

| 항목 | 주소 |
| --- | --- |
| resolver R | `0x228bd144dB976960E8D5AbfAe6d5CeB15346970F` |
| desk registry D (`dao-treasury-a.eth`의 하위) | `0x72B3d4B4adCd057c904B3bB59fa201bF10F983b2` |
| clients registry C (`clients.dao-treasury-a.eth`의 하위) | `0x8f6c1e8DE9BDAe6Be0f028e7Ce596F9e530a984e` |
| agents registry | `0x5A6b0C2DAb9A29FA2cc949Dbc8a38f222609b5CF` |
| mm-a / mm-b | tier 10 / 25 bps, cap 100,000 USDC, 만료 2026-10-25 |
| mm-c | mm-a와 같은 조건, 만료 15분 (데모 3번용 — 데모 직전 `npm run clients`로 재설정) |
| risk.agents.dao-treasury-a.eth | 에이전트 `0xcCf3e2aD56Af881C13CCEb19Ab6cEbFbDD739899` (Aqua 레인 지갑, 주소만 받음, 2026-09-26). `desk.spread`·`desk.stats` 권한만 있다 |

데모용 트랜잭션:

- `dao-treasury-a.eth` 등록 — [0x1844…1d2b](https://sepolia.etherscan.io/tx/0x18445307c7ce6b56e558448dcd7ab830d74fe848f9134fc36573d4a367b01d2b)
- (이전 에이전트 `0x7ab7…5Ca3`, 09-25) 에이전트가 `desk.spread`를 씀 (허용) — [0x3497…a6b](https://sepolia.etherscan.io/tx/0x3497b52c9ad5938ecff01f1024959f36fbaf21e09d2e1a04de0b1831c88bb1a6)
- (이전 에이전트 `0x7ab7…5Ca3`, 09-25) 에이전트가 `desk.terms`를 쓰려다 revert (거부) — [0x0b8c…835](https://sepolia.etherscan.io/tx/0x0b8cd052895b653ef4da15455a22177a89deb92fe1f98b84cabfb6f5fb390835)

남은 일:

- **Safe 인계 실행.** 지금은 테스트넷 EOA(`TREASURY_PK`)가 이름과 resolver·레지스트리 루트 권한을 갖고 있다. 넘기는 스크립트는 준비됐고 포크에서 검증했다(아래 [Safe 인계](#safe-인계)). 실제 Sepolia 실행은 실제 Safe(T6a)가 생긴 뒤다.
- `config/sepolia.json`이 생기면(T0) `npm run export`가 `ens`, `mms`를 병합한다.

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

팀 설계 §6.1·§6.3대로 이름과 권한은 트레저리 Safe가 가진다. `01`–`04`가 만든 것은 지금 설정용 EOA(`TREASURY_PK`)에 있고, `npm run handoff`가 이를 Safe로 넘긴다(requirement 014).

```bash
npm run handoff -- --safe <Safe>                      # 드라이런: 상태, 보낼 호출 목록, 전 호출 시뮬레이션. 아무것도 보내지 않는다
npm run handoff -- --safe <Safe> --execute            # 전송. 로컬 RPC(anvil 포크)에서만 된다
npm run handoff -- --safe <Safe> --execute --sepolia  # 로컬이 아닌 RPC(실제 Sepolia)로 전송
npm run verify -- --safe <Safe>                       # 기존 검사 + 인계 검사
```

- 체인을 먼저 읽고 빠진 호출만 이 순서로 보낸다. ① R·D·C·agents에 `grantRootRoles(<ROOT_ALL>, Safe)` ② ETHRegistry에서 `dao-treasury-a.eth`를 `safeTransferFrom(EOA, Safe, tokenId, 1, 0x)` ③ ①②가 체인에 반영됐는지 다시 읽어 확인한 뒤, EOA가 가진 루트 권한을 `revokeRootRoles`로 전부 회수. 끝난 뒤 다시 돌리면 아무것도 보내지 않는다.
- 첫 전송 전에 계획한 호출을 전부 현재 상태에 시뮬레이션한다. 하나라도 revert하면 아무것도 보내지 않는다.
- `--execute`는 RPC가 로컬이 아니고 `--sepolia`가 없으면 키를 읽기 전에 거부한다. 드라이런은 키 없이도 된다(`deployments/`의 treasury 주소로 계획한다).
- `tokenId`는 역할이 바뀔 때마다 새로 발행되므로 저장하지 않고 매번 `getTokenId(labelhash)`로 읽는다.
- 인계 후 `npm run verify`를 `--safe` 없이 돌리면 첫 검사(소유자 = 설정용 EOA)가 실패한다. 의도된 동작이다.

| 대상 | 인계 후 |
| --- | --- |
| resolver R 루트 권한 | Safe = `RESOLVER_ROOT_ALL`(모든 역할과 admin), EOA = 0 |
| 레지스트리 D·C·agents 루트 권한 | Safe = `REGISTRY_ROOT_ALL`, EOA = 0 |
| ETHRegistry의 `dao-treasury-a.eth` | 소유자 = Safe. 토큰 역할(`SET_SUBREGISTRY`, `SET_RESOLVER`, 둘의 admin, `CAN_TRANSFER_ADMIN`)이 전송과 함께 Safe로 가고 EOA = 0 |
| 에이전트의 키 단위 권한(`desk.spread`, `desk.stats`) | 그대로. 루트 권한과 별개인 grant라 EOA 회수와 무관하다 |
| 라우터가 읽는 값(3단계 만료, resolver, addr, `desk.terms`) | 그대로 |

**왜 `safeTransferFrom`인가.** ETHRegistry는 emancipated(`isEmancipated() == true`)라 safe 경로가 열려 있다. safe 경로만 "보내는 쪽이 그 토큰 역할의 유일한 보유자"(`isOnlyAssignee`)를 요구하므로, 전송 뒤 `dao-treasury-a.eth`에 역할을 가진 계정은 Safe뿐이다. `unsafeTransfer`가 건너뛰는 것은 emancipation 검사와 이 검사뿐이고, ERC-1155 수신 확인(`onERC1155Received`)은 두 경로 모두 한다. Safe 1.4.1의 기본 fallback handler(CompatibilityFallbackHandler)가 `0xf23a6e61`을 돌려주므로 Safe는 받는다. (확인: 배포본 `PermissionedRegistry._update`와 `ERC1155Singleton._updateWithAcceptanceCheck` 소스, 포크에서 수신 함수가 없는 R로 보낸 `unsafeTransfer`가 `ERC1155InvalidReceiver`로 revert)

**옮기지 않는 것: 하위 이름 토큰.** `clients`, `agents`, `mm-a/b/c`, `risk`의 `ownerOf`는 EOA로 남는다.

- 이 이름들은 roleBitmap 0으로 등록돼 EOA에 토큰 역할이 없다. 전송하려면 보내는 쪽에 그 토큰의 `ROLE_CAN_TRANSFER_ADMIN`이 있어야 하는데, 이 역할은 등록할 때만 줄 수 있고 루트 권한으로는 대신할 수 없다.
- 포크에서 본 결과: `safeTransferFrom` → `TransferUnsafeUntilRegistryIsEmancipated`(UserRegistry는 emancipated가 아니다), `unsafeTransfer` → `TransferDisallowed`, 토큰에 `ROLE_CAN_TRANSFER_ADMIN` 부여 → `EACCannotGrantRoles`, Safe가 직접 옮기기 → `ERC1155MissingApprovalForAll`.
- 문제는 없다. EOA는 그 토큰에 역할이 없어 아무것도 못 하고, Safe는 레지스트리 루트 권한(`REGISTRAR`, `RENEW`, `UNREGISTER`, `SET_RESOLVER`, `SET_SUBREGISTRY` 등)으로 하위 이름을 모두 관리한다. `ownerOf`까지 Safe로 바꾸려면 Safe가 unregister한 뒤 다시 등록해야 한다. 범위 밖이라 시도하지 않았다.

**Safe 소유자와 인계 후 운영 (팀 결정).**

- 실제 Safe는 2-of-3이다. 소유자 1·2는 Aqua 파트, 소유자 3은 ENS 파트다. ENS 파트는 소유자 3의 키만 갖는다. 키는 파트를 넘지 않고, 세 키가 한 파일에 모이지 않는다.
- 인계 후 ENS 쪽 변경은 전부 Safe 트랜잭션이고 Aqua 소유자 한 명의 공동 서명이 필요하다. 예: 데모 직전 mm-c 재설정, MM의 `addr` 변경, `desk.terms` 변경. 리스크 에이전트의 `desk.spread` 쓰기는 지금처럼 된다.
- `src/safe.ts`는 이 흐름대로 세 단계다. `proposeSafeTx`(키 불필요, 트랜잭션과 safeTxHash를 JSON으로 고정) → `signSafeTx`(소유자가 자기 키 하나로 서명. 서명은 공유해도 된다) → `execSafeTx`(서명이 threshold에 차면 아무 계정이나 제출). 이를 쓰는 CLI는 다음 requirement다.

**실제 Sepolia 인계 순서** (실제 Safe가 생긴 뒤):

1. T6a가 만든 실제 Safe 주소(`config.safe`)와 소유자·threshold를 확인한다. 인계 뒤에는 EOA로 아무것도 못 하므로, EOA로 할 일(예: `npm run clients`)이 남았는지 먼저 본다.
2. 리허설: 그 시점의 Sepolia를 포크한 anvil에서 `npm run handoff -- --safe <Safe> --execute` → `npm run verify -- --safe <Safe>`.
3. Sepolia 드라이런: RPC_URL을 Sepolia로 두고 `npm run handoff -- --safe <Safe>`. 계획 9건과 시뮬레이션 결과를 확인한다.
4. 전송: `npm run handoff -- --safe <Safe> --execute --sepolia`. 중간에 끊기면 같은 명령을 다시 돌린다. 빠진 호출만 보낸다.
5. `npm run verify -- --safe <Safe>`. 같은 전송 명령을 한 번 더 돌려 "nothing to do"를 확인한다.

**포크 하네스 (포크 전용).** `scripts/fork-handoff-demo.ts`는 로컬 RPC가 아니면 거부한다.

```bash
anvil --fork-url https://ethereum-sepolia-rpc.publicnode.com --chain-id 11155111 --port 8546
RPC_URL=http://127.0.0.1:8546 npm run verify
RPC_URL=http://127.0.0.1:8546 npx tsx scripts/fork-handoff-demo.ts
RPC_URL=http://127.0.0.1:8546 npm run verify -- --safe <하네스가 출력한 Safe>
```

- Safe 소유자는 anvil 기본 계정 1–3이다. 공개 테스트 니모닉에서 실행 중에 유도하고 출력하지 않는다. 실제 소유자를 대신하는 포크 전용 대역이다.
- 순서: 2-of-3 Safe 배포(saltNonce = `keccak256("ens-handoff-fork")`, T6a와 같은 방식) → 하위 이름 전송 시뮬레이션(읽기 전용) → handoff 드라이런, 실행, 재실행(EOA nonce와 블록 번호가 그대로인지 확인) → EOA의 `desk.terms` 쓰기 revert → Safe 트랜잭션(소유자 1·2 서명, 소유자 1 실행)으로 mm-a `desk.terms`를 바꿨다가 원래 값으로 → 에이전트의 `desk.spread` 쓰기.
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
- **기본 레코드 = 루트 이름(`0x00`)의 레코드.** 자기 레코드가 없는 이름은 이걸 통째로 쓴다. 대체는 **레코드 단위**다 — mm-a가 레코드를 하나라도 가지면 `desk.spread`가 비어도 기본값으로 가지 않고 빈 값이 온다. 스프레드 폴백은 라우터가 해야 한다.
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

**조건 읽기 (#35 앞부분)** — 한 번의 호출로 묶는다

```solidity
bytes[] memory calls = new bytes[](2);
calls[0] = abi.encodeCall(IDataResolver.data, (bytes32(0), "desk.terms"));
calls[1] = abi.encodeCall(IDataResolver.data, (bytes32(0), "desk.spread"));
bytes memory out = IExtendedResolver(treasuryResolver).resolve(dnsName, abi.encodeCall(IMulticallable.multicall, (calls)));
bytes[] memory res = abi.decode(out, (bytes[]));
bytes memory terms  = abi.decode(res[0], (bytes));   // abi.encode(uint8 v, uint16 tierBps, uint128 capPerFill), 96바이트
bytes memory spread = abi.decode(res[1], (bytes));   // abi.encode(uint8 v, uint16 spreadBps, uint64 validUntil), 96바이트 또는 빈 값
```

- `terms`가 빈 값이면 체결 불가. 기본 레코드의 `capPerFill`이 0이라 레코드 없는 이름도 여기서 걸린다.
- `spread`가 96바이트가 아니거나 버전이 1이 아니거나 `validUntil < block.timestamp`면 무시하고 `terms`의 `tierBps`로 폴백하고, 최종값을 `[sMinBps, sMaxBps]`로 clamp한다(§5.4).
- `terms`가 96바이트가 아니거나 버전이 1이 아니거나 `capPerFill == 0`이면 `DeskPriceNoTerms`로 revert한다(D7).

`takerData`는 팀 설계 §5.3에 따라 `uint8 len ‖ dnsName`이다. `dnsEncode()`는 그중 `dnsName` 부분만 만든다. `npm run verify`가 mm-a의 `dnsName`을 출력한다.
