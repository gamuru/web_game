# 구현 요약 — 튜브 배치 엄지 도달성 재설계 적용

## 1. 참조 문서
`_workspace/04_architect_design.md` (game-architect 설계, "마지막 행 y 고정" 방식)의 diff를 그대로 적용했다.

## 2. 변경 파일
- `src/scenes/GameScene.ts` (유일한 변경 파일)

## 3. 변경 내용

### 3.1 모듈 스코프 상수
```ts
const TUBES_PER_ROW = 4;   // 변경 없음
const COL_GAP = 150;       // 변경 없음
const ROW_GAP = 380;       // 변경 없음
const BOTTOM_ROW_Y = 1120; // 신규 — "마지막 행의 y좌표". 기존 startY(420, "첫 행 y") 완전 제거.
```

### 3.2 `buildTubes()`
- `const startY = 420;` 제거.
- `const numRows = Math.ceil(this.tubeState.length / TUBES_PER_ROW);` 추가.
- `y` 계산식을 `startY + row * ROW_GAP` → `BOTTOM_ROW_Y - (numRows - 1 - row) * ROW_GAP`로 교체.
- 루프 구조, `Tube` 생성 호출, `x` 계산식은 전혀 손대지 않음.

`UIScene.ts`, `Tube.ts`, `src/data/levels.ts`는 설계 문서 지시대로 수정하지 않았다.

## 4. 빌드 확인
`npm run build` 실행 결과 `tsc -b && vite build` 모두 통과, 타입 에러 없음. (기존에도 있던 청크 크기 500KB 초과 경고는 이번 변경과 무관한 사전 존재 경고.)

## 5. 브라우저 시각 확인 (claude-in-chrome, 개발 서버 `npm run dev`)
- **레벨 1 (튜토리얼, 1행·4튜브)**: 튜브 행이 화면 하단부, `되돌리기`/`섞기` 버튼 바로 위에 위치. 버튼과 겹침 없음. 상단 HUD(이동 수, 메뉴 버튼)와도 넉넉한 간격.
- **레벨 9 (2행·8튜브)**: 마지막 행이 화면 하단 버튼 바로 위(엄지 도달 영역)에 위치, 첫 행은 `ROW_GAP`만큼 위로 밀려 있으며 상단 HUD와 겹치지 않음. 두 행 사이 간격도 정상적으로 분리되어 보임.
- 두 케이스 모두 설계 문서 4장의 좌표 전수표(예: level-9는 capacity4 → row0 y=740, row1 y=1120)와 시각적으로 일치하는 배치를 확인했다.

(참고: 픽셀 단위 정밀 좌표 로그 추출은 하지 않았고 스크린샷 육안 확인만 수행했다. 필요 시 QA 단계에서 `Tube` 컨테이너의 실제 `y` 값을 콘솔로 덤프해 4장 표와 픽셀 단위로 재검증할 것을 권장한다.)

## 6. 후속 QA 요청
- 설계 문서 8장에 명시된 대로, 실기기(iOS/Android) 엄지 조작감 확인과 픽셀 단위 좌표 재검증은 `qa-tester`가 이어서 진행 필요.
- 가로 모드(landscape)는 이번 범위 밖.
