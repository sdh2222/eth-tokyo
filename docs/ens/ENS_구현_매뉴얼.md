> **상태: 구현 완료.** 이 지시서대로 만든 코드가 `ens/setup` 브랜치의 `ens/`에 있다(모든 수용 기준 통과, Sepolia 배포). 레코드 형식은 팀 설계 §6.2로 맞췄다. 실제 API는 `ens/src/read.ts`와 `ens/README.md`를 따른다.

# ENS 파트 구현 매뉴얼 (코딩 에이전트용)

이 문서는 **지갑 안의 OTC 데스크**의 ENS 파트를 구현할 에이전트에게 주는 작업 지시서다. 사람이 아니라 에이전트가 읽는다는 전제로 썼다.

> **이 문서는 스펙이다. 구현은 해커톤 시작(T+0) 이후에 시작한다.** ETHGlobal Classic 규칙이 사전 프로젝트 코드를 금지한다. 시작 전에는 이 문서를 읽고, 온체인 읽기 전용 조회로 사실 확인만 한다.

---

## 0. 에이전트에게 주는 운영 규칙

1. **시그니처를 기억으로 쓰지 마라.** ENSv2는 아직 최종본이 아니고 문서에 없는 함수가 많다. 코드를 쓰기 전에 배포된 컨트랙트에서 ABI를 확인하고, `cast call`로 한 번 찔러본 뒤에 쓴다.
2. **확인한 사실 옆에 확인 방법을 적어라.** 커밋 메시지나 주석에 `// 확인: cast call ... → 0x...` 형태로 남긴다. 문서에 없다는 것을 존재하지 않는다는 근거로 쓰지 않는다.
3. **막히면 멈추고 보고해라.** 특히 3장의 "미확인 항목"에서 막히면 추측으로 우회하지 말고 무엇이 막혔는지 보고한다.
4. **다른 파트의 코드를 건드리지 마라.** 라우터(Solidity)와 웹 앱은 다른 담당이 쓴다. 이 작업의 산출물은 TypeScript 패키지 하나와 스크립트들뿐이다.
5. **인터페이스 계약(5장)을 혼자 바꾸지 마라.** 바꿔야 할 이유를 찾으면 보고부터 한다. 라우터가 같은 바이트를 읽는다.

---

## 1. 무엇을 만드는가

트레저리(DAO 금고)가 마켓메이커에게 양방향 호가를 내는 온체인 데스크다. **누가 어떤 조건으로 체결할 수 있는지를 ENS 이름과 레코드가 정한다.** 라우터가 체결할 때마다 ENS를 읽으므로, ENS는 표시용이 아니라 체결 경로의 일부다.

ENS 파트가 책임지는 것:

- 이름 계층을 만들고 MM별 이름을 발급한다
- 각 이름에 거래 조건(등급, 한도)과 스프레드를 레코드로 기록한다
- 리스크 에이전트에게 스프레드 키 하나만 위임한다
- 라우터와 웹 앱이 읽을 수 있는 조회 라이브러리를 제공한다

책임지지 않는 것: 라우터 명령어, 호가 수식, 웹 화면, Aqua 전략 등록.

---

## 2. 확인된 사실 (그대로 써도 된다)

모두 2026-09-25에 온체인 또는 공식 문서로 확인했다.

**체인: Sepolia 하나.** ENSv2가 Sepolia에만 배포돼 있고, Aqua 공식 레지스트리도 Sepolia에 있다.

| 컨트랙트 | 주소 |
| --- | --- |
| ETHRegistry | `0x657ea849311d3d5823348dded7c2aaafb3ede09e` |
| RootRegistry | `0x9703dbd26dab89504490994138cf2c575251a9ce` |
| ETHRegistrar | `0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca` |
| UniversalResolverV2 | `0x5d25c1d6acbb71b7a28aa7899618a3412a8303e3` |
| PublicResolverV2 | `0xd7e590ad0e92a6ac1d81f4483a9b951d3585a50f` |
| MockUSDC (등록 결제용, 6 decimals) | `0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e` |
| PermissionedResolverImpl | `0x14f09fd05d4585759e54844dc9b00147131cf243` |
| VerifiableFactory (프록시 배포용) | `0x9e726eb570beb6bceb495ab8cda7df517d4e841c` |
| UserRegistryImpl (서브레지스트리용) | `0xa80338aaa8d23831cea25e858d1774534abb0263` |
| BatchRegistrar | `0xbe68ff9afc7d5a1864ffef5c82de0a1c13e6b529` |
| StandardRentPriceOracle | `0x9b0b9c65bdaf9794ff7697e4dcfb1f50581072bb` |
| Aqua 레지스트리 (참고, 라우터 담당이 씀) | `0x1111113ccf1426a8e30e2bff5e005d929bf6a90a` |

