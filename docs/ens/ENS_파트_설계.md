> **상태: 현재.** 구현은 `ens` 브랜치의 `ens/`에 있고 Sepolia에 배포됐다. 인터페이스의 기준은 `docs/code/desk-system.md` §6이며, 이 문서와 다르면 그쪽이 이긴다.

# ENS 파트 설계 — 지갑 안의 OTC 데스크

2026-09-25

## 개요

이 문서는 **지갑 안의 OTC 데스크**에서 ENS 파트가 무엇을 세팅하고, 라우터가 체결할 때 무엇을 읽을지를 정한다. 제품 정의와 전체 구조는 팀 문서(`notion/국문판`, `notion/아키텍처`)가 기준이고, 이 문서는 그 3장(ENS 이름과 권한)을 실행 가능한 수준으로 푸는 것이다. 충돌하면 팀 문서가 이긴다.

한 줄로: 트레저리가 메이커로 상시 양방향 호가를 내고, **누가 어떤 조건으로 체결할 수 있는지를 ENS 이름과 레코드가 정한다.** 체결할 때마다 라우터가 ENS를 읽으므로, ENS는 표시용이 아니라 체결 경로의 일부다.

- **담당 범위:** 이름·서브레지스트리·레코드·권한 세팅과 조회 라이브러리. 라우터 명령어는 Aqua 담당, 화면은 web app 담당이 맡는다.
- **체인:** Sepolia 한 곳. ENSv2가 Sepolia에만 있고, Aqua 공식 레지스트리 `0x1111113ccf1426a8e30e2bff5e005d929bf6a90a`도 Sepolia에 있다(확인: `eth_getCode`, 메인넷과 바이트코드 동일).
- **이 문서가 정하지 않는 것:** 호가 수식, 라우터 명령어 구현, 에이전트의 점수 계산. 아키텍처 문서 2·4장에 있다.

## 이름과 소유 구조

| 이름 | 역할 | 소유 |
| --- | --- | --- |
| `desk.eth` | 데스크 자체의 이름. 배포 정보 text 레코드를 단다 | 트레저리(Safe) |
| `clients.desk.eth` | MM 명단을 담는 서브레지스트리 | 트레저리 |
| `mm-a.clients.desk.eth` | MM 한 곳 = 이름 하나. **이름의 만료가 거래 권한의 만료**다 | 트레저리 |
| `agents.desk.eth`, `risk.agents.desk.eth` | 리스크 에이전트 신원. 누가 스프레드를 바꿨는지를 이름으로 추적 | 트레저리 |

이름을 전부 트레저리가 소유하는 이유는 두 가지다. 첫째, ENSv2는 계정마다 Permissioned Resolver 인스턴스가 하나이므로 한 소유자로 모으면 명단 전체의 조건과 권한이 resolver 하나에 모인다. 둘째, MM이 자기 이름을 소유하면 resolver를 자기 것으로 바꿔 자기 한도를 직접 쓸 수 있다.

대외적으로는 이름을 "MM의 소유물"이 아니라 **만료되는 거래 권한 증서**로 부른다. 그러면 트레저리 소유여도 서사가 어색해지지 않는다. 소유 방향은 팀 결정 대기 항목이며, 절충안은 MM에게 이름을 주되 권한 없이(roleBitmap 0) 발급하는 것이다.

## 레코드 스펙

레코드는 모두 트레저리 resolver 하나에 있다. 라우터가 읽는 값은 text가 아니라 **data 레코드**로 둔다. 온체인에서 JSON 문자열을 해석하는 비용과 오류를 피하기 위해서다.

| 키 | 종류 | 인코딩 | 쓰는 쪽 | 읽는 쪽 | 없을 때 |
| --- | --- | --- | --- | --- | --- |
| `addr` | address | 20바이트 | 멀티시그 | 라우터 (게이트) | 게이트 실패 |
| `desk.terms` | data | `abi.encode(uint8 version, uint16 tierBps, uint128 capPerFill)` (96바이트, cap은 USDC 6자리) | 멀티시그 | 라우터 (조건) | 기본 레코드로 대체 → cap 0 → 체결 불가 |
| `desk.spread` | data | `abi.encode(uint8 version, uint16 spreadBps, uint64 validUntil)` (96바이트) | 리스크 에이전트 | 라우터 (조건) | 등급 기본 스프레드로 폴백 |
| `desk.stats` | text | JSON: 체결 수, 평균 markout | 리스크 에이전트 | 웹 앱, 심사자 | 표시 안 함 |
| `desk.deployment` (on `desk.eth`) | text | JSON: 라우터, Aqua 주소, strategyHash | 멀티시그 | 웹 앱 | "Aqua에서 확인됨" 표시 불가 |

