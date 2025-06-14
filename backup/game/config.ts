import { Types } from "phaser";
import { Maps, Tilesets } from "@/lib/game/constants/assets";

// Define scene functions
function create(this: Phaser.Scene) {
  // Create the map
  const map = this.make.tilemap({ key: Maps.DESERT_GATE });
  const tileset = map.addTilesetImage(Tilesets.DESERT_GATE);
  
  if (tileset) {
    // Create layers
    map.createLayer("ground", tileset);
    const collisionLayer = map.createLayer("collision", tileset);
    if (collisionLayer) {
      collisionLayer.setCollisionByExclusion([-1]);
    }
  }
}

function update(this: Phaser.Scene) {
  // Update logic here
}

export const gameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
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
  scene: {
    preload: function (this: Phaser.Scene) {
      // Load tileset
      this.load.image(Tilesets.DESERT_GATE, "/assets/tilesets/desert_gate.png");
      
      // Load map
      this.load.tilemapTiledJSON(Maps.DESERT_GATE, "/assets/maps/desert_gate.json");
      
      // Load player sprite
      this.load.spritesheet("player", "/assets/characters/wizard.png", {
        frameWidth: 48,
        frameHeight: 48,
      });
    },
    create: create,
    update: update,
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
        { key: Tilesets.DESERT_GATE, path: "/assets/tilesets/desert_gate.png" },
        // Map
        { key: Maps.DESERT_GATE, path: "/assets/maps/desert_gate.json" },
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