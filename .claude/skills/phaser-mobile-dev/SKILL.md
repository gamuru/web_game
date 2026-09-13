---
name: phaser-mobile-dev
description: "Phaser 3에서 모바일 특화 기능(터치/멀티터치 입력, Scale Manager 반응형 설정, 오브젝트 풀링, 사운드 자동재생 잠금 해제, 델타 타임 이동)을 구현하는 방법 제공. 게임플레이 씬/오브젝트를 코드로 구현할 때, 특히 터치 입력이나 화면 크기 대응 문제를 다룰 때 반드시 사용."
---

# Phaser Mobile Dev — Phaser 3 모바일 구현 패턴

이 스킬은 `phaser-engine-dev` 에이전트가 사용한다. Phaser 3 API를 안다고 가정하고, **모바일에서만 특별히 신경 써야 하는 부분**에 집중한다.

## 1. Scale Manager — 반응형 캔버스

```ts
// src/config/gameConfig.ts
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,          // 화면 비율 유지하며 맞춤 (레터박스 허용)
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,                       // 디자인 기준 해상도 (세로 기준)
    height: 1280,
  },
  // ...
};
```

- `Phaser.Scale.FIT`은 화면 비율이 디자인 비율과 다를 때 레터박스(빈 여백)를 허용한다 — 캐주얼 게임에 가장 안전한 기본값.
- 화면을 꽉 채워야 하는 게임(배경이 늘어나도 괜찮은 경우)은 `Phaser.Scale.RESIZE`를 쓰되, 이 경우 UI 요소를 고정 좌표가 아니라 `this.scale.width/height` 기준 상대 좌표로 배치해야 한다.
- 가로/세로 두 모드를 모두 지원해야 하면 `this.scale.on('resize', ...)`으로 리사이즈 이벤트를 구독하고 UI를 재배치한다. 한쪽 방향만 지원한다면 `screen.orientation.lock()`(지원 브라우저 한정) 또는 CSS로 회전 안내 오버레이를 띄운다.

## 2. 터치 입력

### 기본 탭/드래그
```ts
sprite.setInteractive();
sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => { /* ... */ });
```
- 터치 대상의 히트 영역은 최소 44x44px(CSS 픽셀 기준) 이상 확보한다. 스프라이트가 작으면 `setInteractive(new Phaser.Geom.Rectangle(...), Phaser.Geom.Rectangle.Contains)`로 히트 영역만 키운다.

### 멀티터치
```ts
this.input.addPointer(2); // 기본 1개 → 총 3개 포인터로 확장
this.input.on('pointerdown', (pointer) => { /* pointer.id로 개별 터치 구분 */ });
```

### 스와이프/제스처
스와이프는 라이브러리 없이 시작-끝 좌표 차이로 직접 판정한다:
```ts
let startX = 0, startY = 0;
this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { startX = p.x; startY = p.y; });
this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
  const dx = p.x - startX, dy = p.y - startY;
  const minSwipeDist = 30; // px, 너무 작으면 탭과 오인식
  if (Math.abs(dx) > minSwipeDist || Math.abs(dy) > minSwipeDist) {
    // 방향 판정 후 이벤트 발생
  }
});
```

### 브라우저 기본 제스처 차단
모바일 브라우저의 풀다운 새로고침, 핀치 줌, 더블탭 줌이 게임 조작을 방해한다. `index.html`/CSS에서 캔버스에 아래를 적용한다:
```css
canvas { touch-action: none; }
body { overscroll-behavior: none; }
```

## 3. 델타 타임 기반 이동 (필수)

프레임레이트가 기기마다 다르므로 `update(time, delta)`의 `delta`(ms)를 반드시 사용한다.

```ts
update(time: number, delta: number) {
  const speed = 200; // px/sec
  this.player.x += speed * (delta / 1000) * this.moveDirection;
}
```
`this.player.x += speed * this.moveDirection` 처럼 delta 없이 매 프레임 고정량을 더하면, 60fps 기기와 30fps 기기에서 이동 속도가 2배 차이 난다.

## 4. 오브젝트 풀링

총알/파티클/적처럼 반복 생성되는 오브젝트는 `Group`으로 풀링한다:

```ts
this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 50, runChildUpdate: true });

fireBullet() {
  const bullet = this.bullets.get(x, y) as Bullet; // 비활성 인스턴스 재사용, 없으면 null
  if (!bullet) return; // 풀 고갈 시 발사 스킵 (조용히 무시, 크래시 방지)
  bullet.fire(x, y);
}
```
`update` 루프 안에서 `new Bullet(...)`을 호출하는 코드는 저사양 기기에서 GC(가비지 컬렉션) 스파이크로 인한 프레임 드롭을 유발한다.

## 5. 사운드 자동재생 잠금 해제

모바일 브라우저는 사용자 제스처 없이 오디오 재생을 차단한다. 첫 터치에서 오디오 컨텍스트를 잠금 해제한다:

```ts
// PreloadScene 또는 BootScene
this.sound.pauseOnBlur = false;
this.input.once('pointerdown', () => {
  if (this.sound.locked) {
    this.sound.unlock();
  }
});
```
배경음악은 이 잠금 해제 이후에 재생을 시작하도록 순서를 맞춘다. 잠금 해제 전에 `play()`를 호출하면 조용히 무시될 뿐 에러가 나지 않아 디버깅이 어려우므로, 실기기 테스트 시 반드시 소리가 실제로 나는지 확인한다.

## 6. 텍스처 아틀라스 사용

개별 이미지 파일 대신 스프라이트시트/텍스처 아틀라스를 사용하면 드로우콜이 줄어든다:

```ts
this.load.atlas('game-atlas', 'assets/game-atlas.png', 'assets/game-atlas.json');
// 사용: this.add.sprite(x, y, 'game-atlas', 'player-idle-0');
```
아틀라스 생성/압축 파이프라인은 `mobile-game-optimization` 스킬을 참조한다.

## 7. 에셋 키는 상수로 관리

```ts
// src/data/assetKeys.ts
export const ASSET_KEYS = {
  PLAYER: 'player',
  ENEMY_BASIC: 'enemy-basic',
} as const;
```
문자열 리터럴을 씬마다 다시 타이핑하면 오탈자가 QA 단계에서야 발견된다. 로드부와 사용부 모두 이 상수를 참조하게 한다.
