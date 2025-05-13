import { Scene, GameObjects, Tilemaps } from "phaser";
import { GridEngine } from "grid-engine";

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

// Using string literal types instead of importing Direction from grid-engine
type Direction = "up" | "down" | "left" | "right";

// Define GridEngineConfig interface since it's not exported from grid-engine
interface GridEngineConfig {
  characters: {
    id: string;
    sprite: GameObjects.Sprite;
    walkingAnimationMapping?: {
      up: {
        leftFoot: number;
        standing: number;
        rightFoot: number;
      };
      down: {
        leftFoot: number;
        standing: number;
        rightFoot: number;
      };
      left: {
        leftFoot: number;
        standing: number;
        rightFoot: number;
      };
      right: {
        leftFoot: number;
        standing: number;
        rightFoot: number;
      };
    };
    startPosition: { x: number; y: number };
    facingDirection: Direction;
    speed: number;
    charLayer?: string;
  }[];
  collisionTilePropertyName?: string;
}

export interface WorldReceivedData {
  facingDirection: Direction;
  startPosition: {
    x: number;
    y: number;
  };
}

export default class WorldScene extends Scene {
  // Initialize all required properties
  gridEngine!: GridEngine; // Using definite assignment assertion
  player!: GameObjects.Sprite;
  speed: number = 3;
  tilemap!: Tilemaps.Tilemap;
  map: Maps = Maps.PALLET_TOWN;
  daylightOverlay!: GameObjects.Graphics;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  enterKey!: Phaser.Input.Keyboard.Key;

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

    // Fix positionChangeFinished subscription
    // @ts-ignore - We need to ignore this since the types are not correctly exported
    this.gridEngine.positionChangeFinished().subscribe((observer: any) => {
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

    this.listenMoves();
  }

  listenMoves(): void {
    if (this.input.keyboard && !isUIOpen()) {
      // Check isMoving with ts-ignore
      // @ts-ignore - GridEngine types are incomplete
      const isMoving = this.gridEngine.isMoving(Sprites.PLAYER);

      if (!isMoving) {
        const cursors = this.input.keyboard.createCursorKeys();
        // Fix the error on lines 175-176 by using optional chaining and null checking
        const keys = this.input.keyboard?.addKeys("W,S,A,D") as Record<
          string,
          { isDown: boolean } | null
        >;

        if ((cursors.left?.isDown || keys?.A?.isDown) && keys?.A != null) {
          this.gridEngine.move(Sprites.PLAYER, "left" as Direction);
        } else if (
          (cursors.right?.isDown || keys?.D?.isDown) &&
          keys?.D != null
        ) {
          this.gridEngine.move(Sprites.PLAYER, "right" as Direction);
        } else if ((cursors.up?.isDown || keys?.W?.isDown) && keys?.W != null) {
          this.gridEngine.move(Sprites.PLAYER, "up" as Direction);
        } else if (
          (cursors.down?.isDown || keys?.S?.isDown) &&
          keys?.S != null
        ) {
          this.gridEngine.move(Sprites.PLAYER, "down" as Direction);
        }
      }
    }
  }

  initializeTilemap(): void {
    this.tilemap = this.make.tilemap({ key: this.map });

    // Add tilesets - using the approach from the client code
    const all_tilesets = Object.values(Tilesets).reduce(
      (acc: Tilemaps.Tileset[], value: Tilesets) => {
        if (this.tilemap.tilesets.find(({ name }) => name === value)) {
          const tileset = this.tilemap.addTilesetImage(value);

          if (tileset) {
            acc = [...acc, tileset];
          }
        }

        return acc;
      },
      []
    );

    // Create layers in the correct order for z-index
    Object.values(Layers)
      .filter((layer) => layer !== Layers.OBJECTS)
      .forEach((layer) => {
        this.tilemap.createLayer(layer, all_tilesets);
      });
  }

  initializePlayer() {
    this.cursors =
      this.input?.keyboard?.createCursorKeys() as Phaser.Types.Input.Keyboard.CursorKeys;
    this.enterKey = this.input?.keyboard?.addKey(
      "ENTER"
    ) as Phaser.Input.Keyboard.Key;

    this.player = this.add.sprite(0, 0, Sprites.PLAYER);
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(1);
  }

  initializeGrid(): void {
    const { startPosition, facingDirection } = getStartPosition(this);

    const gridEngineConfig: GridEngineConfig = {
      collisionTilePropertyName: "collides",
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
          // Fix the Direction type mismatch by casting
          facingDirection: facingDirection as Direction,
          speed: this.speed,
        },
      ],
    };

    // @ts-ignore - GridEngine types are incomplete
    this.gridEngine.create(this.tilemap, gridEngineConfig);
  }

  initializeCamera(): void {
    this.cameras.main.roundPixels = true;
    this.cameras.main.setZoom(1.5);
    this.cameras.main.setBounds(
      0,
      0,
      this.tilemap.widthInPixels,
      this.tilemap.heightInPixels,
      true
    );
    this.cameras.main.startFollow(this.player, true);
  }

  listenKeyboardControl(): void {
    // Add null checks for input.keyboard
    this.input.keyboard?.on("keydown-ESC", () => {
      if (isUIOpen()) {
        triggerUIExit();
      } else {
        toggleMenu();
      }
    });

    this.input.keyboard?.on("keydown-SPACE", () => {
      triggerUINextStep();
    });

    this.input.keyboard?.on("keydown-UP", () => {
      triggerUIUp();
    });

    this.input.keyboard?.on("keydown-DOWN", () => {
      triggerUIDown();
    });

    this.input.keyboard?.on("keydown-LEFT", () => {
      triggerUILeft();
    });

    this.input.keyboard?.on("keydown-RIGHT", () => {
      triggerUIRight();
    });
  }
}
