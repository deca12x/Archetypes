import { Types } from "phaser";

export const gameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: 800,
  height: 600,
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: {
    preload: function (this: Phaser.Scene) {
      // Load tileset
      this.load.image("desert_gate1", "/assets/tilesets/desert_gate1.webp");
      // Load map
      this.load.tilemapTiledJSON("desertgate", "/assets/maps/desertgate.json");
      // Load player sprite
      this.load.spritesheet("player", "/assets/characters/wizard.png", {
        frameWidth: 48,
        frameHeight: 48,
      });
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: "#000000",
  roundPixels: true,
  antialias: false,
  input: {
    keyboard: true,
    mouse: true,
    touch: true,
    gamepad: false,
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
  audio: {
    disableWebAudio: false,
  },
  callbacks: {
    preBoot: () => {
      const assets = [
        { key: "desert_gate1", path: "/assets/tilesets/desert_gate1.webp" },
        { key: "desertgate", path: "/assets/maps/desertgate.json" },
        { key: "wizard", path: "/assets/characters/wizard.png" },
      ];
      return assets;
    },
  },
}; 