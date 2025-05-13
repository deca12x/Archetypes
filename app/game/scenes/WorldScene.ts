import { Scene, GameObjects, Tilemaps } from "phaser";
import { GridEngine, GridEngineConfig } from "grid-engine";

import {
  Sprites,
  Layers,
  Tilesets,
  Maps,
} from "../../../lib/game/constants/assets";
import {
  getStartPosition,
  savePlayerPosition,
} from "../../../lib/game/utils/map";
import {
  isUIOpen,
  toggleMenu,
  triggerUIDown,
  triggerUIExit,
  triggerUILeft,
  triggerUINextStep,
  triggerUIRight,
  triggerUIUp,
} from "../../../lib/game/utils/ui";
import { useUserDataStore } from "../../../lib/game/stores/userData";

export interface WorldReceivedData {
  facingDirection: string;
  startPosition: {
    x: number;
    y: number;
  };
}

export default class WorldScene extends Scene {
  gridEngine: GridEngine;
  player: GameObjects.Sprite;
  speed: number = 3;
  tilemap: Tilemaps.Tilemap;
  map: Maps = Maps.PALLET_TOWN;
  daylightOverlay: GameObjects.Graphics;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  enterKey: Phaser.Input.Keyboard.Key;

  constructor() {
    super("World");
  }

  init() {
    const daylightOverlay = this.add.graphics();
    daylightOverlay.setDepth(1000);
    daylightOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
    daylightOverlay.setScrollFactor(0);
    this.daylightOverlay = daylightOverlay;
  }

  create(): void {
    this.initializePlayer();
    this.initializeTilemap();
    this.initializeCamera();
    this.initializeGrid();
    this.listenKeyboardControl();

    this.gridEngine.positionChangeFinished().subscribe((observer) => {
      if (observer.charId === Sprites.PLAYER) {
        savePlayerPosition(this);
      }
    });
  }

  update(time: number): void {
    // If UI is open, don't allow player movement
    if (isUIOpen()) {
      return;
    }

    const cursors = this.cursors;
    const enterKey = this.enterKey;

    if (enterKey.isDown && !this.enterKey.isDown) {
      toggleMenu();
    }

    this.enterKey = enterKey;

    if (cursors.left.isDown) {
      this.gridEngine.move(Sprites.PLAYER, "left");
    } else if (cursors.right.isDown) {
      this.gridEngine.move(Sprites.PLAYER, "right");
    } else if (cursors.up.isDown) {
      this.gridEngine.move(Sprites.PLAYER, "up");
    } else if (cursors.down.isDown) {
      this.gridEngine.move(Sprites.PLAYER, "down");
    }
  }

  initializeTilemap(): void {
    this.tilemap = this.make.tilemap({ key: this.map });

    // Add tilesets
    Object.values(Tilesets).forEach((tileset) => {
      this.tilemap.addTilesetImage(tileset, tileset);
    });

    // Create layers in the correct order for z-index
    this.tilemap.createLayer(
      Layers.BELOW_PLAYER,
      Object.values(Tilesets),
      0,
      0
    );
    this.tilemap.createLayer(Layers.WORLD, Object.values(Tilesets), 0, 0);
    this.tilemap.createLayer(
      Layers.ABOVE_PLAYER,
      Object.values(Tilesets),
      0,
      0
    );
  }

  initializePlayer() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey("ENTER");

    this.player = this.add.sprite(0, 0, Sprites.PLAYER);

    // Player animations
    this.anims.create({
      key: "left",
      frames: this.anims.generateFrameNumbers(Sprites.PLAYER, {
        start: 3,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "right",
      frames: this.anims.generateFrameNumbers(Sprites.PLAYER, {
        start: 6,
        end: 8,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "up",
      frames: this.anims.generateFrameNumbers(Sprites.PLAYER, {
        start: 9,
        end: 11,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "down",
      frames: this.anims.generateFrameNumbers(Sprites.PLAYER, {
        start: 0,
        end: 2,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }

  initializeGrid(): void {
    const { startPosition, facingDirection } = getStartPosition(this);

    const gridEngineConfig: GridEngineConfig = {
      characters: [
        {
          id: Sprites.PLAYER,
          sprite: this.player,
          walkingAnimationMapping: {
            up: {
              leftFoot: 9,
              standing: 10,
              rightFoot: 11,
            },
            down: {
              leftFoot: 0,
              standing: 1,
              rightFoot: 2,
            },
            left: {
              leftFoot: 3,
              standing: 4,
              rightFoot: 5,
            },
            right: {
              leftFoot: 6,
              standing: 7,
              rightFoot: 8,
            },
          },
          startPosition,
          facingDirection,
          speed: this.speed,
        },
      ],
    };

    this.gridEngine.create(this.tilemap, gridEngineConfig);
  }

  initializeCamera(): void {
    this.cameras.main.setBounds(
      0,
      0,
      this.tilemap.widthInPixels,
      this.tilemap.heightInPixels
    );
    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setZoom(1.5);
  }

  listenKeyboardControl(): void {
    this.input.keyboard.on("keydown-ESC", () => {
      if (isUIOpen()) {
        triggerUIExit();
      } else {
        toggleMenu();
      }
    });

    this.input.keyboard.on("keydown-SPACE", () => {
      triggerUINextStep();
    });

    this.input.keyboard.on("keydown-UP", () => {
      triggerUIUp();
    });

    this.input.keyboard.on("keydown-DOWN", () => {
      triggerUIDown();
    });

    this.input.keyboard.on("keydown-LEFT", () => {
      triggerUILeft();
    });

    this.input.keyboard.on("keydown-RIGHT", () => {
      triggerUIRight();
    });
  }
}
