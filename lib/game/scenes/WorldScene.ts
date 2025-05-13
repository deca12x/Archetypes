import Phaser from "phaser";
import { GridEngine } from "grid-engine";

export class WorldScene extends Phaser.Scene {
  private gridEngine!: GridEngine;
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: "WorldScene" });
  }

  preload() {
    this.load.image("tiles", "/assets/images/tilesets/world-tileset.png");
    this.load.tilemapTiledJSON("map", "/assets/maps/world-map.json");
    this.load.spritesheet("player", "/assets/images/characters/player.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create() {
    // Create the tilemap
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("world-tileset", "tiles");

    // Only proceed if tileset is loaded properly
    if (!tileset) {
      console.error("Failed to load tileset");
      return;
    }

    // Create layers
    const groundLayer = map.createLayer("Ground", tileset);
    const obstaclesLayer = map.createLayer("Obstacles", tileset);

    // Set collisions (only if layer exists)
    if (obstaclesLayer) {
      obstaclesLayer.setCollisionByProperty({ collides: true });
    }

    // Create player
    this.player = this.add.sprite(400, 300, "player");
    this.player.setDepth(1);

    // Create animations
    this.createPlayerAnimations();

    // Setup GridEngine
    const gridEngineConfig = {
      characters: [
        {
          id: "player",
          sprite: this.player,
          startPosition: { x: 12, y: 12 },
          walkingAnimationMapping: {
            up: { leftFoot: 9, standing: 10, rightFoot: 11 },
            down: { leftFoot: 0, standing: 1, rightFoot: 2 },
            left: { leftFoot: 3, standing: 4, rightFoot: 5 },
            right: { leftFoot: 6, standing: 7, rightFoot: 8 },
          },
        },
      ],
    };

    // Initialize GridEngine plugin
    this.gridEngine.create(map, gridEngineConfig);

    // Setup keyboard input
    this.cursors =
      this.input?.keyboard?.createCursorKeys() as Phaser.Types.Input.Keyboard.CursorKeys;

    // Set camera to follow player
    this.cameras.main.startFollow(this.player);
  }

  update() {
    // Handle player movement
    const leftDown = this.cursors.left?.isDown;
    const rightDown = this.cursors.right?.isDown;
    const upDown = this.cursors.up?.isDown;
    const downDown = this.cursors.down?.isDown;

    if (leftDown) {
      this.gridEngine.move("player", "left");
    } else if (rightDown) {
      this.gridEngine.move("player", "right");
    } else if (upDown) {
      this.gridEngine.move("player", "up");
    } else if (downDown) {
      this.gridEngine.move("player", "down");
    }
  }

  private createPlayerAnimations() {
    // Create player walking animations
    this.anims.create({
      key: "player_down",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "player_left",
      frames: this.anims.generateFrameNumbers("player", { start: 3, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "player_right",
      frames: this.anims.generateFrameNumbers("player", { start: 6, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "player_up",
      frames: this.anims.generateFrameNumbers("player", { start: 9, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });
  }
}

export default WorldScene;
