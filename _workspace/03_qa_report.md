# QA 리포트 — Hue Sort 레벨 10개 확장

검증 대상: `01_architect_design.md`(설계) / `02_engine_dev_summary.md`(구현) — `src/data/levels.ts` 전체 교체, `MenuScene.ts` 스크롤+난이도 별점 추가, `GameScene.create()` 회귀 버그 수정분.

검증 환경: 정적 코드 대조 + 실제 게임 로직(`SortLogic.canPour/pour`)을 그대로 사용한 BFS 오프라인 검증 스크립트(`tsx`로 `src/systems/SortLogic.ts`/`src/data/levels.ts` 직접 import) + `npm run dev`(포트 5176) + claude-in-chrome 브라우저(모바일 뷰포트 420×900 에뮬레이션)로 직접 플레이.

---

## 1. `npm run build`

**통과.** `tsc -b && vite build` 에러 없음(타입 에러 없음). 번들 크기 경고(1.49MB)는 기존부터 있던 것으로 이번 변경과 무관.

## 2. 레벨 10개 solvability 검증

**결함 없음 — 전부 통과.**

실제 `canPour`/`pour`/`isSolved`(`src/systems/SortLogic.ts`)를 그대로 사용한 BFS 솔버로 10개 레벨 전부 재검증했다(정규화 키로 튜브 순열 대칭 제거, 예산 40만 상태):

| id | difficulty | cap | tubes | solvable | 최소 이동수 | 설계문서 표기 이동수 |
|---|---|---|---|---|---|---|
| level-1 | 1 | 4 | 4 | true | 6 | 6 ✓ |
| level-2 | 1 | 4 | 5 | true | 7 | 7 ✓ |
| level-3 | 2 | 4 | 4 | true | 7 | 7 ✓ |
| level-4 | 2 | 4 | 6 | true | 10 | 10 ✓ |
| level-5 | 3 | 4 | 5 | true | 12 | 12 ✓ |
| level-6 | 3 | 4 | 7 | true | 11 | 11 ✓ |
| level-7 | 4 | 4 | 6 | true | 16 | 16 ✓ |
| level-8 | 4 | 5 | 7 | true | 18 | 18 ✓ |
| level-9 | 4 | 4 | 8 | true | 18 | 18 ✓ |
| level-10 | 5 | 5 | 7 | true | 24 | 24 ✓ |

전부 solvable이며 최소 이동수가 설계 문서 표에 적힌 solver 결과와 **정확히 일치**한다 — 설계 문서의 solver 검증 주장이 실제 런타임 로직과 일치함을 확인.

추가로 **실제 브라우저 UI 조작(탭으로 튜브 선택→붓기)** 으로 아래 5개 레벨을 처음부터 끝까지 직접 클리어했다(요청한 "특히 난이도 높은 level-7~10" 중 8, 10을 포함):
- level-1: 6번 이동 후 클리어 (`이동: 6` 표시 확인)
- level-2: 7번 이동 후 클리어
- level-3: 7번 이동 후 클리어
- **level-8**: 18번 이동 후 클리어 (`이동: 18`) — capacity=5, 7튜브
- **level-10**: 24번 이동 후 클리어 (`이동: 24`) — capacity=5, 7튜브, 최고난도

모두 BFS solver가 계산한 이동 시퀀스 그대로 정확히 클리어됨을 확인했고, 클리어 시 이동 횟수 표시도 solver 최소 이동수와 일치했다.

## 3. 메뉴 스크롤 회귀 검증

