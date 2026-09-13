# 설계 문서 — Hue Sort 레벨 확장 (난이도 곡선)

## 1. 작업 범위 요약
기존 레벨 3개(전부 `tubeCapacity=4`, 레벨2·3은 색 2개씩 짝지어진 단조로운 배치)를 폐기하고, **레벨 10개 + 쉬움→어려움 난이도 곡선**으로 교체한다. 초기 배치는 1칸 단위로 섞은 뒤 **solvability를 실제로 검증한** 데이터를 사용한다.

범위 밖(변경하지 않음): `src/systems/SortLogic.ts`의 이동/클리어 규칙, `src/objects/Tube.ts` 렌더링 방식, 씬 구조(`GameScene.buildTubes()`의 배치 상수 `TUBES_PER_ROW=4`, `COL_GAP=150`, `ROW_GAP=380`, `startY=420`, `Tube.SLOT_HEIGHT=70`, `TUBE_WIDTH=90`).

## 2. 화면 배치 제약 분석 (레벨 규모의 상한을 결정하는 근거)

`GameScene.buildTubes()`와 `Tube.ts`의 기존 상수를 바탕으로 캔버스 720×1280(FIT 스케일) 기준 레이아웃을 계산했다.

- **튜브 개수**: `TUBES_PER_ROW=4`가 고정이므로 행 수는 `ceil(총튜브수/4)`. `UIScene`의 Undo/Shuffle 버튼이 `y = height-90`(≈1190, 높이 70 → 1155~1225 차지)에 있고, 행 간격 `ROW_GAP=380` · 시작 `startY=420` 기준으로 **3번째 행(인덱스 2)의 바닥 y=1180**이 되어 버튼 영역과 겹친다. → **행은 최대 2개, 즉 레벨당 튜브는 최대 8개**로 제한해야 한다.
- **튜브 용량(capacity)**: 튜브 높이 `H ≈ SLOT_HEIGHT*capacity + WALL_THICKNESS = 70*capacity+6`. 2행 레이아웃에서 1행 바닥(420)과 2행 상단(800-H) 사이 여백이 확보되려면 `800-H > 420+여유` → `capacity ≤ 5`(capacity=5일 때 H=356, 여백 24px). 상단 HUD(좌상단 이동 횟수 텍스트, 우상단 메뉴 버튼, y≈12~68)와의 충돌을 보면 1행 상단 `420-H`가 capacity=5일 때 64로, 메뉴 버튼 하단(68)과 **약 4px 겹침 여지**가 있다. capacity=4(H=286, 상단=134)는 여유가 충분하다.
  - **결론**: `tubeCapacity`는 4를 기본으로 하고, 5는 가장 어려운 레벨 1~2개에 한해서만 사용한다. 이 경우 상단 여백이 타이트(약 4~6px)하므로 dev/QA는 실기기에서 메뉴 버튼과 튜브 상단 히트 영역이 실제로 겹치는지 반드시 확인해야 한다(겹친다면 레이아웃 상수 조정이 필요하며, 이는 이번 범위 밖이므로 architect에게 트레이드오프로 보고할 것).
- **행별 가로 배치**는 튜브 개수와 무관하게 `COL_GAP=150`, `TUBE_WIDTH=90`로 항상 안전하다(최대 4개 행 폭 450 < 캔버스 폭 720).

**레벨 규모 상한 (이번 설계가 지키는 값)**
| 항목 | 상한 | 비고 |
|---|---|---|
| 총 튜브 수 | 8 | 2행 × 4열 |
| tubeCapacity | 5 | 4가 기본, 5는 최상위 1~2레벨만 |
| 색상 종류 수 | 6 | `COLOR_MAP`에 정의된 8색 중 순서대로 사용(red→pink) |

## 3. 난이도 곡선 설계

축 4개를 조합해 난이도를 올린다: **색상 종류 수(C)**, **튜브 용량(K)**, **빈 튜브 수(E, 적을수록 어려움)**, **1칸 단위 완전 셔플(고정)**. 총 튜브 수는 `C+E`.

