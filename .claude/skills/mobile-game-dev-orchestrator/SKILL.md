---
name: mobile-game-dev-orchestrator
description: "모바일 최적화 웹 게임(Phaser 3 + TypeScript) 개발 에이전트 팀을 조율하는 오케스트레이터. 게임 신규 제작, 기능/레벨/메커닉 추가, 게임플레이 버그 수정, 모바일 성능 최적화, QA/검증 요청 시 사용. 후속 작업: 이전 기능 수정·업데이트·보완, 부분 재실행, 밸런스 조정, '다시 만들어줘', '최적화 다시 해줘', 이전 결과 개선 요청 시에도 반드시 이 스킬을 사용."
---

# Mobile Game Dev Orchestrator

모바일 웹 게임(Phaser 3 + TypeScript + Vite) 개발을 위한 4인 에이전트 팀을 조율하여, 설계부터 구현·최적화·QA까지 하나의 요청 단위로 처리하는 통합 스킬.

## 실행 모드: 에이전트 팀

설계↔구현↔검증 사이의 실시간 피드백 루프가 품질을 좌우하는 작업이므로 에이전트 팀을 기본으로 사용한다.

## 에이전트 구성

| 팀원 | 에이전트 타입 | 역할 | 스킬 | 출력 |
|------|-------------|------|------|------|
| architect | `game-architect` (커스텀) | 설계, 씬 그래프, 데이터 스키마, 스캐폴딩 | `game-architecture` | `_workspace/{n}_architect_design.md` + 스캐폴딩 파일 |
| dev | `phaser-engine-dev` (커스텀) | 실제 게임 코드 구현 | `phaser-mobile-dev` | `src/` 소스 코드 + `_workspace/{n}_engine_dev_summary.md` |
| optimizer | `mobile-optimizer` (커스텀) | 성능/PWA/반응형 최적화 | `mobile-game-optimization` | 최적화 패치 + `_workspace/{n}_optimizer_report.md` |
| qa | `qa-tester` (커스텀, `general-purpose` 기반) | 경계면 정합성 + 크로스 디바이스 검증 | `game-qa-verification` | `_workspace/{n}_qa_report.md` |

## 워크플로우

### Phase 0: 컨텍스트 확인 (후속 작업 지원)

1. 프로젝트 루트에 `package.json` 존재 여부 확인 → 없으면 **신규 스캐폴딩 필요**로 판단
2. `_workspace/` 디렉토리 존재 여부 확인:
   - **미존재** → 초기 실행. Phase 1로 진행
   - **존재 + 사용자가 특정 기능/버그의 부분 수정 요청** → 부분 재실행. 관련 팀원만 재소집하고, 해당 산출물만 갱신
   - **존재 + 새 기능/레벨 요청** → 새 실행 사이클. 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동한 뒤 새 `_workspace/` 생성
3. 부분 재실행 시, 이전 설계 문서(`_workspace_prev 또는 이동된 디렉토리/*_architect_design.md`)와 관련 QA 리포트를 관련 팀원 프롬프트에 경로로 포함해, 팀원이 기존 결정을 읽고 그 위에서 작업하도록 지시한다.

### Phase 1: 요청 분석 및 준비

1. 사용자 요청을 분석해 유형을 분류: (a) 신규 게임 제작 (b) 기능/레벨 추가 (c) 버그 수정 (d) 성능 최적화 (e) QA/검증만
2. 유형에 따라 이번 사이클에 실제로 필요한 팀원을 결정한다 (예: "이 버튼 안 눌려요" 버그 수정은 dev + qa만으로 충분할 수 있음). 단, 팀은 4명 전원으로 구성하고, 불필요한 팀원에게는 대기 또는 경량 작업(예: 기존 설계 검토)을 할당한다 — 세션 중 팀원 추가는 불가능하므로 처음부터 전원 소집한다.
3. `_workspace/00_input.md`에 요청 원문과 분류 결과를 저장

### Phase 2: 팀 구성

