# 요청 원문 및 분류

## 사용자 요청
"Hue Sort" 게임의 레벨을 손본다. 기존 3개 레벨(전부 tubeCapacity=4, 레벨2·3은 색이 2개씩 짝지어진 단조로운 배치)을 확장한다.
사용자가 선택한 방향: **레벨 수를 늘리고 쉬움→어려움으로 이어지는 난이도 곡선 설계**. 1칸 단위로 색이 섞인 더 다양한 배치를 사용해 단조로움 개선.

## 분류
(b) 기능/레벨 추가 — 레벨 데이터/난이도 설계 (+ 필요 시 레벨 생성 로직)

## 명시적 범위 제외
- `src/systems/SortLogic.ts`의 이동 규칙(canPour/pour/isSolved)은 변경하지 않는다 — 이미 정확히 구현되어 있음을 사용자와 확인 완료.
- `src/objects/Tube.ts` 렌더링, 씬 구조(Boot/Menu/Game/UI)는 이번 사이클 범위 밖.

## 이전 사이클 참고
`_workspace_20260913_120612/01_architect_design.md`, `02_engine_dev_summary.md` — 프로토타입 설계/구현 요약 (레벨 3개, capacity=4 고정, solvability 수작업 검증).

## 이번 사이클 팀 구성 판단
TeamCreate 도구 미사용 가능 환경([[env-team-tool-unavailable]] 참고, 이번 세션도 ToolSearch로 재확인함 → 여전히 없음). Agent 도구로 순차/필요 시 병렬 위임.
- architect: 난이도 곡선 설계 + 레벨 데이터 스펙(수작업 또는 생성 로직 여부 결정) — 필요
- dev: 레벨 데이터/생성 로직을 실제 코드(`src/data/levels.ts` 등)로 구현 — 필요
- qa: 각 레벨 solvability, 빌드, 기존 메뉴/클리어 기록과의 정합성 검증 — 필요
- optimizer: 씬/렌더링/성능 변경 없음 — 이번 사이클은 대기 (경량: 레벨 수 증가로 인한 튜브 개수/화면 배치 이슈만 간단히 검토 요청)
