import { Scene, GameObjects, Tilemaps } from "phaser";
import { Socket } from "socket.io-client";
import { Player } from "@/lib/socket/socketServer";
import {
  Sprites,
  Layers,
  Tilesets,
  Maps,
  PLAYABLE_CHARACTERS
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
  // Original properties
  gridEngine!: GridEngineInterface;
  player!: GameObjects.Sprite;
  speed: number = 10;
  tilemap!: Tilemaps.Tilemap;
  map: Maps = Maps.PALLET_TOWN;
  daylightOverlay!: GameObjects.Graphics;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  enterKey!: Phaser.Input.Keyboard.Key;
  xKey!: Phaser.Input.Keyboard.Key;
  attackText!: Phaser.GameObjects.Text;

  // Socket.io properties
  private socket: Socket | null = null;
  private playerId: string | null = null;
  private roomId: string | null = null;
  private remotePlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private roomCodeText!: Phaser.GameObjects.Text;

  private currentCharacter: typeof PLAYABLE_CHARACTERS[number] = PLAYABLE_CHARACTERS[0];
  private uiScene!: Scene;
  private pKey!: Phaser.Input.Keyboard.Key;
  private cloudSprite!: Phaser.GameObjects.Sprite;
  private isSwapping: boolean = false;

  constructor() {
    super("WorldScene");
  }

  init(data: any) {
    // Get socket from data passed from BootScene
    this.socket = data.socket;

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
    this.initializePlayer();
    this.initializeTilemap();
    this.initializeCamera();
    this.initializeGrid();
    this.listenKeyboardControl();

    // Initialize attack text (initially hidden)
    this.attackText = this.add.text(0, 0, "ATTACK!", {
      fontSize: '24px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.attackText.setVisible(false);
    this.attackText.setDepth(1000);

    // Add room code display for multiplayer
    this.roomCodeText = this.add
      .text(16, 16, "Room: Connecting...", {
        fontSize: "18px",
        padding: { x: 10, y: 5 },
        backgroundColor: "#000000",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(1000);

    // Initialize cloud sprite (initially hidden)
    this.cloudSprite = this.add.sprite(0, 0, Sprites.CLOUD);
    this.cloudSprite.setVisible(false);
    this.cloudSprite.setDepth(999);
    this.cloudSprite.setScale(1.5);
    this.cloudSprite.setOrigin(0.5, 0.5);

    // Wait for UI scene to be ready
    this.time.delayedCall(100, () => {
      this.uiScene = this.scene.get('UIScene');
      if (this.uiScene) {
        // Listen for character change events
        this.uiScene.events.on('characterChanged', this.handleCharacterChange, this);
        // Set initial character to first in the array
        this.currentCharacter = PLAYABLE_CHARACTERS[0];
        this.player.setTexture(PLAYABLE_CHARACTERS[0]);
        console.log('WorldScene: Initial character set to:', PLAYABLE_CHARACTERS[0]);
      }
    });

    // Fix positionChangeFinished subscription and add socket event
    // @ts-ignore - We need to ignore this since the types are not correctly exported
    this.gridEngine.positionChangeFinished().subscribe((observer: any) => {
      if (observer.charId === Sprites.PLAYER) {
        savePlayerPosition(this);

        // Send position update to other players when movement finishes
        const position = this.gridEngine.getPosition(Sprites.PLAYER);
        const direction = this.gridEngine.getFacingDirection(Sprites.PLAYER);
        this.updatePlayerMovement(position.x, position.y, direction);
      }
    });

    // Set up GridEngine movement started/stopped events for multiplayer
    this.setupGridEngineListeners();

    // Join or create room based on stored action
    this.initializeMultiplayer();
  }

  initializeMultiplayer() {
    if (this.socket) {
      const username = "Player" + Math.floor(Math.random() * 1000);
      const sprite = PLAYABLE_CHARACTERS[0];

      if (typeof window !== "undefined") {
        const gameAction = (window as any).__gameAction;
        const roomCode = (window as any).__roomCode;

        if (gameAction === "join" && roomCode) {
          // Join existing room
          this.joinRoom(roomCode, username, sprite);
        } else {
          // Create new room
          this.createOrJoinRoom(username, sprite);
        }
      } else {
        // Default to creating a room
        this.createOrJoinRoom(username, sprite);
      }
    }
  }

  setupGridEngineListeners() {
    // Listen for movement started
    this.gridEngine
      .movementStarted()
      .subscribe(({ charId, direction }: MovementEvent) => {
        if (charId === Sprites.PLAYER) {
          const position = this.gridEngine.getPosition(Sprites.PLAYER);
          this.updatePlayerMovement(position.x, position.y, direction);
        }
      });

    // Listen for movement stopped
    this.gridEngine
      .movementStopped()
      .subscribe(({ charId, direction }: MovementEvent) => {
        if (charId === Sprites.PLAYER) {
          const position = this.gridEngine.getPosition(Sprites.PLAYER);
          this.updatePlayerMovement(position.x, position.y, direction);
        }
      });

    // Listen for direction changes
    this.gridEngine
      .directionChanged()
      .subscribe(({ charId, direction }: MovementEvent) => {
        if (charId === Sprites.PLAYER) {
          const position = this.gridEngine.getPosition(Sprites.PLAYER);
          this.updatePlayerMovement(position.x, position.y, direction);
        }
      });
  }

  update(time: number): void {
    // If UI is open, don't allow player movement
    if (isUIOpen()) {
      return;
    }

    this.listenMoves();

    // Check for attack input
    if (Phaser.Input.Keyboard.JustDown(this.xKey)) {
      this.showAttackMessage();
    }

    // Check for character swap input
    if (Phaser.Input.Keyboard.JustDown(this.pKey) && !this.isSwapping) {
      this.startCharacterSwap();
    }
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
          this.gridEngine.move(Sprites.PLAYER, "left");
        } else if (
          (cursors.right?.isDown || keys?.D?.isDown) &&
          keys?.D != null
        ) {
          this.gridEngine.move(Sprites.PLAYER, "right");
        } else if ((cursors.up?.isDown || keys?.W?.isDown) && keys?.W != null) {
          this.gridEngine.move(Sprites.PLAYER, "up");
        } else if (
          (cursors.down?.isDown || keys?.S?.isDown) &&
          keys?.S != null
        ) {
          this.gridEngine.move(Sprites.PLAYER, "down");
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
    this.cursors = this.input?.keyboard?.createCursorKeys() as Phaser.Types.Input.Keyboard.CursorKeys;
    this.enterKey = this.input?.keyboard?.addKey("ENTER") as Phaser.Input.Keyboard.Key;
    this.xKey = this.input?.keyboard?.addKey("X") as Phaser.Input.Keyboard.Key;
    this.pKey = this.input?.keyboard?.addKey("P") as Phaser.Input.Keyboard.Key;

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
    this.cameras.main.setZoom(1);
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

  // MULTIPLAYER METHODS

  setupSocketHandlers() {
    if (!this.socket) return;

    // Handle room creation response
    this.socket.on(
      "roomCreated",
      ({ roomId, playerId }: { roomId: string; playerId: string }) => {
        this.roomId = roomId;
        this.playerId = playerId;
        // Update the room code text
        this.roomCodeText.setText(`Room: ${roomId}`);
        console.log(`Joined room ${roomId} as player ${playerId}`);
      }
    );

    // Handle when other players join
    this.socket.on(
      "playerJoined",
      ({ playerId, player }: { playerId: string; player: Player }) => {
        if (playerId !== this.playerId) {
          this.addRemotePlayer(playerId, player);
        }
      }
    );

    // Handle player movement updates
    this.socket.on(
      "playerMoved",
      ({
        playerId,
        movement,
      }: {
        playerId: string;
        movement: PlayerMovement;
      }) => {
        if (playerId !== this.playerId && this.remotePlayers.has(playerId)) {
          this.updateRemotePlayerPosition(playerId, movement);
        }
      }
    );

    // Handle players leaving
    this.socket.on("playerLeft", ({ playerId }: { playerId: string }) => {
      if (this.remotePlayers.has(playerId)) {
        this.removeRemotePlayer(playerId);
      }
    });

    // Add handler for when we join a room successfully
    this.socket.on(
      "roomJoined",
      ({
        roomId,
        playerId,
        players,
      }: {
        roomId: string;
        playerId: string;
        players: Record<string, Player>;
      }) => {
        this.roomId = roomId;
        this.playerId = playerId;
        // Update the room code text
        this.roomCodeText.setText(`Room: ${roomId}`);
        console.log(`Joined room ${roomId} as player ${playerId}`);

        // Create sprites for existing players
        Object.entries(players).forEach(([id, playerData]) => {
          if (id !== playerId) {
            this.addRemotePlayer(id, playerData);
          }
        });
      }
    );

    // Add handler for room not found errors
    this.socket.on("roomError", ({ message }: { message: string }) => {
      console.error(`Room error: ${message}`);
      this.roomCodeText.setText(`Error: ${message}`);
    });
  }

  // Method to create/join a room
  createOrJoinRoom(username: string, sprite: string) {
    if (this.socket) {
      this.socket.emit("createRoom", { username, sprite });
    }
  }

  // Method to join an existing room
  joinRoom(roomId: string, username: string, sprite: string) {
    if (this.socket) {
      this.socket.emit("joinRoom", { roomId, username, sprite });
      // Update the room code text immediately (will be confirmed when we get the roomJoined event)
      this.roomCodeText.setText(`Room: ${roomId}`);
    }
  }

  // Add methods for handling remote players
  addRemotePlayer(playerId: string, playerData: Player) {
    // Create sprite for remote player
    const remotePlayer = this.add.sprite(
      playerData.x * 32,
      playerData.y * 32,
      playerData.sprite
    );
    remotePlayer.setDepth(1);

    // Add to remotePlayers map
    this.remotePlayers.set(playerId, remotePlayer);

    // If grid engine is initialized, add remote player to grid engine
    try {
      const remoteCharId = `remote_${playerId}`;

      if (!this.gridEngine.hasCharacter(remoteCharId)) {
        this.gridEngine.addCharacter({
          id: remoteCharId,
          sprite: remotePlayer,
          startPosition: { x: playerData.x, y: playerData.y },
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
          facingDirection: playerData.direction as Direction,
        });
      }
    } catch (error) {
      console.error("Error adding remote player to grid engine:", error);
    }
  }

  updateRemotePlayerPosition(playerId: string, movement: PlayerMovement) {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (!remotePlayer) return;

    // Get previous position to determine if the player is moving
    const currentX = remotePlayer.x / 32;
    const currentY = remotePlayer.y / 32;
    const isMoving = currentX !== movement.x || currentY !== movement.y;

    // Update sprite position
    remotePlayer.x = movement.x * 32;
    remotePlayer.y = movement.y * 32;

    // Try to update grid engine position if it exists
    try {
      const remoteCharId = `remote_${playerId}`;
      if (this.gridEngine.hasCharacter(remoteCharId)) {
        this.gridEngine.setPosition(remoteCharId, {
          x: movement.x,
          y: movement.y,
        });
        this.gridEngine.turnTowards(
          remoteCharId,
          movement.direction as Direction
        );
      }
    } catch (error) {
      console.error("Error updating remote player in grid engine:", error);
    }
  }

  removeRemotePlayer(playerId: string) {
    // Remove sprite
    const remotePlayer = this.remotePlayers.get(playerId);
    if (remotePlayer) {
      remotePlayer.destroy();
    }

    // Remove from map
    this.remotePlayers.delete(playerId);

    // Try to remove from grid engine if it exists
    try {
      const remoteCharId = `remote_${playerId}`;
      if (this.gridEngine.hasCharacter(remoteCharId)) {
        this.gridEngine.removeCharacter(remoteCharId);
      }
    } catch (error) {
      console.error("Error removing remote player from grid engine:", error);
    }
  }

  // Update movement method to emit position changes
  updatePlayerMovement(x: number, y: number, direction: Direction) {
    if (this.socket && this.roomId) {
      this.socket.emit("playerMovement", {
        roomId: this.roomId,
        movement: { x, y, direction },
      });
    }
  }

  private handleCharacterChange(newCharacter: typeof PLAYABLE_CHARACTERS[number]) {
    console.log('WorldScene: Changing character to:', newCharacter);
    
    // Update player sprite
    this.player.setTexture(newCharacter);
    console.log('WorldScene: Player texture updated to:', newCharacter);
    
    // Update current character
    this.currentCharacter = newCharacter;

    // Update grid engine character
    if (this.gridEngine) {
      const position = this.gridEngine.getPosition(Sprites.PLAYER);
      const direction = this.gridEngine.getFacingDirection(Sprites.PLAYER);
      
      // Remove old character
      this.gridEngine.removeCharacter(Sprites.PLAYER);
      
      // Add new character with same position and direction
      this.gridEngine.addCharacter({
        id: Sprites.PLAYER,
        sprite: this.player,
        startPosition: position,
        facingDirection: direction,
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
        speed: this.speed,
      });

      // Ensure the player is visible after the swap
      this.player.setVisible(true);
      console.log('WorldScene: Grid engine updated with new character');
    }
  }

  private startCharacterSwap() {
    if (this.isSwapping) return;

    this.isSwapping = true;
    console.log('WorldScene: Starting character swap, current character:', this.currentCharacter);
    
    // Get the exact position where the player is rendered
    const playerPos = this.getCharacterScreenPosition();
    
    // Position cloud sprite exactly where the player is
    this.cloudSprite.setPosition(playerPos.x, playerPos.y);
    this.cloudSprite.setVisible(true);
    this.cloudSprite.setScale(1.5);
    this.cloudSprite.setOrigin(0.5, 0.5);

    // Hide player during swap
    this.player.setVisible(false);

    // Play cloud animation
    this.cloudSprite.play('cloud_puff');

    // When cloud animation completes, switch character
    this.cloudSprite.once('animationcomplete', () => {
      console.log('WorldScene: Cloud animation complete, switching character');
      
      // Get next character index
      const currentIndex = PLAYABLE_CHARACTERS.indexOf(this.currentCharacter);
      const nextIndex = (currentIndex + 1) % PLAYABLE_CHARACTERS.length;
      const nextCharacter = PLAYABLE_CHARACTERS[nextIndex];
      
      console.log('WorldScene: Switching from', this.currentCharacter, 'to', nextCharacter);
      
      // Update character
      this.handleCharacterChange(nextCharacter);
      
      // Show player
      this.player.setVisible(true);
      this.isSwapping = false;
    });
  }

  private getCharacterScreenPosition() {
    // Get the character's position in the grid
    const position = this.gridEngine.getPosition(Sprites.PLAYER);
    
    // Get the actual screen position of the player sprite
    const playerX = this.player.x;
    const playerY = this.player.y;
    
    return {
      x: playerX,
      y: playerY
    };
  }

  private showAttackMessage() {
    // Get the exact position where the player is rendered
    const playerPos = this.getCharacterScreenPosition();
    
    // Show attack text above the character
    this.attackText.setPosition(playerPos.x, playerPos.y - 20);
    this.attackText.setVisible(true);

    // Hide after 1 second
    this.time.delayedCall(1000, () => {
      this.attackText.setVisible(false);
    });
  }
}