**결함 없음(터치/드래그 기준).**
- 드래그(터치 스크롤에 해당)로 목록을 끝까지 내려 레벨 10(★★★★★)까지 정상 도달. 스크롤바 thumb도 비례해 이동.
- 스크롤 후 탭(레벨 진입)과 탭 후 드래그가 서로 오작동하지 않음을 확인: 드래그로 최하단까지 내린 뒤 레벨 10 버튼을 탭하면 정확히 `GameScene`(level-10)으로 진입했고, 스크롤 도중 의도치 않게 다른 레벨이 열리는 현상은 관찰되지 않았다(`MenuScene.ts:82`의 10px 드래그 임계값과 `MenuScene.ts:84`의 뷰포트 밖 좌표 무시 가드가 의도대로 동작).
- **경미한 결함**: 마우스 휠 스크롤이 동작하지 않았다. `MenuScene.ts:137-147`에 `this.input.on('wheel', ...)` 핸들러가 등록되어 있으나, 브라우저에서 스크롤 휠 입력(`computer` 도구의 `scroll` 액션, 실제 OS 휠 이벤트)을 줘도 리스트가 전혀 움직이지 않았다(스크린샷 두 장이 완전히 동일). 재현: 데스크톱 브라우저에서 메뉴 화면에 마우스 휠을 굴려도 리스트가 스크롤되지 않음. 원인 미상(코드상 로직 자체는 `listContainer.y - dy`로 타당해 보임 — Phaser의 wheel 이벤트가 발생 조건(포인터가 인터랙티브 오브젝트 위에 있어야 하는지, 혹은 `mouse.target`이 캔버스가 아닌지)을 확인 필요). **심각도: 낮음** — 모바일이 주 타깃이고 터치 드래그는 정상 동작하므로 게임플레이에 지장은 없으나, 데스크톱 플레이 시 스크롤 수단이 드래그뿐이라는 점은 사용자에게 알릴 가치가 있다. dev summary는 이 기능을 "nice-to-have"로 명시했으므로 낮은 우선순위로 phaser-engine-dev에 보고.

## 4. 레벨 클리어 → 메뉴 → 다른 레벨 선택 회귀 확인

**결함 없음 — 과거 크래시 재발하지 않음.**

아래 시퀀스를 연속으로 실행하며 매 전환마다 콘솔을 확인했다:
`level-10 클리어 → 메뉴 → level-1 진입/클리어 → 메뉴 → level-2 진입/클리어 → 메뉴 → level-3 진입/클리어 → 메뉴 → (스크롤) → level-8 진입/클리어`

- 총 5개 레벨을 연속으로 클리어하고 매번 메뉴로 복귀 후 다른 레벨을 재진입했다. `GameScene.create()`가 재호출될 때마다 튜브가 정상 렌더링되었고, 이전 세션의 튜브 상태/하이라이트/이동 횟수가 새 레벨에 새어 들어오는 현상 없음.
- 메뉴 복귀 시 `registry.get('clearedLevels')` 기반 초록색 ✓ 배지가 클리어한 레벨(튜토리얼, 레벨2, 레벨3, 레벨10, 이후 레벨8)에 정확히 표시됨 — id 매칭 정상(6번 경계면 항목 참고).
- `read_console_messages`로 전 과정(레벨 10/1/2/3/8 클리어 + 5번의 메뉴 왕복)을 확인한 결과 **에러/경고 없음**(확장 프로그램의 무관한 `hiding iframe` 로그 1건만 존재). 과거 있었던 "`scene.launch('UIScene')` 직후 불필요한 `moveCountChanged` emit" 문제는 `GameScene.ts:39-41`(현재 `launch` 직후 emit 없음) 기준으로도, 실제 재현 테스트 기준으로도 재발하지 않음을 확인.

## 5. capacity=5 레벨(level-8, level-10) 레이아웃 겹침

**결함 확인 — 낮은 심각도(코드 근거로 확정, 실사용 임팩트는 미미).**

설계 문서(§2, §7-4)가 우려한 대로 좌표를 직접 계산해 대조했다.