- **기본 레코드의 `capPerFill`은 0으로 둔다.** 자기 레코드가 없는 이름은 루트의 기본 레코드를 대신 쓰므로, 이렇게 해야 레코드를 채우기 전의 이름으로는 체결되지 않는다.
- 두 data 레코드 모두 첫 필드가 `version`이다. 라우터는 모르는 버전이면 조용히 넘기지 말고 실패한다.
- `desk.terms`와 `desk.spread`를 한 레코드로 합치지 않는다. 쓰는 주체가 달라서 키 단위 권한 위임이 성립하지 않게 된다.

## 권한 설계

| 계정 | 권한 | 부여 | 회수 |
| --- | --- | --- | --- |
| 멀티시그 | resolver 루트 권한 전부, `ROLE_LINK`, `ROLE_UPGRADE`, 각 권한의 admin | resolver 배포 시 `initialize` | — |
| 리스크 에이전트 | `ROLE_SET_DATA` @ `desk.spread`, `ROLE_SET_TEXT` @ `desk.stats` | `grantSetterRoles` | `revokeRoles` |
| MM | 없음. 자기 조건을 바꿀 수 없다 | — | 이름 만료 |

주의할 점 세 가지다.

1. **이름별 범위가 없다.** 키 단위 권한은 그 resolver 인스턴스가 서빙하는 모든 이름에 적용된다. 에이전트는 MM 하나가 아니라 명단 전체의 `desk.spread`를 쓸 수 있다. 에이전트 하나가 전체 리스크를 맡는 설계라 의도된 것이고, 발표에서 먼저 밝힌다.
2. **`ROLE_LINK`와 `ROLE_UPGRADE`는 멀티시그 외에 주지 않는다.** 레코드 전체를 갈아치울 수 있는 권한이라 키 단위 위임의 의미가 없어진다.
3. **에이전트 이름이 만료돼도 resolver 권한은 남는다.** 권한은 이름이 아니라 주소에 붙기 때문이다. 회수는 반드시 `revokeRoles`로 한다.

## 라우터가 읽는 경로

MM은 swap을 호출하면서 `takerData`에 자기 이름(DNS 인코딩)을 넣는다. taker는 라우터가 기록하는 호출자(`msg.sender`)다. 이름을 주소에서 거꾸로 찾지 않는 이유는 온체인 역방향 조회가 비싸고 결과가 보장되지 않기 때문이다. 대신 받은 이름이 정말 호출자의 것인지를 게이트에서 확인한다.

### 게이트(#34)가 확인하는 네 가지

1. **MM 이름의 만료** — `clients.desk.eth` 서브레지스트리에서 만료 시각을 직접 읽는다. 이름 해석이 실패하기를 기대하지 않는다. 만료된 이름도 Universal Resolver로는 상위 resolver를 통해 해석될 수 있다.
2. **상위 이름의 만료** — 서브레지스트리는 부모의 만료를 모르므로 `clients`와 `desk`의 만료도 본다.
3. **resolver 동일성** — 그 이름의 resolver가 트레저리 resolver인지 확인한다.
4. **`addr` == taker** — resolver에서 읽은 `addr`이 실행 문맥의 taker 주소와 같은지 확인한다.

### 조건 읽기(#35 앞부분)

Permissioned Resolver는 개별 getter가 아니라 `resolve(name, data)`로 돌려준다(Sepolia 배포본 기준). 여러 레코드는 multicall 프로필 하나로 묶어 호출 횟수를 줄인다.

- `desk.terms` → 등급(`tierBps`)과 체결당 한도(`capPerFill`)
- `desk.spread` → 에이전트가 기록한 스프레드와 유효기간. 비었거나 `validUntil`이 지났으면 등급 기본 스프레드로 돌아간다. 이 폴백 판단은 라우터가 한다.
- 최종 스프레드는 `ship()` 할 때 전략에 넣은 [최소, 최대] 범위로 clamp한다.

### 체결이 막히는 지점