| id | 이름 | C(색) | K(capacity) | E(빈튜브) | 총튜브 | difficulty | 참고: solver 최단 이동수 |
|---|---|---|---|---|---|---|---|
| level-1 | 튜토리얼 | 2 | 4 | 2 | 4 | 1 | 6 |
| level-2 | 레벨 2 | 3 | 4 | 2 | 5 | 1 | 7 |
| level-3 | 레벨 3 | 3 | 4 | 1 | 4 | 2 | 7 |
| level-4 | 레벨 4 | 4 | 4 | 2 | 6 | 2 | 10 |
| level-5 | 레벨 5 | 4 | 4 | 1 | 5 | 3 | 12 |
| level-6 | 레벨 6 | 5 | 4 | 2 | 7 | 3 | 11 |
| level-7 | 레벨 7 | 5 | 4 | 1 | 6 | 4 | 16 |
| level-8 | 레벨 8 | 5 | 5 | 2 | 7 | 4 | 18 |
| level-9 | 레벨 9 | 6 | 4 | 2 | 8 | 4 | 18 |
| level-10 | 레벨 10 | 6 | 5 | 1 | 7 | 5 | 24 |

- `difficulty`는 1(가장 쉬움)~5(가장 어려움) 정수 별점. `(C, K, E)` 파라미터 조합의 상대적 난이도로 부여했다(빈 튜브가 적을수록, 색상이 많을수록, capacity가 클수록 어려움 가중).
- solver 최단 이동수는 대체로 우상향(6→7→7→10→12→11→16→18→18→24)하지만 완전한 단조증가는 아니다(레벨2·3 동률, 레벨6이 레벨5보다 1적음). 이는 시드에 따른 자연스러운 노이즈이며 실제 물 정렬 퍼즐 게임에서도 흔한 편차다. **난이도 곡선의 근거는 파라미터(C/K/E) 자체이지 이동수 하나가 아니므로 무시해도 된다.** 더 매끈한 곡선이 필요하면 4장의 생성 스펙으로 시드를 바꿔 재생성하면 된다.
- 레벨 수(10개)는 "쉬움→어려움" 곡선을 체감 가능한 단계로 보여주기 충분한 최소 규모로 정했다. 더 필요하면 4장 생성 스펙에 행만 추가하면 된다(레이아웃 상한만 지키면 됨).

## 4. 수작업 vs 자동 생성 — 결정: **오프라인 자동 생성 + solver 검증, 결과는 정적 데이터로 확정**

**결정**: 레벨 배치는 자동 생성 알고리즘으로 만들되, **게임 런타임에는 생성기/solver를 포함하지 않는다.** architect가 지금 오프라인 스크립트로 생성·검증까지 마쳤고, 아래 4장의 결과 배열을 그대로 `src/data/levels.ts`에 붙여넣으면 된다.

**근거**:
1. 사용자가 요구한 "1칸 단위로 섞인 배치"를 수작업으로 여러 레벨 만들면 사람이 보기엔 그럴듯해도 실제 valid-pour 그래프상 풀리는지 보장하기 어렵다(직접 검증하려면 결국 solver가 필요함).
2. 반대로 자동 생성 로직을 게임에 내장하면(런타임에 셔플+solver 실행) 이번 프로젝트 규모(캐주얼 퍼즐, 정적 레벨 10개)에 비해 과설계다 — `과설계 금지` 원칙에 위배.
3. 따라서 "생성은 오프라인에서 한 번, 결과는 정적 배열로 커밋"이 가장 단순하고 안전하다. `LevelDef` 스키마·런타임 코드(`GameScene`, `SortLogic`)는 **전혀 변경되지 않는다** — `src/data/levels.ts`의 배열 내용만 바뀐다.

### 4.1 생성 알고리즘 (실행 완료, 재현 가능)