배포 목록 전체는 38개다. 위는 우리가 쓰는 것만 추렸다.

### 검증된 함수 (Blockscout 검증 소스 + 배포 바이트코드 셀렉터로 확인)

**ETHRegistrar**

```
makeCommitment(string,address,bytes32,address,address,uint64,bytes32) → bytes32   (pure, 실제 호출 확인)
commit(bytes32)
commitmentAt(bytes32) → uint64
register(string,address,bytes32,address,address,uint64,address,bytes32) → uint256
isAvailable(string) → bool
getRegisterPrice(string,uint64,address) → (uint256 base, uint256 premium)   ← 두 값이다
```

인자 순서는 `(label, owner, secret, subregistry, resolver, duration, [paymentToken,] referrer)`. 등록하면 소유자는 `ROLE_SET_SUBREGISTRY`·`ROLE_SET_RESOLVER`(+admin)를 받으므로, subregistry·resolver를 0으로 등록하고 나중에 붙여도 된다.

**ETHRegistry / UserRegistry** (같은 인터페이스)

```
findExpiry(string label) → uint64        ← 라우터 게이트의 만료 확인
getResolver(string label) → address
getSubregistry(string label) → address
getOwner(uint256 anyId) → address         (anyId = labelhash)
setSubregistry(uint256,address) / setResolver(uint256,address)
register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry)
initialize((address account, uint256 roleBitmap)[] grants)      ← UserRegistry 프록시 초기화
```

**PermissionedResolverImpl** — 모든 setter가 DNS 인코딩 이름(bytes)을 받는다

```
initialize((address account, uint256 roleBitmap)[] grants, bytes[] calls)
setAddress(bytes name, uint256 coinType, bytes addressBytes)    ← setAddr가 아니다
setData(bytes name, string key, bytes value)
setText(bytes name, string key, string value)
multicall(bytes[] calls)
resolve(bytes name, bytes data) → bytes    ← 읽기는 이것뿐. data의 node 인자는 무시된다
grantSetterRoles(bytes setter, address account)   ← 키 단위 위임
grantRootRoles(uint256,address) / revokeRoles(uint256,uint256,address)
decodeSetter(bytes) → (bytes arg, uint256 resource, uint256 roleBitmap)   (pure)
grantRoles(...)   ← 항상 revert. 쓰지 말 것
```

**VerifiableFactory**: `deployProxy(address implementation, uint256 salt, bytes data) → address`. 주소는 `keccak(msg.sender, salt)` 기반 CREATE2라 미리 계산된다.

### 역할 상수 — 배포본 기준

저장소 main과 다르다. 배포된 `decodeSetter`로 `ROLE_SET_DATA = 1<<24`, `ROLE_SET_TEXT = 1<<4`를 직접 확인했다.

```
resolver:  SET_ADDRESS 1<<0  SET_TEXT 1<<4  SET_CONTENTHASH 1<<8  SET_ABI 1<<12
           SET_INTERFACE 1<<16  SET_NAME 1<<20  SET_DATA 1<<24  LINK 1<<28
           CAN_NAME 1<<120  UPGRADE 1<<124        admin = role << 128
registry:  REGISTRAR 1<<0  UNREGISTER 1<<12  RENEW 1<<16  SET_SUBREGISTRY 1<<20  SET_RESOLVER 1<<24
```

에이전트에게는 비트맵을 직접 주지 않는다. `grantSetterRoles(setter, agent)`로 주면 resolver가 setter에서 리소스와 역할을 뽑는다.

