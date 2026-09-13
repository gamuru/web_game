---
name: mobile-game-optimization
description: "모바일 웹 게임의 성능 측정·최적화, 에셋 압축/텍스처 아틀라스 패킹, PWA(홈 화면 설치·오프라인 캐싱) 구성, 세이프에어리어/노치 대응, 로딩 전략을 제공. 게임이 느리다, 배터리 소모가 크다, 화면이 노치에 가려진다, 홈 화면에 설치되게 하고 싶다, 배포 전 최적화가 필요할 때 반드시 사용."
---

# Mobile Game Optimization — 모바일 웹 게임 성능/배포 최적화

이 스킬은 `mobile-optimizer` 에이전트가 사용한다. 추측이 아니라 측정에 기반한 최적화를 원칙으로 한다.

## 1. 먼저 측정한다

- **Phaser 내장 FPS**: `this.game.loop.actualFps`를 화면 구석에 디버그 텍스트로 표시해 실측한다.
- **Chrome DevTools 모바일 시뮬레이션**: 원격 디버깅(`chrome://inspect`)으로 실제 안드로이드 기기를 연결하거나, DevTools의 CPU 4x/6x 스로틀링으로 저사양 기기를 흉내낸다. Performance 탭에서 프레임 드롭 구간과 원인(Scripting/Rendering/GC)을 확인한다.
- **Lighthouse (Mobile)**: 초기 로딩 성능, 번들 크기, PWA 체크리스트를 점검한다.
- 측정 없이 "느릴 것 같은 코드"를 먼저 고치지 않는다. 실제 병목이 다른 곳일 수 있다.

## 2. 에셋 최적화

| 에셋 유형 | 최적화 방법 |
|----------|-----------|
| 스프라이트 이미지 | 개별 PNG 대신 텍스처 아틀라스(TexturePacker 또는 유사 CLI 도구)로 병합 → 드로우콜 감소 |
| 배경/큰 이미지 | WebP로 변환 (PNG 대비 25~35% 용량 감소, 대부분의 모바일 브라우저 지원) |
| 오디오 | 배경음악은 압축률 높은 형식(mp3/ogg) + 128kbps 이하, 효과음은 짧게 자르고 볼륨 정규화 |
| 폰트 | 웹폰트 대신 필요한 글리프만 포함한 서브셋 또는 비트맵 폰트 사용 검토 |

빌드 시 에셋 총량이 성능 예산(기본 5MB, `game-architecture` 스킬의 표 참조)을 넘으면, 초기 로드에 필요한 에셋과 이후 씬에서 필요한 에셋을 분리해 **지연 로딩**한다 (`PreloadScene`에서 전부 로드하지 않고, 각 씬의 `preload()`에서 필요분만 로드).

## 3. 로딩 경험

```ts
// PreloadScene
this.load.on('progress', (value: number) => {
  progressBar.width = 300 * value; // 진행률 바 갱신
});
this.load.on('complete', () => {
  this.scene.start('MenuScene');
});
```
- 진행률 표시 없이 흰 화면/빈 화면 상태로 몇 초를 대기시키지 않는다. 모바일 4G 환경에서는 에셋 로딩이 데스크톱보다 눈에 띄게 느리다.
- 초기 인터랙션까지 3초를 넘기면, 로고/스플래시만 즉시 보여주고 나머지 에셋은 백그라운드에서 로드하는 방식을 검토한다.

## 4. 세이프에어리어 / 노치 대응

`index.html`의 viewport에 `viewport-fit=cover`가 설정되어 있어야 아래 CSS 변수가 동작한다 (스캐폴딩 단계에서 이미 설정됨, 없으면 추가).

```css
#game-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

Phaser 캔버스 **내부** UI(HUD 버튼 등)가 노치/홈 인디케이터에 가려지는 경우, CSS padding만으로는 해결되지 않는다. `UIScene`에서 안전 영역만큼 여백을 두고 배치하거나, JS에서 `env()` 값을 읽어 Phaser 좌표 계산에 반영한다 (`getComputedStyle`로 CSS 변수 값을 읽어와야 함).

## 5. PWA 구성 (홈 화면 설치 + 오프라인)

`vite-plugin-pwa`를 사용해 최소한의 설정으로 구성한다:

```bash
npm install -D vite-plugin-pwa
```

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '게임 이름',
        short_name: '게임',
        display: 'fullscreen',       // 브라우저 UI 없이 전체화면 (게임에 적합)
        orientation: 'portrait',      // 지원 방향에 맞춰 조정
        theme_color: '#000000',
        background_color: '#000000',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,mp3,ogg}'], // 게임 에셋 오프라인 캐싱
      },
    }),
  ],
});
```
- `display: 'fullscreen'` 또는 `'standalone'`은 홈 화면에서 실행 시 브라우저 주소창을 숨겨 네이티브 앱에 가까운 느낌을 준다.
- Service Worker 캐싱 대상에 게임 에셋 확장자를 빠짐없이 포함해야 오프라인에서도 정상 실행된다.

## 6. 배터리/발열 고려

- 화면이 정지된 화면(메뉴, 일시정지)에서도 매 프레임 불필요한 연산을 하고 있지 않은지 확인한다 — 필요 시 `this.scene.pause()`와 `this.game.loop.sleep()` 활용.
- 백그라운드 탭/앱 전환 시 `visibilitychange` 이벤트로 게임을 일시정지해 배터리 소모와 백그라운드 오디오 재생을 막는다 (Phaser는 기본적으로 `pauseOnBlur`가 켜져 있으나, 커스텀 `requestAnimationFrame` 루프를 추가했다면 별도 처리 필요).

## 7. 배포 관련 경계

정적 자산 최적화(위 항목들)까지가 이 스킬의 범위다. Vercel 배포 설정, 환경 변수, 도메인 연결 등은 `vercel:deploy`, `vercel:vercel-cli` 등 기존 Vercel 스킬을 사용한다 — 중복 구현하지 않는다.

## 최적화 리포트 형식

`_workspace/{n}_optimizer_report.md`에 아래를 포함한다:

| 측정 항목 | 이전 | 이후 | 조치 |
|----------|------|------|------|
| FPS (중급 기기 기준) | ... | ... | ... |
| 초기 로드 크기 | ... | ... | ... |
| Lighthouse Mobile Performance | ... | ... | ... |
