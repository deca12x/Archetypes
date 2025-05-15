import { Types } from "phaser";
import BootScene from "./scenes/BootScene";
import WorldScene from "./scenes/WorldScene";
import UIScene from "./scenes/UIScene";

const config: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
  scene: [BootScene, WorldScene, UIScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
  roundPixels: true,
};

export default config; 