- `desk.eth`는 비어 있다. 대체 후보 `otcdesk`, `quotedesk`, `aquadesk`, `deskdao`, `treasurydesk`, `walletdesk`도 전부 비어 있다.
- 등록비: 28일 12.27 MockUSDC, 1년 160.00 MockUSDC (4글자 이름 기준). 결제 토큰이 MockUSDC가 아니면 revert한다.
- 등록 상수 (컨트랙트에서 직접 읽음): `MIN_COMMITMENT_AGE` 60초, `MAX_COMMITMENT_AGE` 86,400초(24시간), `MIN_REGISTER_DURATION` 2,419,200초(28일), `MIN_RENEW_DURATION` 1초.
- **commit은 60초 뒤부터 24시간 안에 써야 한다.** 너무 일찍 걸어두고 방치하면 만료된다.
- 28일 미만 기간은 `getRegisterPrice`부터 revert한다.
- MockUSDC는 `mint(address,uint256)`가 퍼미셔리스다. 등록비는 여기서 민트해서 낸다.
- `isAvailable`은 실제로 구분한다. 대조군에서 `test`·`ens`·`alice`·`bob`·`nick`·`vitalik`은 false(이미 등록), `desk`·`hello`는 true로 나왔다.

RPC: `https://ethereum-sepolia-rpc.publicnode.com` (읽기 확인됨).

---

## 3. 해결된 항목

전부 풀렸다(2026-09-25). 구현은 `otc-desk/packages/ens`에 있고, 라우터용 읽기 레시피는 그 README에 있다.

| 항목 | 답 |
| --- | --- |
| 주소 setter | `setAddress(bytes name, uint256 coinType, bytes addressBytes)` |
| resolver 인스턴스 | `VerifiableFactory.deployProxy(PermissionedResolverImpl, salt, initialize(grants, calls))` |
| 서브레지스트리 | `VerifiableFactory.deployProxy(UserRegistryImpl, salt, initialize(grants))` 후 부모 이름에 `setSubregistry` |
| 위임 바이트 | `setData(<아무 이름>, "desk.spread", "")`의 ABI 인코딩. 이름과 값은 무시된다 |
| 기본 레코드 | 루트 이름(`0x00`)의 레코드. `initialize`의 `calls`로 넣으면 권한 검사 없이 들어간다 |
| 기본 레코드 대체 단위 | **레코드 단위.** 자기 레코드가 있는 이름은 빠진 키를 기본값으로 채우지 않는다. 스프레드 폴백은 라우터가 한다 |
| 읽기 | `resolve(name, data)`만 있다. `multicall` 프로필로 여러 키를 한 번에 읽는다 |

## 4. 이름과 레코드 구조

### 이름 계층

```
desk.eth                        트레저리(Safe) 소유. 데스크 자체
├─ clients.desk.eth             MM 명단을 담는 서브레지스트리
│   ├─ mm-a.clients.desk.eth    MM 한 곳 = 이름 하나
│   ├─ mm-b.clients.desk.eth
│   └─ mm-c.clients.desk.eth    만료 데모용 (만료를 짧게)
└─ agents.desk.eth
    └─ risk.agents.desk.eth     리스크 에이전트 신원
```

**모든 이름은 트레저리가 소유한다.** MM에게 이름을 넘기지 않는다. MM이 소유하면 resolver를 자기 것으로 바꿔 자기 한도를 직접 쓸 수 있기 때문이다.

### 레코드

| 키 | 종류 | 쓰는 주체 | 읽는 쪽 |
| --- | --- | --- | --- |
| `addr` | address | 멀티시그 | 라우터 게이트 |
| `desk.terms` | data | 멀티시그 | 라우터 조건 |
| `desk.spread` | data | 리스크 에이전트 | 라우터 조건 |
| `desk.stats` | text (JSON) | 리스크 에이전트 | 웹 앱 |
| `desk.deployment` (on `desk.eth`) | text (JSON) | 멀티시그 | 웹 앱 |

라우터가 읽는 값을 text가 아니라 data로 두는 이유는 온체인에서 JSON을 파싱하지 않기 위해서다.

**기본 레코드의 `capPerFill`은 반드시 0으로 둔다.** 자기 레코드가 없는 이름은 기본 레코드를 상속받으므로, 0이 아니면 레코드를 채우지 않은 이름으로도 체결이 된다.

---

## 5. 인터페이스 계약 (혼자 바꾸지 말 것)

라우터가 같은 바이트를 읽는다. 바꿔야 하면 보고부터.