```
1. 시드 PRNG: mulberry32(seed) — 순수 함수, 외부 라이브러리 불필요.
2. 색상 유닛 풀 생성: PALETTE(고정 순서 ['red','blue','green','yellow','purple','orange'...])에서
   앞에서부터 C개 색상을 선택, 각 색상을 K개씩 담아 C*K개짜리 flat 배열 생성.
3. Fisher-Yates 셔플(같은 PRNG) — 이것이 "1칸 단위로 섞인 배치"의 실체.
   (참고: 기존 SortLogic.shuffle()과 동일한 "셔플 후 앞에서부터 K개씩 잘라 담기" 방식이라
   런타임 Shuffle 버튼이 만드는 배치와 성격이 일관된다.)
4. 셔플된 flat 배열을 앞에서부터 K개씩 잘라 C개의 튜브에 채우고, 빈 튜브 E개를 이어붙인다.
5. solvability 검증: BFS solver로 실제로 풀리는지 확인.
   - 상태 = 튜브 배열. 이동 = SortLogic과 동일한 canPour/pour 규칙.
   - 튜브는 서로 교환 가능하므로 "각 튜브 내용을 문자열화 후 정렬해 이어붙인 키"로 상태를 정규화 —
     대칭 상태를 하나로 합쳐 탐색 폭발을 크게 줄임.
   - 노드 예산(40만) 내에서 solved 상태에 도달하면 solvable, 도달 못하면 실패로 간주.
6. 실패 시(불용 배치이거나 예산 초과) seed를 1 증가시켜 재시도(최대 200회). 성공하면 해당 배열을 확정.
7. 결과: 아래 10개 레벨 전부 1~5회 이내 재시도로 solvable 확정(level-7은 5회, level-10은 3회, 나머지는 1회).
```

이 알고리즘은 재현 가능하다 — 같은 `baseSeed`(레벨 id 문자열의 간단한 해시)로 항상 같은 결과가 나온다. 레벨을 더 추가하고 싶으면 `(C, K, E, baseSeed)` 스펙만 정하고 위 절차를 반복하면 된다. 생성/검증에 사용한 스크립트는 이번 설계 검증용으로만 썼고(스크래치패드, 프로젝트에 커밋 안 함) 게임 코드베이스에는 포함하지 않는다 — 필요하면(레벨을 자주 추가할 계획이라면) `scripts/generate-levels.ts`로 별도 dev-only 유틸리티화하는 것을 다음 사이클에 검토할 수 있다(지금은 요청 범위 밖이라 만들지 않음).

## 5. 데이터 스키마 변경

`LevelDef`에 **`difficulty` 필드를 추가**한다(그 외 필드는 그대로 유지, breaking change 아님).

```ts
// src/data/levels.ts
export interface LevelDef {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5; // 신규: 1=가장 쉬움 ~ 5=가장 어려움. 메뉴 화면에 별점/라벨로 노출 가능
  tubeCapacity: number;
  tubes: string[][];
}
```

- 이유: 레벨이 10개로 늘어나므로 `MenuScene`(레벨 선택 목록)에서 사용자가 난이도를 가늠할 수 있어야 한다. 필드 하나 추가로 충분하며, 별도 난이도 계산 로직/라이브러리는 필요 없다.
- `MenuScene`이 이 필드를 어떻게 표시할지(별점 아이콘 vs 텍스트 라벨)는 dev 재량 — 이번 설계는 필드 존재와 값만 확정한다.
- 세이브 데이터(`registry.clearedLevels`)는 레벨 `id` 문자열만 저장하므로 이번 변경으로 마이그레이션이 필요 없다.

## 6. dev가 그대로 옮겨 적을 산출물 — `src/data/levels.ts` 전체 교체

아래 배열로 기존 `LEVELS` 상수를 **통째로 교체**한다(위 5장 스키마대로 `difficulty` 필드 포함, `tubeCapacity`·`tubes`는 4장 알고리즘으로 생성·검증 완료).

