# 구현 요약 — Hue Sort 레벨 확장 (난이도 곡선)

## 변경 파일
- `src/data/levels.ts` — 전체 교체. 설계 문서(`01_architect_design.md`) 6장의 배열을 그대로 옮겨 적음. `LevelDef`에 `difficulty: 1|2|3|4|5` 필드 추가. 레벨 3개(모두 `tubeCapacity=4`) → 레벨 10개(`level-1`~`level-10`, `tubeCapacity` 4 또는 5, `difficulty` 1~5)로 교체. 튜브 배치(색상 값)는 solver 검증 결과이므로 셀 값을 손대지 않고 그대로 붙여넣었다.
- `src/scenes/MenuScene.ts` — 스크롤 가능한 레벨 리스트 + 난이도 별점 표시로 재작성.

## 변경하지 않은 것 (범위 제한 준수)
- `src/systems/SortLogic.ts`, `src/objects/Tube.ts`, `src/scenes/GameScene.ts` — 미변경. `GameScene`은 `LevelDef`를 그대로 소비하므로 `difficulty` 필드 추가에 영향받지 않음(확인 완료).
- `src/scenes/UIScene.ts` 버튼 라벨 — 미변경.
- 배치 상수(`TUBES_PER_ROW`, `COL_GAP`, `ROW_GAP`, `startY`, `SLOT_HEIGHT`, `TUBE_WIDTH`) — 미변경.

## MenuScene 구현 방식

### 스크롤 — 드래그 + 마우스 휠 (페이지네이션 대신 선택)
- 레벨 버튼들을 `Phaser.GameObjects.Container` 하나(`listContainer`)에 담고, `Graphics.createGeometryMask()`로 만든 사각형 마스크를 씌워 뷰포트(`y=260`~`height-20`) 밖 콘텐츠를 잘라냄.
- 콘텐츠 전체 높이(`contentHeight`, 레벨 10개 기준 약 1490px)와 뷰포트 높이(약 1000px)의 차이만큼 스크롤 범위(`maxScroll`)를 계산하고, `listContainer.y`를 `Phaser.Math.Clamp`로 그 범위 안에서만 움직이게 함.
- 입력 처리:
  - `pointerdown`/`pointermove`(전역 `this.input`)로 세로 드래그 스크롤 구현. 뷰포트 영역 밖에서 시작한 드래그는 무시.
  - `wheel` 이벤트로 데스크톱 마우스 휠 스크롤도 지원(nice-to-have).
- 오른쪽 가장자리에 얇은 스크롤바(트랙 없이 thumb만, 6px 폭)를 추가해 스크롤 가능 여부와 현재 위치를 시각적으로 표시. 콘텐츠가 뷰포트보다 짧으면(`maxScroll<=0`) 스크롤바를 숨기고 드래그/휠 리스너 자체를 등록하지 않음.
- **탭 vs 드래그 구분**: 버튼은 `pointerdown` 대신 `pointerup`에서 반응하도록 변경. `pointer.downX/downY`와 릴리즈 시점 좌표 사이 거리가 10px 이하일 때만 "탭"으로 인정해 `GameScene`으로 전환. 추가로 릴리즈 좌표가 뷰포트 범위 밖이면(마스크에 가려져 화면에 안 보이는 버튼) 무시하도록 가드를 넣어, 스크롤로 밀려난 비표시 버튼이 오탭되는 것을 방지.
- 페이지네이션이 아닌 스크롤을 택한 이유: 레벨 10개 정도 규모에서는 페이지 전환 UI(다음/이전 버튼, 페이지 인디케이터)를 추가하는 것보다 단일 스크롤 리스트가 구현이 더 단순하고, 캐주얼 퍼즐 게임의 레벨 선택 UX로도 흔한 패턴이다.

### 난이도 표시
- 각 레벨 버튼에 별점 텍스트를 레벨 이름 아래 별도 라인으로 표시: `'★'.repeat(difficulty) + '☆'.repeat(5 - difficulty)` (예: `difficulty=3` → `★★★☆☆`).
- 버튼 높이를 100→110px, 항목 간격을 130→150px로 소폭 늘려 이름 + 별점 두 줄이 버튼 안에 여유 있게 들어가도록 조정(레이아웃 상한 대상인 `GameScene`/`Tube` 상수와는 무관, `MenuScene` 내부 값).

## 검증 결과
- `npm run build` (`tsc -b && vite build`) — 통과, 타입 에러 없음.
- 이미 실행 중이던 dev 서버(`localhost:5173`, HMR)를 브라우저(claude-in-chrome)로 직접 확인:
  - 메뉴 화면에 레벨 10개 전부와 별점이 정상 표시됨.
  - 드래그로 리스트를 끝까지 내려 레벨 10(★★★★★)까지 도달 및 스크롤바 thumb가 비례해 이동하는 것 확인.
  - 레벨 10(튜브 7개, `tubeCapacity=5`) 진입 시 `GameScene`이 정상 렌더링됨(콘솔 에러 없음). 설계 문서가 우려한 "capacity=5 튜브 상단과 메뉴 버튼 겹침" 여부를 확대 스크린샷으로 확인한 결과, 튜브 상단과 메뉴 버튼 사이에 시각적으로 명확한 간격이 있어 겹침 없음 — 다만 이는 브라우저 뷰포트 기준 확인이며 실기기 터치 판정(히트 영역)까지 보장하는 것은 아니므로, 실제 모바일 기기 QA는 여전히 권장.
  - 메뉴로 복귀(메뉴 버튼) 후 스크롤 위치가 초기화되고 리스트가 정상 재생성됨을 확인.
- 게임플레이(이동/클리어) 로직은 이번 변경 범위가 아니므로 별도 회귀 테스트는 수행하지 않음(코드 미변경).

## QA에게 전달할 사항
1. 레벨 8, 10(`tubeCapacity=5`)에서 튜브 상단 히트 영역과 메뉴 버튼 히트 영역이 실기기/에뮬레이터에서 실제로 겹쳐 오탭이 발생하는지 확인 필요(설계 문서 4번 항목). 브라우저 확인상 겹침은 없었음.
2. 메뉴 스크롤이 터치 기기에서 자연스러운지(관성/감도), 짧은 탭이 드래그로 오인되어 레벨 진입이 안 되는 경우가 없는지 확인 필요.
3. 레벨 1~10 전체가 solver로 solvable 검증된 배치이므로, 클리어 불가능한 레벨이 있는지 실제 플레이로도 샘플 확인 권장.