- `src/objects/Tube.ts:35-37`(생성자)의 hitArea 계산: `height = SLOT_HEIGHT * capacity + WALL_THICKNESS` (= `70*5+6=356`, capacity=5 기준).
- `src/scenes/GameScene.ts:45`: row 0 튜브의 y좌표 `startY = 420`. 즉 row0 튜브 hitArea 상단 = `420 - 356 = 64` (캔버스 좌표).
- `src/scenes/UIScene.ts:24`: `this.addButton(width - 100, 40, 90, 56, '메뉴', ...)` → 버튼 hitArea 하단 = `40 + 56/2 = 68`.
- → **`64 < 68`, 즉 4캔버스유닛만큼 두 히트 영역이 겹친다.** 가로로도 겹친다: row0의 4번째(맨 오른쪽) 튜브 중심 x=585(캔버스, `TUBES_PER_ROW=4`/`COL_GAP=150` 기준), hitArea 폭 90 → x∈[540,630]. 메뉴 버튼 중심 x=620(=`width-100`), 폭 90 → x∈[575,665]. 교집합 x∈[575,630](55유닛). 즉 겹침 영역은 **x∈[575,630], y∈[64,68]** (캔버스 좌표, level-8/level-10처럼 row0에 4개 튜브가 있고 capacity=5인 경우에만 발생).
- 참고로 이 겹침은 **시각적으로는 거의 드러나지 않는다** — `Tube.ts:70`의 `redraw()`가 그리는 외곽선 높이는 `SLOT_HEIGHT*capacity`(WALL_THICKNESS 미포함, =350)로 hitArea 계산식(`+WALL_THICKNESS`)과 6유닛 차이가 나서, 실제 hitArea가 눈에 보이는 튜브 그림보다 6유닛 위로 더 넓게 잡혀 있다. 브라우저에서 해당 영역을 확대 스크린샷으로 확인한 결과 튜브 그래픽과 메뉴 버튼 사이에 육안상 간격이 있어(대략 2~9px, 측정 오차 있음) dev summary의 "겹침 없음" 관찰은 **시각적으로는 맞는 말이지만, 보이지 않는 히트 영역까지는 확인하지 못한 것**이다.
- **영향 범위**: 겹치는 영역이 캔버스 1280유닛 중 세로 4유닛(튜브 세로길이 356의 약 1%)에 불과해, 실기기에서 손가락으로 정확히 그 4유닛 슬라이스만 노려 탭하기는 사실상 어렵다. 다만 두 씬(GameScene/UIScene)의 입력 우선순위상 나중에 `launch`된 UIScene이 위에 있으므로, 그 영역을 탭하면 튜브 선택이 아니라 "메뉴" 버튼이 반응할 것으로 예상된다(코드 근거상 그러함, 정확한 탭 성공률은 실기기 테스트가 필요).
- **재현 조건**: level-8 또는 level-10 진입 → row0(첫 줄) 맨 오른쪽(4번째) 튜브의 최상단 가장자리(그림 상단에서 위로 몇 px, 메뉴 버튼 바로 아래)를 정밀하게 탭.
- **권고**: 설계 문서가 이미 "임의로 레이아웃 상수를 바꾸지 말고 architect에게 보고"라고 명시했으므로, dev가 직접 수정하지 말고 architect에게 트레이드오프를 보고할 것. 근본 원인은 두 가지 중 하나로 해결 가능: (a) `Tube.ts`의 hitArea 계산에서 `+WALL_THICKNESS`를 제거해 시각적 높이와 일치시키기(가장 저위험, 부작용 없음 — 애초에 WALL_THICKNESS만큼 hitArea가 시각 크기보다 커야 할 이유가 없어 보임), 또는 (b) UIScene 메뉴 버튼 y좌표를 살짝 낮추거나 GameScene의 `startY`를 늘리기(레이아웃 상수 변경이라 범위 밖).
- **심각도: 낮음.** 실사용 충돌 가능성은 매우 낮지만(4유닛/356유닛), 코드 레벨에서 명확히 존재하는 경계면 결함이라 기록.

## 6. 경계면 정합성

| 항목 | 결과 |
|---|---|
| 씬 그래프 (`gameConfig.ts:scene` ↔ `scene.start/launch` 호출) | **정상.** 등록: `BootScene, MenuScene, GameScene, UIScene`. `BootScene.ts:10`→`MenuScene`, `MenuScene.ts:86`→`GameScene`, `GameScene.ts:40`→`UIScene`(launch), `GameScene.ts:143`→`MenuScene`. 죽은 씬/오탈자 없음. |
| `LevelDef.difficulty` 필드 | **정상.** 10개 레벨 전부 1~5 정수 존재, `MenuScene.ts:54`에서 `'★'.repeat(level.difficulty)+'☆'.repeat(5-level.difficulty)`로 소비 — 필드명/타입 일치, undefined 접근 없음. |
| `clearedLevels` 레지스트리 키 매칭 | **정상.** 저장 측(`GameScene.ts:107-110`, `this.level.id` 문자열 push) ↔ 로드 측(`MenuScene.ts:29,47`, `level.id`로 `includes` 조회) 모두 `LevelDef.id` 문자열을 그대로 사용. 실제 플레이로 5개 레벨(1,2,3,8,10) 클리어 후 메뉴에서 정확히 해당 5개만 초록 배지로 표시됨을 확인 — 마이그레이션 이슈 없음(설계 문서 §5 주장과 일치). |
| `tubeCapacity` ↔ `tubes` 배열 길이 | **정상.** BFS 스크립트에서 전 레벨에 대해 `tubes[i].length > tubeCapacity`인 튜브가 있는지 검사(`capMismatch`) — 10개 전부 `false`. |
| 색상 키 (`levels.ts`의 색상 문자열 ↔ `COLOR_MAP`) | **정상.** `red/blue/green/yellow/purple/orange` 전부 `src/data/colors.ts`의 `COLOR_MAP`에 존재. 오탈자 없음(`Tube.ts:70`의 `COLOR_MAP[color] ?? 0xffffff` 폴백이 걸리는 사례 없었음 — 흰색 슬롯이 화면에 나타나지 않았다). |
| 입력 바인딩 ↔ 히트 영역 | 5번 항목의 튜브/메뉴버튼 겹침 제외하고는 정상. 버튼류(`UIScene.addButton`) 최소 크기 90×56, 160×70 등으로 44×44px 권장 기준을 만족. |

