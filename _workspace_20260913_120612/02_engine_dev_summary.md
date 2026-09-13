# 구현 요약 — Hue Sort 프로토타입

01_architect_design.md의 설계를 따라 Phaser 3 + TypeScript + Vite로 스캐폴딩 및 코어 루프를 구현했다.

## 생성된 파일
- `src/systems/SortLogic.ts` — 순수 정렬 규칙 (canPour/pour/isSolved/shuffle)
- `src/objects/Tube.ts` — 튜브 시각화 + 탭 입력
- `src/scenes/BootScene.ts`, `MenuScene.ts`, `GameScene.ts`, `UIScene.ts`
- `src/data/levels.ts` (레벨 3개, 손으로 solvability 검증 완료), `src/data/colors.ts`
- `src/config/gameConfig.ts`, `src/main.ts`, `src/style.css`

## 설계 문서 대비 의도적 변경
- 액체 대신 색상 블록(사각형) 스택으로 시각화 — 외부 에셋/애니메이션 파이프라인 없이 규칙을 명확히 보여주기 위함
- PreloadScene 생략 (로드할 외부 에셋이 없음) — BootScene이 바로 MenuScene으로 전환
- 레벨별 capacity를 고정하지 않고 유연하게 둠 (다만 3개 샘플 레벨 모두 capacity=4로 작성)
- 영속 저장(SaveManager)은 이번 범위에서 구현하지 않음 — 새로고침 시 진행 상황 초기화됨 (과설계 방지, 설계 문서에 명시된 방침)

## 발견 및 수정한 버그 (직접 플레이 테스트로 발견)
1. **승리 조건 오판정**: `isSolved`가 튜브별 단색 여부만 확인해, 같은 색이 두 튜브에 나뉘어 있어도(예: `[red]`+`[red,red,red]`) 클리어로 잘못 판정. `tube.length === capacity` 조건을 추가해 수정.
2. **씬 재시작 크래시**: `GameScene`에 `events = new Phaser.Events.EventEmitter()`를 필드로 선언해 Phaser 내장 `scene.events`(`sys.events`)를 덮어씀 → 씬을 두 번째로 시작할 때 내부 정리 배선이 끊겨 `Text.setText` 호출 시 크래시. 커스텀 필드를 제거하고 상속받은 `this.events`를 그대로 사용하도록 수정.

## 검증 완료 (Chrome 브라우저 실사용 테스트)
- 레벨 1~3 진입, 정상 이동/병합/클리어 흐름
- Menu ↔ GameScene 반복 전환 (씬 재시작 크래시 재발 없음 확인)
- 잘못된 이동 시도 시 정상 거부 (색 안 섞임, 이동 횟수 안 늘어남)
- 같은 튜브 재탭 시 선택 해제
- Undo, Shuffle 버튼 동작
- 클리어 후 메뉴의 체크마크 표시
- 콘솔 에러 없음 (`npm run build` 통과 포함)

## 다음 단계 제안
- `mobile-optimizer`: 실기기/에뮬레이터 다양한 화면비 테스트, PWA 설정, 텍스처 아틀라스는 규모가 커지면 검토
- 레벨 자동 생성기(현재는 3개 수작업), 사운드, 애니메이션(부드러운 pour 트윈) 추가
- 영속 저장(SaveManager) 필요 시 추가
