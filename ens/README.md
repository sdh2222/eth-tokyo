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
npm run verify     # 수용 기준 자동 검사
npm run export     # config/sepolia.json 형식으로 ens, mms 내보내기
```

모든 스크립트는 멱등이다. 체인 상태나 `deployments/sepolia.json`을 먼저 보고 이미 된 단계는 건너뛴다. 데모 직전에 `npm run clients`를 다시 돌리면 mm-c의 만료 시계가 새로 시작된다(`MM_C_TTL_SECONDS`, 기본 900초).

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
