import Phaser from 'phaser';
import { LEVELS } from '../data/levels';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 140, 'HUE SORT', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 210, '색을 모아 튜브를 정리하세요', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#9aa0aa',
      })
      .setOrigin(0.5);

    const clearedLevels: string[] = this.registry.get('clearedLevels') ?? [];

    // 스크롤 가능 영역: 부제목 아래 ~ 화면 하단 (레벨 10개가 화면 높이를 넘어서므로 필요)
    const viewportTop = 260;
    const viewportBottom = height - 20;
    const viewportHeight = viewportBottom - viewportTop;

    const buttonWidth = 560;
    const buttonHeight = 110;
    const gapY = 150;
    const topPadding = buttonHeight / 2 + 15;

    const contentHeight = topPadding * 2 + (LEVELS.length - 1) * gapY;

    const listContainer = this.add.container(width / 2, viewportTop);

    LEVELS.forEach((level, index) => {
      const localY = topPadding + index * gapY;
      const isCleared = clearedLevels.includes(level.id);

      const button = this.add
        .rectangle(0, localY, buttonWidth, buttonHeight, isCleared ? 0x2f8f5b : 0x2a2d36)
        .setStrokeStyle(2, 0x454955)
        .setInteractive({ useHandCursor: true });

      const stars = '★'.repeat(level.difficulty) + '☆'.repeat(5 - level.difficulty);

      const label = this.add
        .text(0, localY - 14, `${level.name}${isCleared ? '  ✓' : ''}`, {
          fontFamily: 'sans-serif',
          fontSize: '30px',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      const starLabel = this.add
        .text(0, localY + 24, stars, {
          fontFamily: 'sans-serif',
          fontSize: '22px',
          color: '#f1c40f',
        })
        .setOrigin(0.5);

      listContainer.add([button, label, starLabel]);

      button.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        // 드래그(스크롤) 동작과 탭을 구분: 이동 거리가 작을 때만 탭으로 인정
        const dragDist = Phaser.Math.Distance.Between(
          pointer.downX,
          pointer.downY,
          pointer.x,
          pointer.y
        );
        if (dragDist > 10) return;
        // 스크롤 뷰포트 밖으로 밀려나 마스크에 가려진 버튼은 탭 무시
        if (pointer.y < viewportTop || pointer.y > viewportBottom) return;

        this.scene.start('GameScene', { levelId: level.id });
      });
    });

    // 뷰포트 밖 콘텐츠를 잘라내는 마스크
    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, viewportTop, width, viewportHeight);
    listContainer.setMask(maskShape.createGeometryMask());

    // 스크롤 범위 계산 (콘텐츠가 뷰포트보다 짧으면 스크롤 불필요)
    const maxScroll = Math.max(0, contentHeight - viewportHeight);
    const minContainerY = viewportTop - maxScroll;
    const maxContainerY = viewportTop;

    const setContainerY = (y: number) => {
      listContainer.y = Phaser.Math.Clamp(y, minContainerY, maxContainerY);
      if (maxScroll > 0) {
        const scrollFraction = (maxContainerY - listContainer.y) / maxScroll;
        const thumbHeight = Math.max(40, (viewportHeight / contentHeight) * viewportHeight);
        scrollThumb.y = viewportTop + scrollFraction * (viewportHeight - thumbHeight);
      }
    };

    // 스크롤 여지가 있을 때만 보이는 얇은 스크롤바
    const scrollThumb = this.add.rectangle(
      width - 14,
      viewportTop,
      6,
      Math.max(40, (viewportHeight / contentHeight) * viewportHeight),
      0x555a66
    );
    scrollThumb.setOrigin(0.5, 0);
    scrollThumb.setVisible(maxScroll > 0);

    if (maxScroll > 0) {
      let dragStartPointerY = 0;
      let dragStartContainerY = 0;

      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.y < viewportTop || pointer.y > viewportBottom) return;
        dragStartPointerY = pointer.y;
        dragStartContainerY = listContainer.y;
      });

      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.isDown) return;
        const dy = pointer.y - dragStartPointerY;
        setContainerY(dragStartContainerY + dy);
      });

      this.input.on(
        'wheel',
        (
          _pointer: Phaser.Input.Pointer,
          _objects: unknown,
          _dx: number,
          dy: number
        ) => {
          setContainerY(listContainer.y - dy);
        }
      );
    }
  }
}
