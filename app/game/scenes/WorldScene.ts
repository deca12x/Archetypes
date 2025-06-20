import { Scene, GameObjects, Tilemaps } from "phaser";
import { Socket } from "socket.io-client";
import { Player } from "../../../lib/socket/socketServer";
import GridEngine from "grid-engine";
import {
  Sprites,
  Layers,
  Tilesets,
  Maps,
} from "../../../lib/game/constants/assets";
// import {
//   getStartPosition,
//   savePlayerPosition,
// } from "../../../lib/game/utils/map";
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
import { useChatStore } from "../../../lib/game/stores/chat";
import { useUIStore } from "../../../lib/game/stores/ui";
import { useSocket } from "../../../lib/hooks/useSocket";
// import { MissionCard } from "../components/MissionCard";
// Define Direction enum since it's not exported from grid-engine
enum Direction {
  UP = "up",
  DOWN = "down",
  LEFT = "left",
  RIGHT = "right",
}
import { chatService } from "../../../lib/game/utils/chatService";
import {
  initializeScene,
  setupCommonSocketHandlers,
  checkAdjacentPlayers as checkAdjacentPlayersUtil,
} from "../../../lib/game/utils/sceneUtils";
import { handleSceneTransition } from "../../../lib/game/utils/sceneTransitions";
import { setupSceneTransitions } from "../../../lib/game/utils/sceneTransitions";

// Add a helper function to convert string literals to Direction type
function toDirection(dir: string): Direction {
  switch (dir) {
    case "up":
      return Direction.UP;
    case "down":
      return Direction.DOWN;
    case "left":
      return Direction.LEFT;
    case "right":
      return Direction.RIGHT;
    default:
      return Direction.DOWN; // Default direction
  }
}

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
    facingDirection?: Direction;
    speed?: number;
    charLayer?: string;
  }[];
  collisionTilePropertyName?: string;
}

// Define types for GridEngine interfaces
// We'll create our own interfaces to avoid importing directly from grid-engine
interface GridEngineInterface {
  movementStarted(): {
    subscribe: (callback: (data: MovementEvent) => void) => void;
  };
  movementStopped(): {
    subscribe: (callback: (data: MovementEvent) => void) => void;
  };
  directionChanged(): {
    subscribe: (callback: (data: MovementEvent) => void) => void;
  };
  positionChangeFinished(): {
    subscribe: (callback: (data: any) => void) => void;
  };
  getPosition(charId: string): { x: number; y: number };
  getFacingDirection(charId: string): Direction;
  setPosition(charId: string, position: { x: number; y: number }): void;
  turnTowards(charId: string, direction: Direction): void;
  hasCharacter(charId: string): boolean;
  addCharacter(config: any): void;
  removeCharacter(charId: string): void;
  create(tilemap: Phaser.Tilemaps.Tilemap, config: any): void;
  move(charId: string, direction: Direction): void;
  isMoving(charId: string): boolean;
}

// Define the event types
interface MovementEvent {
  charId: string;
  direction: Direction;
}

// Define types for movement data
interface PlayerMovement {
  x: number;
  y: number;
  direction: string;
}

export interface WorldReceivedData {
  facingDirection: Direction;
  startPosition: {
    x: number;
    y: number;
  };
}