```solidity
// desk.terms — 멀티시그만 쓴다
abi.encode(uint8 version, uint16 tierBps, uint128 capPerFill)   // 96바이트, capPerFill은 USDC 6자리

// desk.spread — 리스크 에이전트만 쓴다
abi.encode(uint8 version, uint16 spreadBps, uint64 validUntil)   // 96바이트
```

- `version = 1`
- ask는 데스크가 ETH를 파는 쪽, bid는 사는 쪽. bid를 더 넓게 준다 (트레저리는 방향이 정해진 매도자라 매수 쪽이 더 위험하다)
- `desk.spread`가 비었거나 `validUntil`이 지나면 라우터가 `desk.terms`의 등급 값으로 폴백한다

이름 전달: MM은 `takerData`에 **DNS 인코딩된 전체 이름**을 넣는다. 예를 들어 `mm-a.clients.desk.eth`는 길이 접두사 방식으로 `0x04` + `mm-a` + `0x07` + `clients` + `0x04` + `desk` + `0x03` + `eth` + `0x00`이 된다. `encodeTakerName()`의 출력이 라우터의 파싱과 **바이트 단위로 같아야 한다.** T+0에 예제 하나를 라우터 담당과 교환해서 먼저 맞춰라.

---

## 6. 산출물

패키지 하나와 스크립트들. 제안 구조이며, 저장소 컨벤션이 다르면 맞춰도 된다.

```
packages/ens/
  src/
    addresses.ts     확인된 주소 상수
    abis.ts          T+0에 받아온 ABI 조각
    encode.ts        레코드 인코딩/디코딩, DNS 이름 인코딩
    read.ts          readClient, lookupName
    write.ts         addClient, setSpread, setTerms
    setup.ts         setupDesk (이름 계층 + resolver + 기본 레코드)
  scripts/
    01-register-desk.ts
    02-setup-registry.ts
    03-add-clients.ts
    04-grant-agent.ts
    99-verify.ts     수용 기준을 자동으로 검사
```

### 공개 API (시그니처 고정)

```ts
readClient(name: string): Promise<{
  addr: `0x${string}`
  terms: { tierBps: number; capPerFill: bigint } | null; termsValid: boolean
  spreadAsk?: number; spreadBid?: number; validUntil?: bigint
  expiry: bigint; resolverOk: boolean
}>

lookupName(address: `0x${string}`): Promise<string | null>
addClient(label: string, addr: `0x${string}`, tierBps: number, capPerFill: bigint, expiry: bigint): Promise<Hash>
setSpread(name: string, spreadBps: number, validUntil: bigint): Promise<Hash>
encodeTakerName(name: string): `0x${string}`
```

`readClient`는 라우터가 보는 것과 같은 판단을 재현해야 한다. 즉 만료 3단계와 resolver 동일성까지 확인해서 `resolverOk`와 `expiry`를 채운다. 웹 앱이 이 값으로 "체결 가능/불가"를 표시한다.

---

## 7. 작업 순서와 수용 기준

각 단계는 **검증 가능한 기준**으로 끝난다. 기준을 통과하기 전에 다음 단계로 가지 마라.

### 단계 1 — 환경과 사실 확인 (T+0)

- ABI 확보: ETHRegistrar, ETHRegistry, PublicResolverV2
- 읽기 호출 성공: `isAvailable("desk")`, `getRegisterPrice("desk", 2419200, <MockUSDC>)`
- **기준:** 세 컨트랙트에서 각각 읽기 호출이 한 번씩 성공한다

### 단계 2 — 이름 등록

- MockUSDC 민트 → approve → `desk.eth` commit → 60초 대기 → register
- **기준:** `desk.eth`의 소유자가 우리 지갑이고, 만료 시각을 읽을 수 있다

### 단계 3 — resolver와 서브레지스트리

- 트레저리 resolver 확보(생성 방식은 3장에서 확인), 멀티시그에 루트 권한
- `clients.desk.eth`를 서브레지스트리로 생성
- 기본 레코드를 `capPerFill = 0`으로 기록
- **기준:** 레코드가 없는 임의의 서브네임을 조회하면 `capPerFill`이 0으로 나온다

### 단계 4 — MM 이름과 조건

- `mm-a`, `mm-b`, `mm-c` 발급. `mm-c`는 만료를 짧게
- 각각 `addr`과 `desk.terms` 기록 (시드값은 8장)
- **기준:** `readClient("mm-a.clients.desk.eth")`가 시드값과 정확히 일치하는 값을 돌려준다

