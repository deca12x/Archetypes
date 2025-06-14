import { Types } from "phaser";
import { IntroScene } from "./scenes/IntroScene";
import WorldScene from "./scenes/WorldScene";
import BootScene from "./scenes/BootScene";
import Scene3 from "./scenes/Scene3";
import Scene4 from "./scenes/Scene4";
import TutorialScene from "./scenes/TutorialScene";
import TourScene from "./scenes/TourScene";
import PauseScene from "./scenes/PauseScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 800,
  height: 600,
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, IntroScene, WorldScene, Scene3, Scene4, TutorialScene, TourScene, PauseScene],
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