# 설계 문서 — 튜브 배치 엄지 도달성(Thumb Reach) 재설계

## 1. 작업 범위 요약

실기기 모바일 테스트에서 "튜브가 화면 상단에 몰려 있어 한 손 엄지 조작이 어렵다"는 피드백을 반영해, `GameScene.buildTubes()`의 **세로 배치 공식만** 바꾼다.

**변경 대상**: `src/scenes/GameScene.ts`의 `startY` 상수와 `y` 계산식.
**변경 안 함**: `TUBES_PER_ROW`(4)·`COL_GAP`(150)·`ROW_GAP`(380) 값, `Tube.ts`(히트영역 계산식 포함) 전부, `src/data/levels.ts`의 튜브 색상 데이터, `UIScene.ts`의 버튼 좌표(계산 결과 변경 불필요로 판명 — 4장 참고), 씬 그래프(`BootScene→MenuScene→GameScene(+UIScene)` 그대로).

## 2. 핵심 설계 결정 — "첫 행 y" 대신 "마지막 행 y"를 고정한다

기존 코드는 `startY=420`(첫 행 y좌표)을 고정하고 `row1 = startY+ROW_GAP`로 아래 행을 파생시켰다. 이 방식은 튜브가 8개(2행)든 4개(1행)든 **첫 행이 항상 같은 상단 위치에서 시작**해, 1행짜리 레벨(레벨1, 레벨3)조차 화면 중상단에 그려지는 원인이었다.

새 설계는 반대로 **마지막 행의 y좌표를 화면 하단(엄지 도달 영역)에 고정**하고, 위쪽 행이 있으면 `ROW_GAP`만큼 위로 올라가는 방식으로 뒤집는다.

```ts
// src/scenes/GameScene.ts
const TUBES_PER_ROW = 4;   // 변경 없음
const COL_GAP = 150;       // 변경 없음
const ROW_GAP = 380;       // 변경 없음 — capacity=5 기준 행간 24px 여백을 유지(3장 근거)
const BOTTOM_ROW_Y = 1120; // 신규 — 기존 startY(420, "첫 행 y") 대체. "마지막 행의 y"를 의미.

private buildTubes() {
  const { width } = this.scale;
  const numRows = Math.ceil(this.tubeState.length / TUBES_PER_ROW);

  this.tubeState.forEach((colors, index) => {
    const col = index % TUBES_PER_ROW;
    const row = Math.floor(index / TUBES_PER_ROW);
    const rowCols = Math.min(TUBES_PER_ROW, this.tubeState.length - row * TUBES_PER_ROW);
    const rowWidth = (rowCols - 1) * COL_GAP;
    const rowStartX = width / 2 - rowWidth / 2;
    const x = rowStartX + col * COL_GAP;
    const y = BOTTOM_ROW_Y - (numRows - 1 - row) * ROW_GAP; // 변경된 부분

    const tube = new Tube(this, x, y, index, this.level.tubeCapacity, colors, (i) => this.onTubeTapped(i));
    this.tubeObjects.push(tube);
  });
}
```

**diff 요약**: `const startY = 420;` 삭제 → 모듈 스코프에 `const BOTTOM_ROW_Y = 1120;` 추가, `buildTubes()` 안에 `numRows` 한 줄 추가, `y` 계산식 한 줄 교체. 그 외 루프 구조·`Tube` 생성 호출은 그대로다.

**왜 이렇게 뒤집었는가**: 레벨 규모 제약(1절 참고, 튜브 최대 8개=2행)상 실제 존재하는 행 수는 1 또는 2뿐이다. 기존 방식(`startY` 고정)은 2행 레이아웃의 하단 여백(캔버스 하단 버튼까지)을 기준으로 `startY`를 정하면, 1행 레이아웃(레벨1·3)은 같은 `startY`를 그대로 써서 화면 하단에 큰 공백을 남긴 채 튜브만 중간에 뜬다 — 정작 엄지가 가장 편한 "화면 맨 아래"를 1행 레벨에서 못 쓰게 된다. 반대로 "마지막 행"을 하단에 고정하면 1행이든 2행이든 **가장 손이 닿기 쉬운 마지막(=유일하거나 아래쪽) 행이 항상 같은 낮은 위치**에 오고, 2행일 때만 위 행이 `ROW_GAP`만큼 위로 밀려 올라간다. 코드 복잡도는 곱셈 부호 하나 차이라 과설계가 아니다.

## 3. 세로 여백 계산 근거 (왜 1120인가)

`Tube.ts:39-40` 기준 히트 영역 높이 `H = SLOT_HEIGHT*capacity + WALL_THICKNESS = 70*capacity+6`.
- capacity 4 (대부분의 레벨) → `H=286`
- capacity 5 (level-8, level-10만) → `H=356`

히트 영역은 컨테이너 y 기준 **위쪽으로** `H`만큼 확장되므로, 어떤 행의 하단 경계는 항상 `그 행의 y`이고, 상단 경계는 `y - H`다.