export default class WorldScene extends Scene {
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private player: Phaser.GameObjects.Sprite | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasdKeys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  } | null = null;
  private collisionObjects: Phaser.GameObjects.Rectangle[] | null = null;
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  public username: string = "Player";
  public playerId: string = "";
  private socket: Socket | null = null;
  private mapKey: string = "world";
  private daylightOverlay: Phaser.GameObjects.Graphics | null = null;
  private gridEngine: GridEngineInterface | null = null;
  private gridEngineReady: boolean = false; // Add flag to track initialization
  private roomId: string = "";
  private isTransitioning: boolean = false;
  private roomCodeText: Phaser.GameObjects.Text | null = null;
  private remotePlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private chatGroupId: string = "";
  private adjacentPlayers: Set<string> = new Set();
  private backgroundMusic?: Phaser.Sound.BaseSound;
  // private missionCard: MissionCard | null = null;
  private assignedSprite: string = "wizard"; // Default sprite
  private spawnPosition?: { x: number; y: number };

  constructor() {
    super({ key: "WorldScene" });
  }

  init(data: any) {
    // Use common initialization
    const { socket, roomId, playerId, username, sprite } = initializeScene(
      this,
      data
    );
    this.socket = socket;
    this.roomId = roomId;
    this.playerId = playerId || socket?.id || "";
    this.username = username;
    this.assignedSprite = sprite || "wizard";
    this.mapKey = data.mapKey || "world";
    this.backgroundMusic = data.music;

    // Handle spawn position if provided
    if (data.spawnPosition) {
      this.spawnPosition = data.spawnPosition;
    }

    console.log(
      "WorldScene init called with socket:",
      this.socket ? "available" : "not available"
    );

    const daylightOverlay = this.add.graphics();
    daylightOverlay.setDepth(1000);
    daylightOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
    daylightOverlay.setScrollFactor(0);
    this.daylightOverlay = daylightOverlay;

    if (this.socket) {
      // Set up socket event handlers
      this.setupSocketHandlers();
    }
  }

  create(): void {
    console.log("WorldScene create method started");
    try {
      // Clear any existing game objects
      this.children.each((child) => {
        child.destroy();
      });

      // Initialize the tilemap first
      this.initializeTilemap();
      console.log("Tilemap initialized");

      // Then initialize the player
      this.initializePlayer();
      console.log("Player initialized");

      // Initialize GridEngine
      this.initializeGridEngine();

      // Set up scene transitions
      setupSceneTransitions(this);

      // Set up keyboard input
      if (this.input && this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys({
          up: Phaser.Input.Keyboard.KeyCodes.W,
          down: Phaser.Input.Keyboard.KeyCodes.S,
          left: Phaser.Input.Keyboard.KeyCodes.A,
          right: Phaser.Input.Keyboard.KeyCodes.D,
        }) as {
          up: Phaser.Input.Keyboard.Key;
          down: Phaser.Input.Keyboard.Key;
          left: Phaser.Input.Keyboard.Key;
          right: Phaser.Input.Keyboard.Key;
        };
      } else {
        console.error("Input system not available in WorldScene");
      }

      // Start background music
      if (!this.backgroundMusic) {
        this.backgroundMusic = this.sound.add("background_music", {
          volume: 0.5,
          loop: true,
        });
        this.backgroundMusic.play();
      }

      // Show the third message after a delay
      this.time.delayedCall(2000, () => {
        const message =
          "There — just past the ridge.\nIf I don't trade now, I'm done.";
        const messageText = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height * 0.8,
          message,
          {
            fontSize: "32px",
            fontFamily: "Arial",
            color: "#ffffff",
            align: "center",
            stroke: "#000000",
            strokeThickness: 4,
            shadow: {
              offsetX: 2,
              offsetY: 2,
              color: "#000",
              blur: 2,
              stroke: true,
              fill: true,
            },
            wordWrap: { width: this.cameras.main.width * 0.4 },
          }
        );
        messageText.setOrigin(0.5, 0.5);
        messageText.setDepth(2000);

        // Fade in the message
        messageText.setAlpha(0);
        this.tweens.add({
          targets: messageText,
          alpha: 1,
          duration: 1000,
          onComplete: () => {
            // Wait 3 seconds then fade out
            this.time.delayedCall(3000, () => {
              this.tweens.add({
                targets: messageText,
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                  messageText.destroy();
                },
              });
            });
          },
        });
      });

      // Initialize mission card
      // this.missionCard = new MissionCard(this);
      // this.missionCard.show();

      // Add mission card
      // const missionCard = this.add.container(20, 20);

      // Background
      const cardBg = this.add.rectangle(0, 0, 300, 100, 0x000000, 0.7);
      cardBg.setStrokeStyle(2, 0xffffff);

      // Mission title
      const missionTitle = this.add.text(0, -30, "MISSION", {
        fontSize: "24px",
        fontFamily: "Arial",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      });
      missionTitle.setOrigin(0, 0.5);

      // Mission objective
      const missionObjective = this.add.text(
        0,
        10,
        "Get to the marketplace\nbefore night falls",
        {
          fontSize: "20px",
          fontFamily: "Arial",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
          lineSpacing: 5,
        }
      );
      missionObjective.setOrigin(0, 0.5);

      // Add all elements to the container
      // missionCard.add([cardBg, missionTitle, missionObjective]);
      // missionCard.setDepth(1000); // Ensure it's above other elements

      // Add a subtle pulsing effect to the border
      this.tweens.add({
        targets: cardBg,
        alpha: 0.5,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      // Initialize multiplayer and room code display
      this.initializeMultiplayer();
      this.setupSocketHandlers();

      // Notify server that we've entered WorldScene
      if (this.socket && this.roomId) {
        console.log("🌍 Notifying server that we entered WorldScene");
        this.socket.emit("playerEnteredScene", {
          roomId: this.roomId,
          sceneName: "WorldScene",
          playerId: this.playerId,
        });

        // Also send our current position to all players in the scene
        if (this.player && this.gridEngine) {
          const currentPos = this.gridEngine.getPosition("player");
          console.log(
            "🌍 Sending our position to all players in WorldScene:",
            currentPos
          );
          this.socket.emit("playerPosition", {
            playerId: this.socket.id,
            position: currentPos,
            facingDirection: this.gridEngine.getFacingDirection("player"),
          });
        }
      }

      // Create room code display with appropriate initial message
      const gameAction =
        typeof window !== "undefined"
          ? localStorage.getItem("gameAction")
          : null;
      const roomCode =
        typeof window !== "undefined" ? localStorage.getItem("roomCode") : null;

      let initialMessage = "Creating room...";
      if (gameAction === "join" && roomCode) {
        initialMessage = `Joining room: ${roomCode}`;
      }

      this.roomCodeText = this.add.text(
        this.cameras.main.width - 20,
        20,
        initialMessage,
        {
          fontSize: "18px",
          fontFamily: "Arial",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
          backgroundColor: "#000000",
          padding: { x: 10, y: 5 },
        }
      );
      this.roomCodeText.setOrigin(1, 0);
      this.roomCodeText.setDepth(1000);
      this.roomCodeText.setVisible(false); // Hide the Phaser text element
    } catch (error) {
      console.error("Error in create method:", error);
    }
  }

  initializeMultiplayer() {
    console.log("Initializing multiplayer...");
    if (this.socket) {
      this.username = "Player" + Math.floor(Math.random() * 1000);
      console.log("Username set to:", this.username);

      if (typeof window !== "undefined") {
        // Read from localStorage instead of window object
        const gameAction = localStorage.getItem("gameAction");
        const roomCode = localStorage.getItem("roomCode");
        console.log(
          "localStorage gameAction:",
          gameAction,
          "roomCode:",
          roomCode
        );

        if (gameAction === "join" && roomCode) {
          // Join existing room
          console.log("Joining existing room:", roomCode);
          this.joinRoom(roomCode, this.username);

          // Clear localStorage after reading
          localStorage.removeItem("gameAction");
          localStorage.removeItem("roomCode");
        } else {
          // Create new room
          console.log("Creating new room");
          this.createOrJoinRoom(this.username);
        }
      } else {
        // Default to creating a room
        console.log("No window object, creating new room");
        this.createOrJoinRoom(this.username);
      }
    } else {
      console.warn("Socket not available for multiplayer initialization");
    }
  }

  setupGridEngineListeners() {
    if (!this.gridEngine) return;

    console.log("Setting up GridEngine listeners...");

    // Listen for movement started
    this.gridEngine
      .movementStarted()
      .subscribe(({ charId, direction }: MovementEvent) => {
        console.log("GridEngine: Movement started", { charId, direction });
        if (charId === "player" && this.player) {
          const currentPosition = this.gridEngine?.getPosition("player");
          if (currentPosition) {
            // Calculate the target position based on the direction
            const targetPosition = {
              x:
                currentPosition.x +
                (direction === Direction.LEFT
                  ? -1
                  : direction === Direction.RIGHT
                  ? 1
                  : 0),
              y:
                currentPosition.y +
                (direction === Direction.UP
                  ? -1
                  : direction === Direction.DOWN
                  ? 1
                  : 0),
            };

            this.updateSpritePosition(currentPosition);
            this.playWalkingAnimation(direction);

            // Send target position update to other players
            if (this.socket && this.roomId) {
              this.socket.emit("playerPosition", {
                playerId: this.socket.id,
                position: targetPosition, // Send the target position instead of current
                facingDirection: direction,
              });
            }
          }
        }
      });

    // Listen for movement stopped
    this.gridEngine
      .movementStopped()
      .subscribe(({ charId, direction }: MovementEvent) => {
        console.log("GridEngine: Movement stopped", { charId, direction });
        if (charId === "player" && this.player) {
          const position = this.gridEngine?.getPosition("player");
          if (position) {
            this.updateSpritePosition(position);
            this.playIdleAnimation(direction);
            // No position update sent here
          }
        }
      });

    // Listen for direction changes
    this.gridEngine
      .directionChanged()
      .subscribe(({ charId, direction }: MovementEvent) => {
        console.log("GridEngine: Direction changed", { charId, direction });
        if (charId === "player" && this.player) {
          const position = this.gridEngine?.getPosition("player");
          if (position) {
            this.updateSpritePosition(position);
            this.playWalkingAnimation(direction);
          }
        }
      });

    // Listen for position change finished
    this.gridEngine.positionChangeFinished().subscribe((data: any) => {
      console.log("GridEngine: Position change finished", data);
      if (data.charId === "player" && this.player) {
        const position = this.gridEngine?.getPosition("player");
        if (position) {
          this.updateSpritePosition(position);
          this.playIdleAnimation(data.direction || Direction.DOWN);
        }
      }
    });

    console.log("GridEngine listeners set up successfully");
  }

  // Add method to update sprite position based on GridEngine tile position
  private updateSpritePosition(position: { x: number; y: number }) {
    if (!this.player) {
      console.warn(
        "updateSpritePosition: Player is undefined, skipping position update"
      );
      return;
    }

    const tileSize = 32; // Correct tile size for this map
    const pixelX = position.x * tileSize + tileSize / 2;
    const pixelY = position.y * tileSize + tileSize / 2;

    console.log("Updating sprite position:", {
      tilePosition: position,
      pixelPosition: { x: pixelX, y: pixelY },
      currentSpritePosition: { x: this.player.x, y: this.player.y },
    });

    this.player.setPosition(pixelX, pixelY);
    console.log("Sprite position after setPosition:", {
      x: this.player.x,
      y: this.player.y,
    });
  }

  // Add method to play walking animation based on direction
  private playWalkingAnimation(direction: Direction) {
    if (!this.player) {
      console.warn(
        "playWalkingAnimation: Player is undefined, skipping animation"
      );
      return;
    }

    if (!this.player.anims) {
      console.warn(
        "playWalkingAnimation: Player animations are undefined, skipping animation"
      );
      return;
    }

    const dirMap = {
      [Direction.UP]: "up",
      [Direction.DOWN]: "down",
      [Direction.LEFT]: "left",
      [Direction.RIGHT]: "right",
    };

    const dir = dirMap[direction];
    if (dir) {
      // Use the assigned sprite for animations
      const animKey = `${this.assignedSprite}_walk_${dir}`;
      this.player.anims.play(animKey, true);
    }
  }

  // Add method to play idle animation based on direction
  private playIdleAnimation(direction: Direction) {
    if (!this.player) {
      console.warn(
        "playIdleAnimation: Player is undefined, skipping animation"
      );
      return;
    }

    if (!this.player.anims) {
      console.warn(
        "playIdleAnimation: Player animations are undefined, skipping animation"
      );
      return;
    }

    const dirMap = {
      [Direction.UP]: "up",
      [Direction.DOWN]: "down",
      [Direction.LEFT]: "left",
      [Direction.RIGHT]: "right",
    };

    const dir = dirMap[direction];
    if (dir) {
      // Use the assigned sprite for animations
      const animKey = `${this.assignedSprite}_idle_${dir}`;
      this.player.anims.play(animKey, true);
    }
  }

  update(): void {
    if (!this.gridEngineReady) {
      return;
    }

    // Handle player movement
    this.handleMovement();

    // Debug: Log player position every few frames
    if (this.gridEngine && this.player) {
      const playerPosition = this.gridEngine.getPosition("player");
      if (playerPosition && (playerPosition.y <= 2 || playerPosition.y >= 58)) {
        console.log(
          "🌍 DEBUG: Player position:",
          playerPosition,
          "isTransitioning:",
          this.isTransitioning
        );
      }
    }

    // Check for scene transition
    this.checkForSceneTransition();

    // Check for adjacent players for chat
    this.checkAdjacentPlayers();
  }

  // Add cleanup method to prevent memory leaks
  shutdown(): void {
    console.log("WorldScene shutdown called");

    // Clean up player reference
    this.player = null;

    console.log("WorldScene cleanup completed");
  }

  private handleMovement(): void {
    if (
      !this.gridEngine ||
      !this.gridEngineReady ||
      !this.cursors ||
      !this.wasdKeys
    ) {
      console.log("Movement blocked - missing dependencies:", {
        gridEngine: !!this.gridEngine,
        gridEngineReady: this.gridEngineReady,
        cursors: !!this.cursors,
        wasdKeys: !!this.wasdKeys,
      });
      return;
    }

    // Only handle movement if the player is not currently moving
    if (this.gridEngine.isMoving("player")) {
      // Add debugging to see what's happening with the movement state
      const playerPosition = this.gridEngine.getPosition("player");
      const spritePosition = this.player
        ? { x: this.player.x, y: this.player.y }
        : null;
      console.log("Player is already moving, skipping input. State:", {
        gridEnginePosition: playerPosition,
        spritePosition: spritePosition,
        isMoving: this.gridEngine.isMoving("player"),
        spriteVisible: this.player?.visible,
        spriteActive: this.player?.active,
      });
      return;
    }

    let direction: Direction | null = null;

    // Check for input and set direction (only cardinal directions)
    if (this.cursors.left.isDown || this.wasdKeys.left.isDown) {
      direction = Direction.LEFT;
      console.log("Left key pressed");
    } else if (this.cursors.right.isDown || this.wasdKeys.right.isDown) {
      direction = Direction.RIGHT;
      console.log("Right key pressed");
    } else if (this.cursors.up.isDown || this.wasdKeys.up.isDown) {
      direction = Direction.UP;
      console.log("Up key pressed");
    } else if (this.cursors.down.isDown || this.wasdKeys.down.isDown) {
      direction = Direction.DOWN;
      console.log("Down key pressed");
    }

    // Move the player if a direction is pressed
    if (direction) {
      console.log("Attempting to move player:", direction);
      const beforePosition = this.gridEngine.getPosition("player");
      const beforeSpritePosition = this.player
        ? { x: this.player.x, y: this.player.y }
        : null;
      console.log(
        "Position before move:",
        beforePosition,
        "Sprite position:",
        beforeSpritePosition
      );

      // Check if the target position would be valid
      const targetX =
        beforePosition.x +
        (direction === Direction.LEFT
          ? -1
          : direction === Direction.RIGHT
          ? 1
          : 0);
      const targetY =
        beforePosition.y +
        (direction === Direction.UP
          ? -1
          : direction === Direction.DOWN
          ? 1
          : 0);
      console.log("Target position:", { x: targetX, y: targetY });

      // Check if target position is within map bounds
      if (targetX < 0 || targetX >= 60 || targetY < 0 || targetY >= 60) {
        console.log("Movement blocked: Target position is outside map bounds");
        return;
      }

      // Check if target position has collision
      if (this.collisionLayer) {
        const targetTile = this.collisionLayer.getTileAt(targetX, targetY);
        if (targetTile && targetTile.index !== -1) {
          console.log(
            "Movement blocked: Target position has collision tile",
            targetTile.index
          );
          return;
        }
      }

      console.log("Target position is walkable, attempting move");
      this.gridEngine.move("player", direction);
      console.log("Move command sent to GridEngine");

      // Check position after move
      setTimeout(() => {
        const afterPosition = this.gridEngine?.getPosition("player");
        const afterSpritePosition = this.player
          ? { x: this.player.x, y: this.player.y }
          : null;
        const isStillMoving = this.gridEngine?.isMoving("player");
        console.log(
          "Position after move:",
          afterPosition,
          "Sprite position:",
          afterSpritePosition,
          "Still moving:",
          isStillMoving
        );

        // If the sprite moved but GridEngine thinks it's still moving, try to force completion
        if (isStillMoving && beforeSpritePosition && afterSpritePosition) {
          const spriteMoved =
            beforeSpritePosition.x !== afterSpritePosition.x ||
            beforeSpritePosition.y !== afterSpritePosition.y;
          console.log("Sprite moved:", spriteMoved);

          if (spriteMoved) {
            console.log(
              "Sprite moved but GridEngine still thinks it's moving - this might be a bug"
            );
          } else {
            // If sprite didn't move and GridEngine is stuck, try to force completion
            console.log(
              "GridEngine is stuck, trying to force movement completion..."
            );

            // Try to manually set the target position
            if (this.gridEngine && direction) {
              const targetX =
                beforePosition.x +
                (direction === Direction.LEFT
                  ? -1
                  : direction === Direction.RIGHT
                  ? 1
                  : 0);
              const targetY =
                beforePosition.y +
                (direction === Direction.UP
                  ? -1
                  : direction === Direction.DOWN
                  ? 1
                  : 0);

              console.log("Forcing GridEngine to target position:", {
                x: targetX,
                y: targetY,
              });
              this.gridEngine.setPosition("player", { x: targetX, y: targetY });
              this.updateSpritePosition({ x: targetX, y: targetY });
            }
          }
        }
      }, 100);
    }
  }

  private initializeTilemap(): void {
    console.log("Initializing tilemap...");
    try {
      // Create the tilemap
      this.tilemap = this.make.tilemap({ key: "desert_gate" });
      console.log("Tilemap created");

      // Add the tileset
      const tileset = this.tilemap.addTilesetImage("desertgate", "desertgate");
      if (!tileset) {
        throw new Error("Failed to create tileset");
      }
      console.log("Tileset added");

      // Create the main layer
      const groundLayer = this.tilemap.createLayer("ground", tileset, 0, 0);
      if (!groundLayer) {
        throw new Error("Failed to create layer");
      }
      console.log("Layer created");

      // Create the collision layer (update 'collision' to your actual layer name if needed)
      const collisionLayer = this.tilemap.createLayer(
        "collision",
        tileset,
        0,
        0
      );
      if (collisionLayer) {
        // Set collision on all non-empty tiles
        collisionLayer.setCollisionByExclusion([-1]);

        // Add "collides" property to all collision tiles for GridEngine
        collisionLayer.forEachTile((tile) => {
          if (tile.index !== -1) {
            tile.properties = { collides: true };
          }
        });

        this.collisionLayer = collisionLayer;
        console.log("Collision layer configured for GridEngine");
      }

      // Set world bounds to match map size
      this.physics.world.setBounds(
        0,
        0,
        this.tilemap.widthInPixels,
        this.tilemap.heightInPixels
      );
      this.cameras.main.setBounds(
        0,
        0,
        this.tilemap.widthInPixels,
        this.tilemap.heightInPixels
      );
      this.cameras.main.setBackgroundColor("#e2a84b"); // Set to match map background
    } catch (error) {
      console.error("Error in initializeTilemap:", error);
    }
  }

  private initializePlayer(): void {
    console.log("Initializing player...");
    try {
      if (!this.tilemap) {
        console.error("Tilemap not initialized");
        return;
      }

      // Calculate bottom center position
      const mapWidth = this.tilemap.widthInPixels;
      const mapHeight = this.tilemap.heightInPixels;
      const startX = mapWidth / 2;
      const startY = mapHeight - 200; // 200 pixels from bottom

      // Create player sprite with the assigned sprite (default to wizard if not set)
      console.log(`Creating player with sprite: ${this.assignedSprite}`);
      this.player = this.add.sprite(startX, startY, this.assignedSprite);
      this.player.setOrigin(0.5, 0.5);
      this.player.setScale(1);

      // Set initial idle animation
      this.playIdleAnimation(Direction.DOWN);

      console.log("Player sprite created at:", {
        x: this.player.x,
        y: this.player.y,
        sprite: this.assignedSprite,
      });

      // Set up camera to follow player
      this.cameras.main.startFollow(this.player, true);
      this.cameras.main.setFollowOffset(0, 0);
      this.cameras.main.setZoom(1);
    } catch (error) {
      console.error("Error in initializePlayer:", error);
    }
  }

  // MULTIPLAYER METHODS

  setupSocketHandlers() {
    if (!this.socket) return;

    // Use common socket handlers
    setupCommonSocketHandlers(this, this.socket);

    // Add any WorldScene-specific socket handlers
    this.socket.on("roomCreated", (data) => {
      console.log("Room created:", data);
      this.roomId = data.roomId;
      this.events.emit("roomCodeUpdated", data.roomId);
    });

    this.socket.on("roomJoined", (data) => {
      console.log("Room joined:", data);
      this.roomId = data.roomId;
      this.events.emit("roomCodeUpdated", data.roomId);
    });

    // Add any other WorldScene-specific handlers
  }

  createOrJoinRoom(username: string) {
    console.log("createOrJoinRoom called with username:", username);
    if (!this.socket) {
      console.warn("Socket not available for room creation");
      return;
    }
    console.log("Emitting createOrJoinRoom event");
    this.socket.emit("createOrJoinRoom", { username });
  }

  joinRoom(roomId: string, username: string) {
    console.log("joinRoom called with roomId:", roomId, "username:", username);
    if (!this.socket) {
      console.warn("Socket not available for room joining");
      return;
    }
    console.log("Emitting joinRoom event");
    this.socket.emit("joinRoom", { roomId, username });
  }

  addRemotePlayer(
    playerId: string,
    playerData: { username: string },
    initialPosition?: { x: number; y: number },
    sprite?: string // Add sprite parameter
  ) {
    if (!this.player || !this.gridEngine) return;

    // Check if player already exists
    if (this.remotePlayers.has(playerId)) {
      console.log("Player already exists, skipping creation:", playerId);
      return;
    }

    console.log(
      "Adding remote player:",
      playerId,
      playerData,
      "initial position:",
      initialPosition,
      "sprite:",
      sprite
    );

    // Use provided position or default to player's position
    const startPos = initialPosition || { x: 5, y: 5 };

    // Validate position
    if (
      startPos.x < 0 ||
      startPos.y < 0 ||
      startPos.x > 50 ||
      startPos.y > 50
    ) {
      console.warn("Invalid initial position:", startPos, "using default");
      startPos.x = 5;
      startPos.y = 5;
    }

    const worldX = Math.round(startPos.x * 32 + 16);
    const worldY = Math.round(startPos.y * 32 + 16);

    // Use the provided sprite or default to wizard
    const playerSprite = sprite || "wizard";

    // Create remote player sprite
    const remotePlayer = this.add.sprite(worldX, worldY, playerSprite);
    remotePlayer.setScale(1);
    remotePlayer.setOrigin(0.5, 0.5);

    // Set initial idle animation
    remotePlayer.anims.play(`${playerSprite}_idle_down`, true);

    this.remotePlayers.set(playerId, remotePlayer);

    // Add remote player to GridEngine with a unique character ID
    const remoteCharId = `remote_${playerId}`;
    if (!this.gridEngine.hasCharacter(remoteCharId)) {
      console.log(
        "Adding remote player to GridEngine:",
        remoteCharId,
        "at position:",
        startPos,
        "with sprite:",
        playerSprite
      );
      this.gridEngine.addCharacter({
        id: remoteCharId,
        sprite: remotePlayer,
        startPosition: startPos,
        facingDirection: "down" as Direction,
        speed: 4,
      });
    } else {
      console.log("Remote player already exists in GridEngine:", remoteCharId);
    }
  }

  removeRemotePlayer(playerId: string) {
    console.log("Removing remote player:", playerId);

    const remotePlayer = this.remotePlayers.get(playerId);
    if (remotePlayer) {
      // Remove from GridEngine first
      const remoteCharId = `remote_${playerId}`;
      if (this.gridEngine && this.gridEngine.hasCharacter(remoteCharId)) {
        console.log("Removing from GridEngine:", remoteCharId);
        this.gridEngine.removeCharacter(remoteCharId);
      }

      // Destroy the sprite
      remotePlayer.destroy();
      this.remotePlayers.delete(playerId);

      console.log("Remote player removed successfully:", playerId);
    } else {
      console.warn("Remote player not found for removal:", playerId);
    }
  }

  checkAdjacentPlayers() {
    checkAdjacentPlayersUtil(this, this.gridEngine, this.playerId);
  }

  sendChatMessage(message: string) {
    // Use the chat service to send the message
    chatService.sendMessage(message);
  }

  private initializeGridEngine(): void {
    if (!this.tilemap || !this.player) {
      console.error("Cannot initialize GridEngine: tilemap or player is null");
      return;
    }

    try {
      console.log("Initializing GridEngine...");

      // Create the grid engine configuration
      const gridEngineConfig: GridEngineConfig = {
        characters: [
          {
            id: "player",
            sprite: this.player,
            startPosition: {
              x: Math.floor(this.player.x / 32), // Convert pixel position to tile position
              y: Math.floor(this.player.y / 32),
            },
            facingDirection: "down" as Direction,
            speed: 4,
            walkingAnimationMapping: {
              up: {
                leftFoot: 0,
                standing: 0,
                rightFoot: 0,
              },
              down: {
                leftFoot: 0,
                standing: 0,
                rightFoot: 0,
              },
              left: {
                leftFoot: 0,
                standing: 0,
                rightFoot: 0,
              },
              right: {
                leftFoot: 0,
                standing: 0,
                rightFoot: 0,
              },
            },
          },
        ],
        collisionTilePropertyName: "collides",
      };

      // Skip the problematic plugin system and create GridEngine manually
      console.log("Creating GridEngine manually...");
      try {
        const manualGridEngine = new GridEngine(this);
        console.log("Manual GridEngine created:", manualGridEngine);

        if (this.tilemap) {
          manualGridEngine.create(this.tilemap, gridEngineConfig);
          console.log("Manual GridEngine initialized successfully");

          this.gridEngine = manualGridEngine as unknown as GridEngineInterface;
          this.gridEngineReady = true;

          // Update sprite position to match GridEngine's initial position
          const initialPosition = this.gridEngine.getPosition("player");
          if (initialPosition) {
            this.updateSpritePosition(initialPosition);
          }

          this.setupGridEngineListeners();
        } else {
          console.error("Tilemap is null, cannot initialize manual GridEngine");
        }
      } catch (manualError) {
        console.error("Failed to create manual GridEngine:", manualError);
        console.error(
          "Manual error details:",
          manualError instanceof Error ? manualError.message : manualError
        );
        console.error(
          "Manual error stack:",
          manualError instanceof Error ? manualError.stack : "No stack trace"
        );
      }
    } catch (error) {
      console.error("Error initializing GridEngine:", error);
      console.error(
        "Error details:",
        error instanceof Error ? error.message : error
      );
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
    }
  }

  handlePlayerJoined(playerId: string, playerData: { username: string }) {
    console.log("Player joined:", playerId, playerData);

    // Get our current position to set as initial position for the new player
    let initialPosition = { x: 5, y: 5 }; // Default
    if (this.player && this.gridEngine) {
      const currentPos = this.gridEngine.getPosition("player");
      if (currentPos) {
        initialPosition = currentPos;
      }
    }

    // Add remote player with our current position as initial
    this.addRemotePlayer(playerId, playerData, initialPosition);

    // Send our current position to the new player
    if (this.player && this.gridEngine) {
      const currentPos = this.gridEngine.getPosition("player");
      console.log("Sending position to new player:", currentPos);
      this.socket?.emit("playerPosition", {
        playerId: this.socket.id,
        position: currentPos,
        facingDirection: this.gridEngine.getFacingDirection("player"),
      });
    }
  }

  handlePlayerPosition(
    playerId: string,
    position: { x: number; y: number },
    facingDirection: string
  ) {
    console.log(
      "🌍 Received position from player:",
      playerId,
      position,
      facingDirection
    );

    const remoteCharId = `remote_${playerId}`;
    const remotePlayer = this.remotePlayers.get(playerId);

    // If we don't have the remote player yet, create them
    if (!remotePlayer) {
      console.log("🌍 Remote player not found, creating them:", playerId);
      this.handlePlayerJoined(playerId, {
        username: `Player${playerId.slice(-4)}`,
      });
      // Wait a frame for the player to be created, then update position
      this.time.delayedCall(100, () => {
        this.handlePlayerPosition(playerId, position, facingDirection);
      });
      return;
    }

    if (this.gridEngine && this.gridEngine.hasCharacter(remoteCharId)) {
      // Validate position is within reasonable bounds
      if (
        position.x < 0 ||
        position.y < 0 ||
        position.x > 50 ||
        position.y > 50
      ) {
        console.warn(
          "🌍 Invalid position received:",
          position,
          "for player:",
          playerId
        );
        return;
      }

      // Update position in GridEngine
      this.gridEngine.setPosition(remoteCharId, position);

      // Calculate world position from tile position with precise centering
      const worldX = Math.round(position.x * 32 + 16);
      const worldY = Math.round(position.y * 32 + 16);
      remotePlayer.setPosition(worldX, worldY);

      // Update facing direction and animation
      this.gridEngine.turnTowards(remoteCharId, toDirection(facingDirection));
      this.updateRemotePlayerAnimation(
        remoteCharId,
        toDirection(facingDirection),
        this.assignedSprite
      );

      console.log(
        "🌍 Updated remote player position:",
        remoteCharId,
        position,
        { x: worldX, y: worldY }
      );
    } else {
      console.warn(
        "🌍 GridEngine or remote character not found for player:",
        playerId
      );
    }
  }

  updateRemotePlayerAnimation(
    charId: string,
    direction: Direction,
    sprite?: string
  ) {
    const remotePlayerId = charId.replace("remote_", "");
    const remotePlayer = this.remotePlayers.get(remotePlayerId);
    if (!remotePlayer) {
      console.warn(
        "🌍 updateRemotePlayerAnimation: Remote player not found for charId:",
        charId
      );
      return;
    }

    if (!remotePlayer.anims) {
      console.warn(
        "🌍 updateRemotePlayerAnimation: Remote player has no animations:",
        charId
      );
      return;
    }

    // Get the sprite name for this remote player
    // If not provided, try to get it from the player data in the game room
    const playerSprite = sprite || "wizard";

    // Create animation map based on the sprite
    const animMap = {
      up: `${playerSprite}_idle_up`,
      down: `${playerSprite}_idle_down`,
      left: `${playerSprite}_idle_left`,
      right: `${playerSprite}_idle_right`,
    };

    const animName = animMap[direction];
    if (animName) {
      try {
        remotePlayer.anims.play(animName, true);
      } catch (error) {
        console.error("🌍 Error playing animation:", error);
      }
    }
  }

  checkForSceneTransition() {
    // This will be implemented by setupSceneTransitions
    // but we need to declare it for TypeScript
  }
}