---

## 종합 결함 목록

| # | 심각도 | 파일:라인 | 요약 |
|---|---|---|---|
| 1 | 낮음 | `src/objects/Tube.ts:35-37` (hitArea) vs `src/scenes/UIScene.ts:24` (메뉴 버튼) | capacity=5 레벨(level-8, level-10)의 row0 4번째 튜브 히트 영역 상단이 메뉴 버튼 히트 영역 하단과 캔버스 좌표 기준 4유닛(x:575~630) 겹침. 시각적으로는 안 보이나 코드상 확정. 수정 시 architect 보고 권장(범위 밖 레이아웃 상수 변경 소지). |
| 2 | 낮음 | `src/scenes/MenuScene.ts:137-147` | 마우스 휠로 메뉴 리스트 스크롤이 동작하지 않음(터치 드래그는 정상). 데스크톱 전용 이슈, 게임플레이 영향 없음. |

위 2건 외 **다른 결함은 발견되지 않았다.**

## 검증한 구체적 시나리오 (통과)

1. `npm run build` 통과.
2. 실제 `SortLogic` 함수를 사용한 BFS로 레벨 1~10 전부 solvable 확정, 설계 문서의 최소 이동수와 전부 일치.
3. 브라우저에서 level-1, 2, 3, 8, 10을 실제 탭 조작으로 클리어(각각 6/7/7/18/24회 이동, solver와 일치).
4. 메뉴 드래그 스크롤로 레벨 10개 전부 도달, 스크롤 중 오탭/탭 실패 없음.
5. level-10 클리어 → 메뉴 → level-1 진입·클리어 → 메뉴 → level-2 진입·클리어 → 메뉴 → level-3 진입·클리어 → 메뉴 → (스크롤) → level-8 진입·클리어, 총 5회 연속 클리어+메뉴 왕복 동안 콘솔 에러 0건, 렌더링 깨짐 없음.
6. `clearedLevels` 배지가 정확히 클리어한 5개 레벨에만 표시됨(id 매칭 정상).
7. 씬 그래프·색상 키·`tubeCapacity`/`tubes` 길이 정합성 코드 대조 전부 통과.

## 미검증 (실기기 확인 필요)

- 실제 모바일 기기(iOS/Android 실기기)에서의 터치 정밀도 — 브라우저 에뮬레이션(마우스 클릭/드래그)으로는 5번 항목의 4유닛 겹침이 실제 오탭으로 이어지는지 확정할 수 없음. 정적 코드 분석으로 존재는 확정했으나 실제 발생 빈도는 실기기 테스트 권장.
- 가로 모드(landscape) 회전 시 UI 동작은 이번 요청 범위(6개 항목)에 포함되지 않아 별도로 깊이 검증하지 않음. `resize_window`로 가로 비율 시도 시 스크린샷 도구의 캡처 해상도가 고정되어 있어 신뢰성 있게 확인하지 못함 — 필요 시 별도 요청.

---

## 후속 조치 (오케스트레이터가 직접 수정, 재검증 완료)

1. **마우스 휠 스크롤 "미동작"** — 재검증 결과 실제 버그 아님. 브라우저 자동화 도구의 `scroll` 액션이 이 환경에서 canvas에 진짜 `wheel` DOM 이벤트를 발생시키지 않아 생긴 오탐(`WheelEvent`를 직접 dispatch하니 정상 스크롤 확인). 코드 변경 없음.
2. **capacity=5 레벨(level-8, level-10) 튜브/메뉴 버튼 히트 영역 4px 겹침** — 실제 결함으로 확인, 수정함. `src/scenes/UIScene.ts`의 "메뉴" 버튼을 `(width-100, 40, 90, 56)` → `(width-100, 32, 90, 48)`로 축소/상향 조정해 최악의 경우(capacity=5, 튜브 히트영역 상단 y=64)에도 버튼 하단(y=56)이 겹치지 않도록 8px 여유를 확보. `npm run build` 통과, level-8 진입 후 확대 스크린샷으로 시각적 여백 확인 완료.