```
TeamCreate(
  team_name: "mobile-game-team",
  members: [
    { name: "architect", agent_type: "game-architect", model: "opus",
      prompt: "요청: {사용자 요청 원문}. game-architecture 스킬을 사용해 설계 문서를 _workspace/01_architect_design.md에 작성하라. 신규 프로젝트면 스캐폴딩까지 수행하라." },
    { name: "dev", agent_type: "phaser-engine-dev", model: "opus",
      prompt: "architect의 설계(_workspace/01_architect_design.md)를 기다렸다가 phaser-mobile-dev 스킬로 구현하라. 모듈 완성 즉시 qa에게 SendMessage로 검증을 요청하라." },
    { name: "optimizer", agent_type: "mobile-optimizer", model: "opus",
      prompt: "dev의 구현이 진행되는 대로 mobile-game-optimization 스킬로 성능/반응형/PWA 점검을 수행하고 _workspace/03_optimizer_report.md에 기록하라." },
    { name: "qa", agent_type: "qa-tester", model: "opus",
      prompt: "game-qa-verification 스킬로 경계면 정합성과 크로스 디바이스 동작을 검증하라. dev로부터 모듈 완성 알림을 받으면 즉시 해당 범위를 검증하고, 발견 즉시 담당자에게 SendMessage하라. 최종 결과는 _workspace/04_qa_report.md에 기록." },
  ]
)
```

### Phase 3: 작업 등록

```
TaskCreate(tasks: [
  { title: "설계: {요청 요약}", description: "씬 그래프/데이터 스키마 설계 (+ 신규 시 스캐폴딩)", assignee: "architect" },
  { title: "구현: {기능1}", description: "...", assignee: "dev", depends_on: ["설계: {요청 요약}"] },
  { title: "구현: {기능2}", description: "...", assignee: "dev", depends_on: ["설계: {요청 요약}"] },
  { title: "최적화 점검", description: "성능/반응형/PWA 점검", assignee: "optimizer", depends_on: ["구현: {기능1}"] },
  { title: "QA: {기능1} 검증", description: "경계면 정합성 검증", assignee: "qa", depends_on: ["구현: {기능1}"] },
  { title: "QA: {기능2} 검증", description: "경계면 정합성 검증", assignee: "qa", depends_on: ["구현: {기능2}"] },
])
```
> 기능 단위로 구현 task를 쪼개고, 각 구현 task에 대응하는 QA task를 반드시 짝지어 등록한다 (incremental QA — 전체 완성 후 한 번에 검증하지 않는다).

### Phase 4: 협업 실행

**실행 방식:** 팀원들이 공유 작업 목록에서 자체적으로 작업을 요청(claim)하고 수행한다.

**팀원 간 통신 규칙:**
- architect → dev: 설계 완료 시 SendMessage로 설계 문서 경로와 핵심 결정 요약 전달
- dev → qa: 기능/씬 완성 즉시 SendMessage로 검증 요청 (전체 완성까지 기다리지 않음)
- qa → dev/architect: 결함 발견 즉시 파일:라인 + 재현 조건과 함께 SendMessage. 경계면 이슈는 관련된 양쪽 모두에게 통지
- optimizer → dev/architect: 구조 변경이 필요한 최적화는 근거 수치와 함께 SendMessage로 협의 요청

**리더(오케스트레이터) 모니터링:**
- 팀원이 유휴 상태가 되면 자동 알림 수신 → 다음 작업 배정 확인
- 특정 팀원이 막히면 SendMessage로 상태 확인 후 지시 또는 재할당
- `TaskGet`으로 전체 진행률 확인

### Phase 5: 통합 검증 및 보고

1. 모든 task 완료 대기 (`TaskGet`)
2. `npm run build`를 실행해 최종 빌드 확인 (실패 시 dev에게 재할당)
3. 가능하면 `npm run dev`로 개발 서버를 띄워 실제 동작 확인 (브라우저 자동화 도구 사용 가능하면 활용)
4. `_workspace/`의 모든 리포트(설계/구현 요약/최적화/QA)를 Read로 수집해 사용자에게 보고할 요약 작성:
   - 이번 사이클에서 구현된 것
   - QA에서 발견되어 수정된 결함 / 미해결 항목
   - 최적화 결과 수치
   - 다음에 필요한 후속 작업 제안