### 단계 5 — 에이전트 위임

- `risk.agents.desk.eth` 발급, `addr` 기록
- `grantSetterRoles`로 에이전트 주소에 `desk.spread`(data)와 `desk.stats`(text) 쓰기 권한만 부여
- **기준 두 개:**
  1. 에이전트 키로 `setSpread`가 성공한다
  2. **에이전트 키로 `desk.terms`를 쓰면 `EACUnauthorizedAccountRoles`로 revert된다** ← 데모 4번의 근거이므로 반드시 재현하고 트랜잭션 해시를 남겨라

### 단계 6 — 조회 라이브러리 완성

- `readClient`, `lookupName`, `encodeTakerName` 완성
- 여러 레코드를 한 번에 읽도록 묶어 호출 횟수를 줄인다
- **기준:** `99-verify.ts`가 아래를 전부 통과한다
  - mm-a, mm-b가 서로 다른 등급으로 읽힌다
  - mm-c의 만료 시각이 현재보다 앞이면 `expiry` 판정이 false다
  - 레코드 없는 이름은 `capPerFill = 0`이다
  - `encodeTakerName`의 출력이 라우터 담당이 준 기대값과 바이트 단위로 같다

---

## 8. 시드값

| 항목 | 값 |
| --- | --- |
| mm-a | tierBps 10, capPerFill 100_000e6 (USDC) |
| mm-b | tierBps 25, capPerFill 100_000e6 (USDC) |
| mm-c | mm-a와 동일, 만료만 짧게 (데모 중 만료되도록) |
| 기본 레코드 | tierBps 0, capPerFill 0 (라우터가 DeskPriceNoTerms로 revert) |
| `desk.terms` version | 1 |

기본 레코드의 스프레드를 넓게(300bps) 두는 이유가 있다. 폴백은 항상 **보수적인 쪽**이어야 한다. 폴백이 좁으면 에이전트를 멈추게 만드는 것이 공격자에게 이득이 된다.

---

## 9. 자주 틀리는 지점

- **만료된 이름도 조회에 성공할 수 있다.** Universal Resolver는 상위 resolver를 통해 해석할 수 있으므로, 만료 판정은 레지스트리에서 직접 읽어야 한다. `clients`와 `desk`의 만료도 같이 본다.
- **키 단위 권한은 이름 단위가 아니다.** 그 resolver 인스턴스가 서빙하는 모든 이름에 적용된다. 에이전트는 모든 MM의 `desk.spread`를 쓸 수 있다. 이건 의도된 설계다.
- **이름이 만료돼도 resolver 권한은 남는다.** 권한은 이름이 아니라 주소에 붙는다. 회수는 `revokeRoles`로만 된다.
- **`ROLE_LINK`와 `ROLE_UPGRADE`는 누구에게도 주지 마라.** 레코드 전체를 갈아치울 수 있어서 키 단위 위임이 무의미해진다.
- **resolver 주소를 하드코딩하지 마라.** 이름마다 동적으로 조회한다. 라우터도 이 주소가 트레저리 resolver인지 확인한다.
- **역할 상수를 저장소 main에서 복사하지 마라.** 배포본과 다르다고 알려져 있다.

---

## 10. 끝났다는 기준

ENS 파트 P0는 아래 네 개를 스크립트로 보여줄 수 있으면 끝이다.

1. 이름이 resolve되고 소유자가 트레저리다
2. `desk.terms`와 `desk.spread`가 정확히 디코딩된다
3. 이름·`clients`·`desk` 세 단계 만료 시각을 읽는다
4. 에이전트가 `desk.spread`는 쓰고 `desk.terms`는 못 쓴다 (revert 트랜잭션 확보)

이후는 라우터 담당과 붙이는 작업이다.

---

## 참고 문서

- `idea1/해커톤_런북.md` — 전체 실행 순서, 체크포인트, 데모 시드값
- `idea1/ENS_파트_설계.md` — ENS 파트 설계 근거와 결정 기록
- `notion/아키텍처 지갑 안의 OTC 데스크` — 제품 전체 구조 (기준 문서)
- ENSv2 문서: https://docs.ens.domains/ensv2/overview/ , `/permissioned-resolver/` , `/permissioned-registry/` , `/eth-registrar/`
- 배포 주소: https://docs.ens.domains/learn/deployments
