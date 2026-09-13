import Phaser from 'phaser';

// 외부 에셋이 없는 프로토타입이라 별도 PreloadScene 없이 바로 메뉴로 전환한다.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.scene.start('MenuScene');
  }
}