### Phase 6: 정리

1. 팀원들에게 종료 SendMessage
2. `TeamDelete`로 팀 정리
3. `_workspace/`는 보존 (다음 사이클의 컨텍스트 확인에 사용)
4. 사용자에게 결과 요약 보고 및 다음 단계 확인

## 데이터 흐름

```
[오케스트레이터] → TeamCreate → [architect] ─SendMessage→ [dev] ─SendMessage→ [qa]
                                     │                        │                  │
                                     ↓                        ↓                  ↓
                          01_architect_design.md      src/*.ts (실제 코드)  04_qa_report.md
                                     │                        │                  │
                                     │                        ↓                  │
                                     │                  [optimizer] ← 성능 이슈 시 dev/architect에게 SendMessage
                                     │                        │
                                     │                        ↓
                                     │              03_optimizer_report.md
                                     └──────────── Read ───────┴────── Read ─────┘
                                                        ↓
                                          [오케스트레이터: 빌드 확인 + 통합 보고]
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 팀원 1명 실패/중지 | 리더가 유휴 알림 감지 → SendMessage로 상태 확인 → 재시작 시도 |
| dev 구현 중 설계 밖 상황 발견 | dev는 임의 판단하지 않고 architect에게 SendMessage로 확인 후 진행 |
| qa가 동일 결함을 2회 이상 재보고 | 표면 수정이 아닌 근본 원인(설계 문제 가능성)으로 판단, architect 개입 |
| `npm run build` 실패 | dev에게 에러 로그 그대로 전달, 추측성 수정 금지, 원인 확인 후 수정 |
| 팀원 간 데이터/의견 충돌 (예: optimizer vs architect) | 임의 결정하지 않고 트레이드오프를 사용자에게 보고 후 결정 위임 |
| 타임아웃/응답 없음 | 현재까지 수집된 부분 결과로 Phase 5 진행, 미완료 항목을 보고서에 명시 |

## 팀 크기

4명 (architect, dev, optimizer, qa) — 소~중규모 기능 단위 작업(사이클당 5~10개 task)에 적정. 게임 전체를 한 번에 만드는 대형 요청이 오면, 오케스트레이터가 Phase 1에서 요청을 여러 사이클(예: 코어 루프 → 레벨 시스템 → UI/사운드)로 쪼개 순차적으로 이 워크플로우를 반복 실행한다.

## 테스트 시나리오

### 정상 흐름 — 신규 게임 제작
1. 사용자: "간단한 3매치 퍼즐 모바일 게임을 만들어줘"
2. Phase 0: `package.json` 없음 → 신규 스캐폴딩 필요로 판단
3. Phase 2~3: 팀 구성 + "스캐폴딩+코어 루프 설계", "그리드/매치 로직 구현", "최적화 점검", "QA 검증" task 등록
4. Phase 4: architect가 스캐폴딩 및 설계 → dev가 구현하며 완성 모듈마다 qa에게 검증 요청 → optimizer가 병행 점검
5. Phase 5: 빌드 확인 후 통합 보고
6. 예상 결과: 동작하는 Phaser 프로젝트 + `_workspace/`에 설계/구현/최적화/QA 문서

### 에러 흐름 — 구현 중 QA 결함 반복 발견
1. Phase 4에서 qa가 "매치 판정 시 특정 좌표에서 크래시"를 2회 연속 보고
2. dev가 표면적으로 수정했으나 재발 → qa가 근본 원인 의심을 architect에게도 SendMessage
3. architect가 그리드 좌표 시스템 설계 결함을 확인하고 설계 문서 갱신
4. dev가 갱신된 설계에 맞춰 재구현, qa가 재검증
5. 최종 보고서에 "그리드 좌표 시스템 설계 변경" 이력 명시
