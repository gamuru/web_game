---
name: game-architecture
description: "Phaser 3 + TypeScript + Vite 기반 모바일 웹 게임의 프로젝트 스캐폴딩, 폴더 구조, 씬 그래프 설계, 상태 관리, 데이터 모델 정의 방법을 제공. 새 게임 프로젝트를 시작하거나, 씬 구조/데이터 스키마를 설계하거나, 아키텍처를 검토할 때 반드시 사용."
---

# Game Architecture — Phaser 3 모바일 게임 구조 설계

이 스킬은 `game-architect` 에이전트가 사용한다. "어떻게 짜는가"보다 "어떻게 나누는가"에 집중한다.

## 왜 이렇게 나누는가

모바일 웹 게임은 짧은 개발 주기 안에 씬이 계속 추가되고 게임플레이 규칙이 자주 바뀐다. 씬 클래스에 로직을 몰아넣으면 매번 전체 씬을 다시 읽어야 수정할 수 있게 되고, 여러 에이전트가 동시에 작업할 때 충돌이 잦아진다. 반대로 처음부터 재사용 단위(오브젝트/시스템)로 쪼개두면 `phaser-engine-dev`가 기능을 추가할 때 씬 전체가 아니라 해당 파일만 보면 된다.

## 1. 프로젝트 스캐폴딩 (신규 프로젝트일 때만)

프로젝트에 `package.json`이 없으면 신규로 간주하고 아래 순서로 생성한다.

```bash
npm create vite@latest . -- --template vanilla-ts
npm install phaser
```

`vite.config.ts`에 모바일 개발 편의를 위한 설정을 추가한다 (같은 네트워크의 실기기에서 접속 테스트 가능하도록):

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true }, // 같은 네트워크의 모바일 기기에서 접속 테스트 가능
  base: './',
});
```

`index.html`의 `<head>`에 모바일 필수 메타 태그를 넣는다:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

`user-scalable=no`와 `maximum-scale=1`은 게임 캔버스를 핀치 줌으로 확대/축소하는 것을 막기 위함이다. `viewport-fit=cover`는 노치 기기에서 세이프에어리어 CSS 변수(`env(safe-area-inset-*)`)를 사용할 수 있게 한다.

## 2. 폴더 구조

```
src/
├── main.ts              # Phaser.Game 인스턴스 생성, config 조립
├── config/
│   └── gameConfig.ts     # Phaser.Types.Core.GameConfig
├── scenes/
│   ├── BootScene.ts      # 최소 에셋만 로드 후 즉시 PreloadScene으로 전환
│   ├── PreloadScene.ts   # 전체 에셋 로드 + 진행률 표시
│   ├── MenuScene.ts
│   ├── GameScene.ts      # 실제 게임플레이
│   └── UIScene.ts        # HUD 등 오버레이 (GameScene과 병렬 실행)
├── objects/              # 재사용 가능한 게임 오브젝트 (Player, Enemy, Bullet ...)
├── systems/              # 씬에 종속되지 않는 로직 (충돌 처리, 스폰 시스템, 세이브 매니저 ...)
├── data/                 # 레벨 정의, 아이템 테이블 등 정적 데이터 + 타입
└── utils/                # 순수 함수 유틸
public/
└── assets/               # 이미지/오디오/스프라이트시트 원본
```

이 구조를 벗어나야 할 특별한 이유가 있으면(예: 미니게임 모음처럼 씬이 완전히 독립적) `_workspace/`의 설계 문서에 이유를 남기고 변형한다. 이유 없이 프로젝트마다 구조를 다르게 만들지 않는다.

## 3. 씬 그래프 설계 원칙

- **BootScene → PreloadScene → MenuScene → GameScene(+UIScene 병렬)** 을 기본 골격으로 삼는다.
- `GameScene`과 `UIScene`을 분리해 `this.scene.launch('UIScene')`로 병렬 실행하면, HUD 갱신이 게임 로직과 섞이지 않는다.
- 씬 간 데이터 전달은 `this.scene.start('Next', { data })`의 두 번째 인자 또는 Phaser의 `registry`(전역 상태)를 사용한다. 커스텀 이벤트버스를 처음부터 만들지 않는다 — Phaser의 `this.events`/`game.events`로 대부분 해결된다.
- 씬 그래프는 반드시 설계 문서에 다이어그램(텍스트 화살표로 충분)으로 남긴다. `qa-tester`가 이 문서를 기준으로 등록된 씬과 실제 호출을 대조한다.

## 4. 상태 관리 — Phaser 내장 기능을 우선 사용

과설계를 피하기 위해 아래 우선순위를 따른다:

1. **씬 로컬 상태**: 해당 씬에서만 쓰는 값은 씬 클래스의 필드로 둔다.
2. **씬 간 공유 상태**: `this.registry.set/get`을 사용한다 (전역 키-값 저장소, Phaser 내장).
3. **영속 데이터(세이브)**: `localStorage`를 감싼 전용 `SaveManager` 클래스(`src/systems/SaveManager.ts`)를 하나만 만든다. 모든 읽기/쓰기가 이 클래스를 거치게 하여 스키마 변경 시 한 곳만 고치면 되게 한다.
4. 그 이상의 복잡한 상태 관리 라이브러리(Redux, Zustand 등)는 사용자가 명시적으로 요청하지 않는 한 도입하지 않는다.

## 5. 데이터 모델 정의

레벨/아이템/캐릭터 등 정적 데이터는 `src/data/`에 TypeScript 인터페이스 + 상수 객체(또는 JSON)로 정의한다.

```ts
// src/data/levels.ts
export interface LevelDef {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3;
  spawnTable: { enemyType: string; count: number }[];
}

export const LEVELS: LevelDef[] = [ /* ... */ ];
```

세이브 데이터 스키마에는 반드시 버전 필드를 포함한다 (`{ version: 1, ... }`). 이후 스키마가 바뀌어도 `SaveManager`에서 마이그레이션 분기를 추가할 수 있게 하기 위함이다.

## 6. 성능 예산 — 처음부터 숫자로 합의한다

설계 단계에서 아래 항목을 문서에 명시하고 팀 전체가 기준으로 삼는다. 특별한 요구가 없으면 기본값을 사용한다.

| 항목 | 기본값 |
|------|--------|
| 목표 프레임레이트 | 중급 안드로이드 기기 기준 60fps |
| 초기 인터랙션 가능 시점 | 4G 기준 3초 이내 |
| 초기 로드 번들 크기 | 5MB 이내 (에셋 포함) |
| 최소 지원 화면 비율 | 세로 9:19.5 ~ 가로 21:9까지 대응 |

이 표는 `mobile-optimizer`가 최적화 작업의 기준으로 그대로 사용한다.

## 설계 문서 산출물 형식

`_workspace/{n}_architect_design.md`에 아래 섹션을 포함한다:
1. 이번 작업 범위 요약
2. 씬 그래프 (텍스트 다이어그램)
3. 새로 추가/변경된 데이터 스키마 (TypeScript 인터페이스)
4. 다른 팀원이 알아야 할 결정 사항과 이유
