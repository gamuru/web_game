# 설계 문서 — Hue Sort (튜브 색상 정렬 퍼즐)

## 1. 작업 범위
Magic Sort(Water Sort Puzzle 장르)의 핵심 정렬 로직만 채용한 신규 모바일 웹 게임의 최초 스캐폴딩 + 코어 루프 설계.

## 2. 테마/이름 결정
- **이름**: Hue Sort
- **비주얼 은유**: 액체 대신 "색상 블록"을 튜브에 쌓는 방식으로 단순화 (레이어드 사각형). 초기 프로토타입 단계에서 액체 웨이브/스플래시 애니메이션 같은 고비용 아트 파이프라인 없이도 규칙을 명확히 시각화할 수 있고, 외부 이미지 에셋 없이 Phaser Graphics만으로 구현 가능해 개발 속도가 빠름
- **테마**: 마법/포션 요소 배제. 미니멀한 다크 배경 + 비비드한 색상 팔레트의 "컬러 랩(color lab)" 톤. 마스코트 캐릭터 없음
- **차별화 포인트(향후)**: 프로토타입 이후 그라디언트 액체 애니메이션이나 고유 색상 팔레트(파스텔/네온 등)로 아이덴티티 확립 가능. 지금 단계에서는 다루지 않음

## 3. 씬 그래프

```
BootScene (최소 설정) → PreloadScene (에셋 없음, 즉시 통과 + 진행 로직 자리만 확보)
  → MenuScene (레벨 선택 목록)
    → GameScene (+ UIScene 병렬 실행: 이동 횟수, Undo/Shuffle 버튼, 뒤로가기)
      → (클리어 시) MenuScene으로 복귀 또는 다음 레벨 GameScene 재시작
```

- `GameScene`은 `this.scene.launch('UIScene')`로 UIScene을 병렬 실행
- 씬 간 데이터 전달: `this.scene.start('GameScene', { levelId })`

## 4. 데이터 모델

```ts
// src/data/levels.ts
export interface LevelDef {
  id: string;
  name: string;
  tubeCapacity: number;      // 튜브당 최대 색상 유닛 수
  tubes: string[][];         // 각 튜브의 초기 색상 배열 (배열 인덱스 0 = 맨 아래)
  // 빈 튜브는 빈 배열 []로 표현
}
```
색상은 문자열 키(예: 'red', 'blue')로 표현하고 렌더링 시 `COLOR_MAP`(src/data/colors.ts)에서 hex 값으로 변환한다. 샘플 레벨 3개를 난이도 점진 상승으로 포함 (튜브 개수 4→6→8, capacity 4 고정).

## 5. 코어 로직 분리 (필수 — 재사용성/테스트 용이성)
`src/systems/SortLogic.ts`에 Phaser에 의존하지 않는 순수 TypeScript 클래스로 게임 규칙을 구현한다:
- `canPour(from: string[], to: string[], capacity: number): boolean`
- `pour(from: string[], to: string[], capacity: number): { from: string[]; to: string[]; movedCount: number }`
- `isSolved(tubes: string[][]): boolean`
- `shuffle(tubes: string[], capacity: number): string[][]` — 유효한 랜덤 재배치 (해가 항상 존재하도록 원래 색상 유닛 총량을 유지한 채 재분배)

이렇게 분리하는 이유: `GameScene`은 이 로직을 호출해 시각적 표현만 담당하게 하여, 규칙 버그와 렌더링 버그를 분리해서 디버깅할 수 있다. QA 에이전트도 이 파일만 단위 테스트하듯 검증 가능.

## 6. 상태 관리
- 현재 레벨의 튜브 상태: `GameScene` 내부 필드로 관리 (씬 로컬)
- Undo 스택: `GameScene` 내부 배열 필드 (`private history: string[][][]`), 각 이동 전 상태를 push
- 이동 횟수, 클리어한 레벨 목록: `this.registry`(전역)에 저장 — MenuScene에서 클리어 여부 표시에 사용
- 영속 저장(새로고침 후 유지)은 이번 프로토타입 범위 밖. 필요 시 `SaveManager`를 추가하되 지금은 구현하지 않음 (과설계 방지)

## 7. 입력/조작
- 탭으로 튜브 선택(하이라이트) → 탭으로 목표 튜브 선택 → 이동 시도
- 같은 튜브 재탭 시 선택 해제
- 이동 불가능한 목표 탭 시 짧은 흔들림 애니메이션으로 피드백 (규칙 위반 인지)

## 8. 다음 단계(구현) 핵심 체크리스트
- [ ] `SortLogic.ts` 구현 및 위 4개 함수 정확히 동작
- [ ] `Tube` 오브젝트: 용량만큼의 슬롯을 가진 세로 스택 시각화, 탭 인터랙션
- [ ] `GameScene`: 레벨 로드 → 튜브 배치 → 탭 입력 처리 → SortLogic 호출 → 승리 체크 → 클리어 연출
- [ ] `UIScene`: Undo/Shuffle 버튼, 이동 횟수 표시, 메뉴로 돌아가기 버튼
- [ ] 델타 타임 기반 애니메이션(색상 이동 시 tween), 터치 히트 영역 44px 이상 확보
- [ ] `phaser-mobile-dev`, `mobile-game-optimization` 스킬의 모바일 패턴(Scale Manager FIT, touch-action: none, 사운드 잠금 해제는 사운드 추가 시)을 적용