| 지점 | 조건 | 뜻 | 데모 |
| --- | --- | --- | --- |
| 게이트 | 이름 없음 또는 인코딩 불일치 | 명단 밖 | 1번 |
| 게이트 | 이름 또는 상위 이름 만료 | 거래 권한 종료 | 3번 |
| 게이트 | resolver 불일치 | 이름 탈취 방어 | — |
| 게이트 | `addr` ≠ taker | 이름 도용 방어 | — |
| 조건 | 수량 > `capPerFill` (레코드 없으면 기본값 0) | 이름별 한도 | — |
| 가격 | 오라클 갱신이 1시간 초과 | 낡은 가격 차단 | — |
| 정산 | 지갑 잔액·allowance 부족 | Aqua `pull` 실패 | — |

이 표가 라우터 담당과의 계약서다. 항목이 바뀌면 양쪽 코드가 같이 바뀐다.

## 세팅 순서와 완료 기준

해커톤 첫 시간에 이 순서로 돌린다. 라우터가 없어도 여기까지는 단독으로 가능하다.

1. ENSv2 Sepolia 주소를 고정한다. 09-25 조회 값은 ETHRegistry `0x657ea849311d3d5823348dded7c2aaafb3ede09e`, RootRegistry `0x9703dbd26dab89504490994138cf2c575251a9ce`, ETHRegistrar `0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca`, UniversalResolverV2 `0x5d25c1d6acbb71b7a28aa7899618a3412a8303e3`, PublicResolverV2 `0xd7e590ad0e92a6ac1d81f4483a9b951d3585a50f`, MockUSDC `0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e`(6 decimals)이다.
2. `desk.eth`를 등록한다. 09-25 조회 기준 **사용 가능**하고, `getRegisterPrice(string,uint64,address)`로 28일 12.27 MockUSDC, 1년 160.00 MockUSDC다. commit 후 60초 대기가 있으니 가장 먼저 걸어두고 다른 일을 한다. 대체 후보도 모두 비어 있다: otcdesk, quotedesk, aquadesk, deskdao, treasurydesk, walletdesk.
3. 트레저리 resolver를 배포하고 `initialize`로 멀티시그에 루트 권한을 준다.
4. `clients.desk.eth` 서브레지스트리를 만든다.
5. 기본 레코드를 `capPerFill = 0`으로 넣는다.
6. MM 이름 두 개를 발급하고 `addr`과 `desk.terms`를 쓴다. 등급을 다르게 주어 데모 1번에서 가격이 갈리게 한다.
7. 만료 데모용 이름을 하나 더 발급하되 만료를 짧게 준다(데모 3번).
8. `agents.desk.eth`와 `risk.agents.desk.eth`를 발급하고 `addr`을 넣는다.
9. `grantSetterRoles`로 에이전트에 두 권한만 준다.

**완료 기준:** 스크립트가 (a) 이름 해석, (b) 두 data 레코드 디코딩, (c) 세 단계 만료 시각 읽기, (d) 에이전트가 `desk.terms`를 쓰려다 revert되는 것까지 보여주면 ENS 파트의 P0는 끝난다.

## 제공할 함수

TypeScript, viem 기반. 다른 파트가 이것만 보고 쓸 수 있게 만든다.

| 함수 | 입력 → 출력 | 쓰는 쪽 |
| --- | --- | --- |
| `setupDesk()` | 이름·서브레지스트리·resolver·기본 레코드 일괄 세팅 | 배포 스크립트 |
| `addClient(label, addr, tierBps, capPerFill, expiry)` | MM 이름 발급 + 레코드 기록 | 멀티시그 스크립트, 데모 준비 |
| `setSpread(name, spreadBps, validUntil)` | 에이전트 키로 `desk.spread` 기록 | 리스크 에이전트 |
| `readClient(name)` | → `{addr, tierBps, capPerFill, spreadBps, validUntil, expiry, resolverOk}` | 웹 앱 |
| `encodeTakerName(name)` | → DNS 인코딩 바이트 | MM 봇, 라우터 테스트 |

`encodeTakerName`과 `readClient`의 디코딩은 **라우터 구현과 바이트 단위로 같아야** 한다. 첫 시간에 이 두 개를 먼저 맞추고 시작한다.

## 설계상 주의할 점

