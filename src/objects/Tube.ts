import Phaser from 'phaser';
import { COLOR_MAP } from '../data/colors';

const TUBE_WIDTH = 90;
const SLOT_HEIGHT = 70;
const WALL_THICKNESS = 6;
const OUTLINE_COLOR = 0x454955;
const HIGHLIGHT_COLOR = 0xffffff;

/**
 * 튜브 하나를 시각화하는 오브젝트. 색상 배열을 받아 아래에서 위로 쌓아 그리며,
 * 탭 시 onTap 콜백으로 자신의 index를 알린다. 실제 정렬 규칙은 SortLogic이 담당하고
 * 이 클래스는 렌더링과 입력 전달만 책임진다.
 */
export class Tube extends Phaser.GameObjects.Container {
  readonly tubeIndex: number;
  private capacity: number;
  private colors: string[];
  private graphics: Phaser.GameObjects.Graphics;
  private highlighted = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    tubeIndex: number,
    capacity: number,
    colors: string[],
    onTap: (index: number) => void,
  ) {
    super(scene, x, y);
    this.tubeIndex = tubeIndex;
    this.capacity = capacity;
    this.colors = colors;

    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    const height = SLOT_HEIGHT * capacity + WALL_THICKNESS;
    const hitArea = new Phaser.Geom.Rectangle(-TUBE_WIDTH / 2, -height, TUBE_WIDTH, height);
    this.setInteractive({ hitArea, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    this.on('pointerdown', () => onTap(this.tubeIndex));

    scene.add.existing(this);
    this.redraw();
  }

  setColors(colors: string[]) {
    this.colors = colors;
    this.redraw();
  }

  setHighlighted(highlighted: boolean) {
    this.highlighted = highlighted;
    this.redraw();
  }

  /** 규칙 위반 탭 시 좌우로 짧게 흔들어 피드백을 준다. */
  shake() {
    this.scene.tweens.add({
      targets: this,
      x: this.x + 12,
      duration: 40,
      yoyo: true,
      repeat: 3,
    });
  }

  private redraw() {
    const height = SLOT_HEIGHT * this.capacity;
    const g = this.graphics;
    g.clear();

    // 채워진 색상 슬롯 (아래에서 위로)
    this.colors.forEach((color, i) => {
      const slotY = -SLOT_HEIGHT * (i + 1);
      g.fillStyle(COLOR_MAP[color] ?? 0xffffff, 1);
      g.fillRect(-TUBE_WIDTH / 2 + WALL_THICKNESS / 2, slotY, TUBE_WIDTH - WALL_THICKNESS, SLOT_HEIGHT - 4);
    });

    // 튜브 외곽선 (바닥 + 좌우 벽, 위는 열림)
    g.lineStyle(WALL_THICKNESS, this.highlighted ? HIGHLIGHT_COLOR : OUTLINE_COLOR, 1);
    g.beginPath();
    g.moveTo(-TUBE_WIDTH / 2, -height);
    g.lineTo(-TUBE_WIDTH / 2, 0);
    g.lineTo(TUBE_WIDTH / 2, 0);
    g.lineTo(TUBE_WIDTH / 2, -height);
    g.strokePath();
  }
}
