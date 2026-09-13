import Phaser from 'phaser';
import type { GameScene } from './GameScene';

// GameScene과 병렬 실행되는 HUD. 게임 상태는 GameScene이 소유하고,
// 이 씬은 버튼 입력을 GameScene의 public 메서드 호출로 전달하는 역할만 한다.
export class UIScene extends Phaser.Scene {
  private moveCountText!: Phaser.GameObjects.Text;
  private solvedOverlay!: Phaser.GameObjects.Container;

  constructor() {
    super('UIScene');
  }

  create() {
    const gameScene = this.scene.get('GameScene') as GameScene;
    const { width, height } = this.scale;

    this.moveCountText = this.add.text(24, 24, '이동: 0', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ffffff',
    });

    // capacity=5 레벨(row0 튜브 높이 최대 356px)의 튜브 히트 영역 상단(y=64)과 겹치지 않도록
    // y/height를 낮춰뒀다 — 자세한 계산은 _workspace/03_qa_report.md 참고.
    this.addButton(width - 100, 32, 90, 48, '메뉴', () => gameScene.backToMenu());
    this.addButton(width / 2 - 100, height - 90, 160, 70, '되돌리기', () => gameScene.undo());
    this.addButton(width / 2 + 100, height - 90, 160, 70, '섞기', () => gameScene.shuffleBoard());

    this.solvedOverlay = this.buildSolvedOverlay(gameScene);
    this.solvedOverlay.setVisible(false);

    // create()가 재호출될 때 이전 리스너가 누적되지 않도록 먼저 제거한다.
    gameScene.events.removeAllListeners('moveCountChanged');
    gameScene.events.removeAllListeners('solved');

    gameScene.events.on('moveCountChanged', (count: number) => {
      this.moveCountText.setText(`이동: ${count}`);
    });
    gameScene.events.on('solved', () => {
      this.solvedOverlay.setVisible(true);
    });
  }

  private addButton(x: number, y: number, w: number, h: number, label: string, onTap: () => void) {
    const bg = this.add
      .rectangle(x, y, w, h, 0x2a2d36)
      .setStrokeStyle(2, 0x454955)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, { fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5);
    bg.on('pointerdown', onTap);
  }

  private buildSolvedOverlay(gameScene: GameScene): Phaser.GameObjects.Container {
    const { width, height } = this.scale;
    const container = this.add.container(0, 0);

    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    const panel = this.add.rectangle(width / 2, height / 2, 480, 280, 0x1c1e24).setStrokeStyle(2, 0x454955);
    const title = this.add
      .text(width / 2, height / 2 - 60, '클리어!', { fontFamily: 'sans-serif', fontSize: '48px', color: '#2ecc71' })
      .setOrigin(0.5);

    const backBg = this.add
      .rectangle(width / 2, height / 2 + 50, 220, 70, 0x2a2d36)
      .setStrokeStyle(2, 0x454955)
      .setInteractive({ useHandCursor: true });
    const backLabel = this.add
      .text(width / 2, height / 2 + 50, '메뉴로', { fontFamily: 'sans-serif', fontSize: '26px', color: '#ffffff' })
      .setOrigin(0.5);
    backBg.on('pointerdown', () => gameScene.backToMenu());

    container.add([dim, panel, title, backBg, backLabel]);
    return container;
  }
}