- **최소 스프레드를 오라클 편차 허용치에 묶는다.** 피드는 실시간이 아니라 일정 비율 이상 움직이거나 하트비트가 지나야 갱신된다. 스프레드가 그 허용치보다 좁으면 피드가 정상인 동안에도 MM이 유리한 쪽만 골라 체결할 수 있다. 메인넷 ETH/USD 피드를 직접 조회해 보니 최근 10라운드가 가격 0.35~0.69% 변동 또는 최대 3,624초(60.4분) 간격으로 갱신됐다. 피드가 정상인 채로 시장가와 0.5%까지 벌어질 수 있고, 이는 10bps 스프레드의 5배다. 전략의 [최소, 최대]에서 최소값을 그 편차 폭 이상으로 둔다.
- **오라클 staleness 허용치는 분 단위로.** 아키텍처 문서의 1시간은 10bps 호가에 비해 느슨하다. 갱신 후 경과 시간에 비례해 스프레드를 넓히는 항이 더 좋다.
- **레코드 형식은 팀 설계 `desk-system.md` §6.2를 따른다.** 비대칭(ask/bid) 안은 2026-09-25에 철회했다. 방향성은 재고 스큐(w*·κ)가 이미 가격에 넣고 있고, w < w*일 때는 고정 비대칭이 리밸런싱과 부딪힌다.
- **폴백 스프레드는 넓은 쪽이어야 한다.** `validUntil`이 지나면 등급 기본값으로 돌아가는데, 기본값이 에이전트가 넓혀둔 값보다 좁으면 **에이전트를 멈추게 만드는 것이 공격자에게 이득**이 된다. 등급 기본값을 보수적으로 잡는다.
- **`capPerFill`은 쪼개기로 우회된다.** 이름당 누적 한도는 라우터가 상태를 써야 해서 이번 범위 밖이다. 심사 답변을 준비한다 — 쪼개면 재고가 목표에 가까워지며 호가가 계속 불리해진다.
- **가스 폴백을 미리 정해둔다.** 체결당 ENS 읽기가 예산을 넘으면 `desk.terms`를 전략 바이트로 옮기고 ENS에서는 게이트와 `desk.spread`만 읽는다. 위임이 스프레드에 걸려 있으므로 ENS 논거는 유지된다.
- **만료와 권한은 다르다.** 이름이 만료되면 체결은 막히지만 resolver 권한은 그대로다. 에이전트 교체는 `revokeRoles`가 필요하다.
- **자금의 주인은 여전히 주소다.** 이름은 거래 권한이지 소유권이 아니고, 토큰은 체결 순간까지 멀티시그에 있다.

## 확정된 결정과 남은 확인

다섯 개는 확정했다(09-25). 1·2번은 아키텍처 문서 7장 항목이라 시작 전에 구두로 한 번 확인받는다.

| 결정 | 내용 |
| --- | --- |
| 이름 소유 | 트레저리가 전부 소유. 대외적으로는 "만료되는 거래 권한 증서" |
| 레코드의 지위 | 라우터가 읽어 체결과 가격을 정한다. 게이트 네 확인 + clamp가 전제 |
| 레코드 형식 | 팀 설계 §6.2: `tierBps`/`spreadBps`, 96바이트, `capPerFill`은 USDC 6자리 (비대칭안 철회) |
| 오라클 | 최소 스프레드 하한을 편차 밴드 이상(실측 약 50bps), staleness는 분 단위 |
| 사전 코드 | 쓰지 않는다. 온체인 읽기 조회만 |

남은 확인 항목은 세 개다.

- [ ] 1inch 트랙이 Sepolia 제출을 인정하는가 (부스, 최우선)
- [ ] 체결당 ENS 읽기 가스 (T+8에 측정, 넘으면 `desk.terms`를 전략 바이트로)
- [ ] 최종 이름 — `desk.eth` 비어 있고 대체 후보도 전부 가능

실행 순서와 인터페이스 계약은 `해커톤_런북.md`에 있다.

## 참고 자료

- 팀 문서: `notion/국문판 지갑 안의 OTC 데스크`, `notion/아키텍처 지갑 안의 OTC 데스크` (기준 문서)
- [ENSv2 개요](https://docs.ens.domains/ensv2/overview/) · [Permissioned Resolver](https://docs.ens.domains/ensv2/permissioned-resolver/) · [Permissioned Registry](https://docs.ens.domains/ensv2/permissioned-registry/) · [앱 개발자 튜토리얼](https://docs.ens.domains/ensv2/tutorial-app-developers/)
- [Aqua 개요](https://business.1inch.com/portal/documentation/aqua/overview) · [전략 라이프사이클](https://business.1inch.com/portal/documentation/aqua/liquidity-layer/strategy-lifecycle) · [접근 조건](https://business.1inch.com/portal/documentation/aqua/liquidity-layer/access-resolvers-and-pathfinder)
- [ETHGlobal Tokyo 2026 상금](https://ethglobal.com/events/tokyo2026/prizes) — ENS 트랙은 Sepolia 구현·라이브 데모 링크·오픈소스가 조건
