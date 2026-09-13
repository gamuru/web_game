import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#111318',
  scale: {
    mode: Phaser.Scale.FIT,
    // #game-container가 이미 flexbox로 중앙 정렬하므로 CENTER_BOTH를 쓰면
    // Phaser가 margin을 한 번 더 더해 캔버스가 오른쪽으로 밀린다.
    autoCenter: Phaser.Scale.NO_CENTER,
    width: 720,
    height: 1280,
  },
  scene: [BootScene, MenuScene, GameScene, UIScene],
};
