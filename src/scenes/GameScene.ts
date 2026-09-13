import Phaser from 'phaser';
import { LEVELS, type LevelDef } from '../data/levels';
import { Tube } from '../objects/Tube';
import { canPour, pour, isSolved, shuffle } from '../systems/SortLogic';

const TUBES_PER_ROW = 4;
const COL_GAP = 150;
const ROW_GAP = 380;

// 커스텀 이벤트는 Phaser.Scene이 기본 제공하는 this.events(=sys.events)를 그대로 사용한다.
// 별도 EventEmitter 필드로 덮어쓰면 씬 재시작 시 내부 정리(cleanup) 배선이 끊겨
// 두 번째 진입부터 렌더링이 깨지는 문제가 있었다.
export class GameScene extends Phaser.Scene {
  private level!: LevelDef;
  private tubeState: string[][] = [];
  private tubeObjects: Tube[] = [];
  private selectedIndex: number | null = null;
  private history: string[][][] = [];
  private moveCount = 0;
  private solved = false;

  constructor() {
    super('GameScene');
  }

  create(data: { levelId: string }) {
    const level = LEVELS.find((l) => l.id === data.levelId);
    if (!level) {
      throw new Error(`알 수 없는 레벨 id: ${data.levelId}`);
    }
    this.level = level;
    this.tubeState = level.tubes.map((tube) => [...tube]);
    this.tubeObjects = [];
    this.selectedIndex = null;
    this.history = [];
    this.moveCount = 0;
    this.solved = false;

    this.buildTubes();
    this.scene.launch('UIScene');
  }

  private buildTubes() {
    const { width } = this.scale;
    const startY = 420;

    this.tubeState.forEach((colors, index) => {
      const col = index % TUBES_PER_ROW;
      const row = Math.floor(index / TUBES_PER_ROW);
      const rowCols = Math.min(TUBES_PER_ROW, this.tubeState.length - row * TUBES_PER_ROW);
      const rowWidth = (rowCols - 1) * COL_GAP;
      const rowStartX = width / 2 - rowWidth / 2;
      const x = rowStartX + col * COL_GAP;
      const y = startY + row * ROW_GAP;

      const tube = new Tube(this, x, y, index, this.level.tubeCapacity, colors, (i) => this.onTubeTapped(i));
      this.tubeObjects.push(tube);
    });
  }

  private onTubeTapped(index: number) {
    if (this.solved) return;

    if (this.selectedIndex === null) {
      if (this.tubeState[index].length === 0) return; // 빈 튜브는 출발점이 될 수 없음
      this.selectedIndex = index;
      this.tubeObjects[index].setHighlighted(true);
      return;
    }

    if (this.selectedIndex === index) {
      this.tubeObjects[index].setHighlighted(false);
      this.selectedIndex = null;
      return;
    }

    const fromIndex = this.selectedIndex;
    const from = this.tubeState[fromIndex];
    const to = this.tubeState[index];

    if (!canPour(from, to, this.level.tubeCapacity)) {
      this.tubeObjects[index].shake();
      return;
    }

    this.history.push(this.tubeState.map((t) => [...t]));

    const result = pour(from, to, this.level.tubeCapacity);
    this.tubeState[fromIndex] = result.from;
    this.tubeState[index] = result.to;

    this.tubeObjects[fromIndex].setColors(result.from);
    this.tubeObjects[fromIndex].setHighlighted(false);
    this.tubeObjects[index].setColors(result.to);
    this.selectedIndex = null;

    this.moveCount++;
    this.events.emit('moveCountChanged', this.moveCount);

    if (isSolved(this.tubeState, this.level.tubeCapacity)) {
      this.solved = true;
      this.onSolved();
    }
  }

  private onSolved() {
    const cleared: string[] = this.registry.get('clearedLevels') ?? [];
    if (!cleared.includes(this.level.id)) {
      this.registry.set('clearedLevels', [...cleared, this.level.id]);
    }
    this.events.emit('solved');
  }

  /** UIScene의 Undo 버튼에서 호출한다. */
  undo() {
    if (this.solved || this.history.length === 0) return;
    const previous = this.history.pop()!;
    this.tubeState = previous;
    this.tubeState.forEach((colors, i) => this.tubeObjects[i].setColors(colors));
    if (this.selectedIndex !== null) {
      this.tubeObjects[this.selectedIndex].setHighlighted(false);
      this.selectedIndex = null;
    }
    this.moveCount = Math.max(0, this.moveCount - 1);
    this.events.emit('moveCountChanged', this.moveCount);
  }

  /** UIScene의 Shuffle 버튼에서 호출한다. */
  shuffleBoard() {
    if (this.solved) return;
    this.history.push(this.tubeState.map((t) => [...t]));
    this.tubeState = shuffle(this.tubeState, this.level.tubeCapacity);
    this.tubeState.forEach((colors, i) => this.tubeObjects[i].setColors(colors));
    if (this.selectedIndex !== null) {
      this.tubeObjects[this.selectedIndex].setHighlighted(false);
      this.selectedIndex = null;
    }
  }

  backToMenu() {
    this.scene.stop('UIScene');
    this.scene.stop('GameScene');
    this.scene.start('MenuScene');
  }
}