```ts
// 레벨 정의: 각 튜브의 초기 색상 배치(배열 인덱스 0 = 맨 아래)
export interface LevelDef {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tubeCapacity: number;
  tubes: string[][];
}

export const LEVELS: LevelDef[] = [
  {
    id: 'level-1',
    name: '튜토리얼',
    difficulty: 1,
    tubeCapacity: 4,
    tubes: [
      ['red', 'blue', 'red', 'blue'],
      ['red', 'blue', 'blue', 'red'],
      [],
      [],
    ],
  },
  {
    id: 'level-2',
    name: '레벨 2',
    difficulty: 1,
    tubeCapacity: 4,
    tubes: [
      ['blue', 'red', 'green', 'blue'],
      ['red', 'green', 'green', 'green'],
      ['red', 'red', 'blue', 'blue'],
      [],
      [],
    ],
  },
  {
    id: 'level-3',
    name: '레벨 3',
    difficulty: 2,
    tubeCapacity: 4,
    tubes: [
      ['blue', 'blue', 'green', 'blue'],
      ['green', 'green', 'red', 'green'],
      ['red', 'red', 'blue', 'red'],
      [],
    ],
  },
  {
    id: 'level-4',
    name: '레벨 4',
    difficulty: 2,
    tubeCapacity: 4,
    tubes: [
      ['green', 'green', 'green', 'yellow'],
      ['yellow', 'blue', 'red', 'yellow'],
      ['red', 'green', 'yellow', 'blue'],
      ['red', 'blue', 'blue', 'red'],
      [],
      [],
    ],
  },
  {
    id: 'level-5',
    name: '레벨 5',
    difficulty: 3,
    tubeCapacity: 4,
    tubes: [
      ['yellow', 'yellow', 'blue', 'blue'],
      ['blue', 'green', 'red', 'yellow'],
      ['green', 'blue', 'red', 'green'],
      ['red', 'yellow', 'green', 'red'],
      [],
    ],
  },
  {
    id: 'level-6',
    name: '레벨 6',
    difficulty: 3,
    tubeCapacity: 4,
    tubes: [
      ['green', 'yellow', 'yellow', 'yellow'],
      ['purple', 'blue', 'red', 'red'],
      ['red', 'red', 'green', 'purple'],
      ['purple', 'blue', 'blue', 'yellow'],
      ['blue', 'green', 'green', 'purple'],
      [],
      [],
    ],
  },
  {
    id: 'level-7',
    name: '레벨 7',
    difficulty: 4,
    tubeCapacity: 4,
    tubes: [
      ['purple', 'blue', 'red', 'green'],
      ['yellow', 'blue', 'yellow', 'blue'],
      ['purple', 'red', 'red', 'yellow'],
      ['blue', 'yellow', 'purple', 'green'],
      ['purple', 'green', 'red', 'green'],
      [],
    ],
  },
  {
    id: 'level-8',
    name: '레벨 8',
    difficulty: 4,
    tubeCapacity: 5,
    tubes: [
      ['green', 'purple', 'purple', 'yellow', 'yellow'],
      ['red', 'blue', 'red', 'red', 'red'],
      ['blue', 'purple', 'purple', 'blue', 'yellow'],
      ['blue', 'green', 'blue', 'red', 'green'],
      ['yellow', 'green', 'yellow', 'purple', 'green'],
      [],
      [],
    ],
  },
  {
    id: 'level-9',
    name: '레벨 9',
    difficulty: 4,
    tubeCapacity: 4,
    tubes: [
      ['purple', 'orange', 'green', 'green'],
      ['purple', 'blue', 'orange', 'purple'],
      ['orange', 'green', 'yellow', 'yellow'],
      ['purple', 'red', 'green', 'red'],
      ['red', 'blue', 'red', 'yellow'],
      ['yellow', 'blue', 'orange', 'blue'],
      [],
      [],
    ],
  },
  {
    id: 'level-10',
    name: '레벨 10',
    difficulty: 5,
    tubeCapacity: 5,
    tubes: [
      ['green', 'blue', 'green', 'orange', 'yellow'],
      ['orange', 'green', 'orange', 'red', 'orange'],
      ['purple', 'purple', 'red', 'yellow', 'red'],
      ['blue', 'yellow', 'purple', 'red', 'yellow'],
      ['green', 'orange', 'blue', 'purple', 'red'],
      ['yellow', 'blue', 'green', 'blue', 'purple'],
      [],
    ],
  },
];
```