**하단 제약**: `UIScene.ts`의 "되돌리기"/"섞기" 버튼은 `y=height-90=1190`, `h=70` → 히트 영역 `[1155, 1225]`. 마지막 행의 하단 경계(=`BOTTOM_ROW_Y`)가 1155보다 충분히 작아야 한다. `BOTTOM_ROW_Y=1120`이면 여백 `1155-1120=35px` — 직전 QA 사고(메뉴 버튼 4px 겹침, 8px로 수정해 해결)의 여유폭(8px)보다 4배 이상 넉넉하다.

**상단 제약**: `UIScene.ts`의 "메뉴" 버튼(`x=width-100, y=32, w=90, h=48`)의 히트 영역 하단 = `32+48/2=56`. `moveCountText`(`y=24`, `fontSize=28px`)의 실측 하단은 대략 `y≈58` 이하. 2행 레이아웃의 첫 행 y는 `BOTTOM_ROW_Y-ROW_GAP=1120-380=740`이고, 이 행의 상단 경계는 `740-H`다. capacity=5(가장 타이트한 경우) 기준 `740-356=384` → 상단 HUD 하단(58)과의 여백은 `384-58=326px`. capacity=4는 `740-286=454`로 여백이 더 크다.

즉 **상단은 항상 300px 이상, 하단은 항상 35px의 여유**를 갖도록 `BOTTOM_ROW_Y=1120`, `ROW_GAP=380`(변경 없음)을 확정했다.

## 4. 레벨별 좌표 전수 계산표 (증명)

`row y = BOTTOM_ROW_Y - (numRows-1-row)*ROW_GAP`, `numRows = ceil(튜브수/4)`. 히트 영역 상단=`y-H`, 하단=`y`.

| id | 튜브수 | capacity | H | numRows | row0 y (상단/하단) | row1 y (상단/하단) |
|---|---|---|---|---|---|---|
| level-1 | 4 | 4 | 286 | 1 | — | 1120 (834 / 1120) *(단일 행이라 row1 슬롯에 위치)* |
| level-2 | 5 | 4 | 286 | 2 | 740 (454 / 740) | 1120 (834 / 1120) |
| level-3 | 4 | 4 | 286 | 1 | — | 1120 (834 / 1120) |
| level-4 | 6 | 4 | 286 | 2 | 740 (454 / 740) | 1120 (834 / 1120) |
| level-5 | 5 | 4 | 286 | 2 | 740 (454 / 740) | 1120 (834 / 1120) |
| level-6 | 7 | 4 | 286 | 2 | 740 (454 / 740) | 1120 (834 / 1120) |
| level-7 | 6 | 4 | 286 | 2 | 740 (454 / 740) | 1120 (834 / 1120) |
| level-8 | 7 | **5** | **356** | 2 | 740 (**384** / 740) | 1120 (**764** / 1120) |
| level-9 | 8 | 4 | 286 | 2 | 740 (454 / 740) | 1120 (834 / 1120) |
| level-10 | 7 | **5** | **356** | 2 | 740 (**384** / 740) | 1120 (**764** / 1120) |

(1행 레벨의 유일한 행은 코드상 `row=0, numRows=1`이라 공식이 바로 `y=1120`을 내놓는다 — 표에서 "row1 슬롯"이라 적은 건 좌표값이 2행 레이아웃의 마지막 행과 같다는 뜻이지 실제 두 번째 행이 존재한다는 뜻은 아니다.)

**HUD/버튼과의 여백 (전 레벨 공통, 실제 픽셀)**

| 경계면 | 상대 좌표 | 값 | 여백 |
|---|---|---|---|
| 메뉴 버튼 하단 | `y=56` | 고정 | — |
| moveCount 텍스트 하단(추정) | `y≈58` | 고정 | — |
| **row0 상단 (최악 케이스, capacity5)** | `y=384` (level-8, level-10) | | **HUD와 326px 여백** |
| row0 상단 (capacity4, 나머지 2행 레벨) | `y=454` | | HUD와 396px 여백 |
| **마지막 행 하단 (전 레벨 공통)** | `y=1120` | | **버튼 상단(1155)과 35px 여백** |
| 되돌리기/섞기 버튼 상단 | `y=1155` | 고정 | — |

y축 구간이 `[HUD 하단(58), row0 상단(384~454)]`와 `[마지막행 하단(1120), 버튼 상단(1155)]` 양쪽 모두 **겹치는 구간이 전혀 없다**(두 사각형이 교차하려면 x·y축 모두 겹쳐야 하는데, y축이 이미 분리되어 있으므로 x좌표를 볼 필요 없이 교차 불가능이 증명된다 — 이번 재배치는 직전 QA 사고처럼 "y축이 몇 px 겹치는" 경계 케이스 자체가 없다).

**행간 여백**(2행 레벨의 row0 하단 vs row1 상단): `row1상단 - row0하단 = (1120-H) - 740 = 380-H`.
- capacity4: `380-286=94px`
- capacity5(level-8, level-10): `380-356=24px` (기존 `ROW_GAP=380` 값 그대로 유지했으므로 기존과 동일한 24px — 새 문제 아님, 3장에서 이미 검토된 값)

