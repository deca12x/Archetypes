import { Types } from "phaser";
import { Maps, Tilesets } from "@/lib/game/constants/assets";

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
      this.load.image(Tilesets.MAPTEST, "/assets/tilesets/maptest.png");
      
      // Load map
      this.load.tilemapTiledJSON(Maps.MAP, "/assets/maps/custom_map.json");
      
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
      // Load assets before the game starts
      const assets = [
        // Tilesets
        { key: Tilesets.MAPTEST, path: "/assets/tilesets/maptest.png" },
        // Map
        { key: Maps.MAP, path: "/assets/maps/custom_map.json" },
        // Characters
        { key: "wizard", path: "/assets/characters/wizard.png" },
        { key: "explorer", path: "/assets/characters/explorer.png" },
        { key: "ruler", path: "/assets/characters/ruler.png" },
        { key: "hero", path: "/assets/characters/hero.png" },
        // UI
        { key: "ui", path: "/assets/ui/ui.png" },
        // Sounds
        { key: "background_music", path: "/assets/sounds/background.mp3" },
        { key: "click", path: "/assets/sounds/click.mp3" },
        { key: "swap", path: "/assets/sounds/swap.mp3" },
        { key: "attack", path: "/assets/sounds/attack.mp3" }
      ];
      return assets;
    },
  },
}; 