각 튜브 배열 안에서 같은 색이 몇 칸 연속될 수는 있다(셔플 결과 우연히 인접, 특히 level-1처럼 색 종류가 적을 때). 이는 버그가 아니라 셔플의 자연스러운 결과이며, 모든 레벨은 위 solver로 solvable이 확정되어 있으니 dev가 임의로 배열을 손보지 않아야 한다(손보면 재검증 없이는 solvable 보장이 깨짐).

## 7. dev가 알아야 할 결정 사항 요약

1. **`SortLogic.ts`/`Tube.ts`/`GameScene.buildTubes()` 변경 없음.** `levels.ts`의 데이터만 교체.
2. **`LevelDef`에 `difficulty: 1|2|3|4|5` 필드 추가** — `MenuScene`에서 표시 방식은 dev 재량.
3. **레벨 규모 상한을 반드시 지킬 것**: 튜브 수 ≤ 8(2행×4열), `tubeCapacity` ≤ 5, capacity=5는 최상위 1~2레벨에만 사용. 이 상한을 넘는 레벨을 추가하려면(예: 튜브 9개 이상) `GameScene`의 배치 상수 변경이 필요하므로 architect에게 먼저 확인받을 것.
4. **capacity=5 레벨(level-8, level-10)의 1행 상단이 메뉴 버튼과 수 px 수준으로 타이트하다** — 실기기/에뮬레이터에서 튜브 상단 탭 영역과 메뉴 버튼이 실제로 겹쳐 오탭이 발생하는지 QA 단계에서 반드시 확인. 겹침이 확인되면 dev가 임의로 레이아웃 상수를 바꾸지 말고 architect에게 보고.
5. **레벨 배열은 solver로 solvable 검증 완료된 결과이므로 dev가 임의로 셀 값을 수정하지 말 것.** 레벨을 더 추가/조정하고 싶으면 4.1의 생성 절차(시드만 바꿔 재생성)를 따르거나 architect에게 요청.
6. `MenuScene`은 레벨 id를 하드코딩하지 않고 `LEVELS` 배열을 순회해 목록을 그리므로(확인 완료), 레벨이 10개로 늘어나도 별도 코드 변경 없이 자연히 반영된다. 세이브 데이터(`registry.get('clearedLevels')`)도 레벨 id 문자열 배열이라 마이그레이션 불필요.
7. **(신규 발견) `MenuScene`의 레벨 목록이 10개를 담기엔 세로 공간이 부족하다.** 현재 `startY=340`, `gapY=130`, 캔버스 높이 1280 기준으로 계산하면 화면에 온전히 들어오는 버튼은 약 7개(레벨 7까지, y=340+6*130=1120)뿐이고 레벨 8~10(y=1250~1510)은 화면 밖으로 밀려나 스크롤 없이는 선택할 수 없다. 이는 `GameScene`/`Tube` 구조가 아니라 `MenuScene`의 리스트 구현 디테일이라 이번 범위 제한(씬 구조/Tube 렌더링 변경 금지) 대상이 아니다 — dev가 `MenuScene`에 스크롤(또는 페이지네이션) 처리를 추가해야 레벨 10개가 전부 접근 가능하다. 새 씬을 만들 필요는 없고 `MenuScene` 내부 구현만으로 해결 가능한 범위다.