**가로 배치**: `TUBES_PER_ROW`/`COL_GAP` 불변이므로 기존과 동일하게 안전하다(행 폭 최대 `(4-1)*150=450 < 720`, 튜브 x범위 90~630, 캔버스 폭 0~720 안).

## 5. 엄지 도달성 개선 정도

| 레벨 유형 | 기존(첫 행 y=420) | 신규 | 화면 세로(1280) 대비 위치 |
|---|---|---|---|
| 1행 레벨(1, 3) | y=420 (32.8%) | y=1120 (87.5%) | 화면 중상단 → 화면 최하단부 |
| 2행 레벨의 첫 행 | y=420 (32.8%) | y=740 (57.8%) | 화면 중상단 → 화면 중하단 |
| 2행 레벨의 마지막 행 | y=800 (62.5%) | y=1120 (87.5%) | 화면 중하단 → 화면 최하단부 |

전 레벨에서 최소 1개 행(1행 레벨은 유일한 행, 2행 레벨은 마지막 행)이 화면 세로 87.5% 지점, 즉 하단 버튼 바로 위 엄지 자연 도달 영역에 위치하게 된다.

## 6. UIScene 변경 여부 — 결론: 변경 불필요

4장 계산대로 하단 버튼(`y=height-90`, `h=70`)과의 여백이 35px로 이미 충분해(직전 사고 수정폭 8px의 4배 이상) 버튼 좌표를 옮길 필요가 없다. **`UIScene.ts`는 이번 변경에서 그대로 둔다.**

(참고: 상단 "메뉴" 버튼이 직전 QA 사고로 `(width-100, 32, 90, 48)`로 이미 축소되어 있는데, 이번 재배치로 상단 여백이 300px 이상으로 벌어지므로 그 축소 자체가 더 이상 필수는 아니게 됐다. 다만 되돌릴 이유도 없으므로 — 기존 값 그대로 두는 것을 권장한다. 불필요한 변경 지양.)

## 7. dev(phaser-engine-dev)가 그대로 옮겨 적을 변경 사항 — `src/scenes/GameScene.ts`만 수정

```diff
- const TUBES_PER_ROW = 4;
- const COL_GAP = 150;
- const ROW_GAP = 380;
+ const TUBES_PER_ROW = 4;
+ const COL_GAP = 150;
+ const ROW_GAP = 380;
+ const BOTTOM_ROW_Y = 1120; // 마지막 행의 y좌표(화면 하단, 엄지 도달 영역). 기존 startY(첫 행 y=420) 폐기.
```

```diff
  private buildTubes() {
    const { width } = this.scale;
-   const startY = 420;
+   const numRows = Math.ceil(this.tubeState.length / TUBES_PER_ROW);

    this.tubeState.forEach((colors, index) => {
      const col = index % TUBES_PER_ROW;
      const row = Math.floor(index / TUBES_PER_ROW);
      const rowCols = Math.min(TUBES_PER_ROW, this.tubeState.length - row * TUBES_PER_ROW);
      const rowWidth = (rowCols - 1) * COL_GAP;
      const rowStartX = width / 2 - rowWidth / 2;
      const x = rowStartX + col * COL_GAP;
-     const y = startY + row * ROW_GAP;
+     const y = BOTTOM_ROW_Y - (numRows - 1 - row) * ROW_GAP;

      const tube = new Tube(this, x, y, index, this.level.tubeCapacity, colors, (i) => this.onTubeTapped(i));
      this.tubeObjects.push(tube);
    });
  }
```

`UIScene.ts`, `Tube.ts`, `src/data/levels.ts`는 변경하지 않는다.

## 8. QA에게 전달할 검증 요청

1. 실기기(iOS/Android)에서 레벨1(1행)·레벨8(2행, capacity5)·레벨9(2행, 8튜브) 세 가지를 대표 케이스로 삼아 엄지 한 손 조작이 실제로 편해졌는지 확인.
2. `npm run build` 통과 확인(로직 변경이 `numRows` 정수 연산뿐이라 타입 에러 가능성은 낮으나 확인 필수).
3. 4장 표의 계산이 실제 렌더링과 일치하는지(특히 level-8/level-10의 row0 상단 y=384, row1 하단 y=1120) 브라우저 좌표 확대 스크린샷 또는 콘솔 로그로 재확인 — 이번에도 "괜찮아 보인다"가 아니라 픽셀로 재검증할 것.
4. 가로 모드(landscape)는 이번 범위에 포함하지 않음(기존 QA 문서에서도 별도 요청 필요 항목으로 남겨둠) — 필요 시 별도 요청.

## 9. 범위 밖 사항 (건드리지 않음)

- `src/data/levels.ts`의 색상 배치 값(solver 검증 완료 데이터) — 절대 수정 안 함.
- 레벨 규모 상한(튜브 8개, capacity 5) — 이번 설계는 이 상한을 그대로 전제로 계산했다. 상한이 바뀌면(예: 3행 레이아웃 도입) `BOTTOM_ROW_Y`/`ROW_GAP` 재계산이 필요하므로 architect에게 먼저 확인받을 것.
- `MenuScene`의 레벨 목록 스크롤 등 — 이번 요청과 무관, 03번 문서 범위.
