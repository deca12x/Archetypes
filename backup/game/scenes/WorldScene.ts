import { Scene, GameObjects, Tilemaps } from "phaser";
import { Socket } from "socket.io-client";
import { Player } from "@/lib/socket/socketServer";
import {
  Sprites,
  Layers,
  Tilesets,
  Maps,
} from "@/lib/game/constants/assets";
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
import { useChatStore } from "@/lib/game/stores/chat";

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
  public tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasdKeys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  } | null = null;
  private collisionObjects: Phaser.GameObjects.Rectangle[] | null = null;
  private moveSpeed: number = 350;
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  public username: string = "Player";
  public playerId: string = "";
  private socket: Socket | null = null;
  private mapKey: string = "desert_gate";
  private daylightOverlay: Phaser.GameObjects.Graphics | null = null;
  public gridEngine: GridEngineInterface | null = null;
  private roomId: string = "";
  private isTransitioning: boolean = false;
  private roomCodeText: Phaser.GameObjects.Text | null = null;
  private remotePlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private chatGroupId: string = "";
  private adjacentPlayers: Set<string> = new Set();
  public map: Maps = Maps.DESERT_GATE;
  private _lastAdjacentCheck: number = 0;

  constructor() {
    super({ key: "WorldScene" });
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

  preload() {
    // Load tileset
    this.load.image(Tilesets.DESERT_GATE, `assets/tilesets/${Tilesets.DESERT_GATE}.png`);
    
    // Load map
    this.load.tilemapTiledJSON(this.mapKey, `assets/maps/${this.mapKey}.json`);
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
        console.error('Input system not available in WorldScene');
      }

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

      // Initialize multiplayer
      this.initializeMultiplayer();
    } catch (error) {
      console.error("Error in create method:", error);
    }
  }

  private initializeTilemap(): void {
    console.log("Initializing tilemap...");
    try {
      // Create the tilemap
      this.tilemap = this.make.tilemap({ key: this.mapKey });
      console.log("Tilemap created");

      // Add the tileset
      const tileset = this.tilemap?.addTilesetImage(Tilesets.DESERT_GATE, Tilesets.DESERT_GATE);
      if (!tileset) {
        throw new Error("Failed to create tileset");
      }
      console.log("Tileset added");

      // Create the main layer
      const groundLayer = this.tilemap?.createLayer("ground", tileset, 0, 0);
      if (!groundLayer) {
        throw new Error("Failed to create layer");
      }
      console.log("Layer created");

      // Create the collision layer
      const collisionLayer = this.tilemap?.createLayer("collision", tileset, 0, 0);
      if (collisionLayer) {
        collisionLayer.setCollisionByExclusion([-1]);
        this.collisionLayer = collisionLayer;
      }

      // Set world bounds to match map size
      if (this.tilemap) {
        this.physics.world.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
        this.cameras.main.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
      }
      this.cameras.main.setBackgroundColor("#e2a84b");
    } catch (error) {
      console.error("Error in initializeTilemap:", error);
    }
  }

  private initializePlayer(): void {
    console.log("Initializing player...");
    try {
      if (!this.tilemap) {
        console.error('Tilemap not initialized');
        return;
      }

      // Calculate bottom center position
      const mapWidth = this.tilemap.widthInPixels;
      const mapHeight = this.tilemap.heightInPixels;
      const startX = mapWidth / 2;
      const startY = mapHeight - 200; // 200 pixels from bottom

      // Create player sprite
      this.player = this.physics.add.sprite(startX, startY, "rogue");
      console.log("Player sprite created:", this.player);

      if (!this.player) {
        console.error('Failed to create player sprite');
        return;
      }

      // Set player properties
      this.player.setScale(1);
      this.player.setCollideWorldBounds(true);
      this.player.setBounce(0.1);
      this.player.setDamping(true);
      this.player.setDrag(0.95);
      this.player.setMaxVelocity(200);

      // Add collider with collision layer
      if (this.collisionLayer) {
        this.physics.add.collider(this.player, this.collisionLayer);
      }

      // Set up camera to follow player
      this.cameras.main.startFollow(this.player, true);
      this.cameras.main.setFollowOffset(0, 0);
      this.cameras.main.setZoom(1);

      // Set initial animation
      if (this.player.anims) {
        this.player.anims.play("rogue_idle_down", true);
      }
    } catch (error) {
      console.error("Error in initializePlayer:", error);
    }
  }

  private handleMovement(): void {
    if (!this.player || !this.cursors || !this.wasdKeys) return;
    this.player.setVelocity(0);
    let velocityX = 0;
    let velocityY = 0;
    if (this.cursors.left.isDown || this.wasdKeys.left.isDown) {
      velocityX = -this.moveSpeed;
    } else if (this.cursors.right.isDown || this.wasdKeys.right.isDown) {
      velocityX = this.moveSpeed;
    }
    if (this.cursors.up.isDown || this.wasdKeys.up.isDown) {
      velocityY = -this.moveSpeed;
    } else if (this.cursors.down.isDown || this.wasdKeys.down.isDown) {
      velocityY = this.moveSpeed;
    }
    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      const norm = Math.sqrt(2) / 2;
      velocityX *= norm;
      velocityY *= norm;
    }
    this.player.setVelocity(velocityX, velocityY);
    // Play appropriate animation
    if (velocityX < 0) {
      this.player.anims.play("rogue_walk_left", true);
    } else if (velocityX > 0) {
      this.player.anims.play("rogue_walk_right", true);
    } else if (velocityY < 0) {
      this.player.anims.play("rogue_walk_up", true);
    } else if (velocityY > 0) {
      this.player.anims.play("rogue_walk_down", true);
    } else {
      this.player.anims.play("rogue_idle_down", true);
    }
  }

  update(): void {
    if (this.player) {
      this.handleMovement();
      // Check if player touches the top border
      if (this.player.y - this.player.height / 2 <= 0) {
        // Only switch scene if not already switching
        if (!this.isTransitioning) {
          this.isTransitioning = true;
          // Don't stop music, just start next scene
          this.scene.start('Scene3');
        }
      }
    }
  }

  private setupGridEngineListeners(): void {
    if (!this.gridEngine) return;
    
    // Listen for movement started
    this.gridEngine
      .movementStarted()
      .subscribe(({ charId, direction }: MovementEvent) => {
        if (charId === "player") {
          const position = this.gridEngine?.getPosition("player");
          if (position) {
            this.updatePlayerMovement(position.x, position.y, direction);
          }
        }
      });

    // Listen for movement stopped
    this.gridEngine
      .movementStopped()
      .subscribe(({ charId, direction }: MovementEvent) => {
        if (charId === "player") {
          const position = this.gridEngine?.getPosition("player");
          if (position) {
            this.updatePlayerMovement(position.x, position.y, direction);
          }
        }
      });

    // Listen for direction changes
    this.gridEngine
      .directionChanged()
      .subscribe(({ charId, direction }: MovementEvent) => {
        if (charId === "player") {
          const position = this.gridEngine?.getPosition("player");
          if (position) {
            this.updatePlayerMovement(position.x, position.y, direction);
          }
        }
      });
  }

  private updatePlayerMovement(x: number, y: number, direction: Direction): void {
    if (this.socket) {
      this.socket.emit("playerMovement", {
        x,
        y,
        direction,
      });
    }
  }

  private checkAdjacentPlayers(): void {
    if (!this.gridEngine || !this.player) return;

    const now = Date.now();
    if (now - this._lastAdjacentCheck < 1000) return; // Check every second
    this._lastAdjacentCheck = now;

    const playerPosition = this.gridEngine.getPosition("player");
    const previousAdjacentPlayers = new Set(this.adjacentPlayers);
    this.adjacentPlayers.clear();

    // Check each remote player
    for (const [playerId, remotePlayer] of this.remotePlayers) {
      const remoteCharId = `remote_${playerId}`;
      if (this.gridEngine.hasCharacter(remoteCharId)) {
        const remotePosition = this.gridEngine.getPosition(remoteCharId);
        const dx = Math.abs(playerPosition.x - remotePosition.x);
        const dy = Math.abs(playerPosition.y - remotePosition.y);

        if (dx + dy <= 1) {
          // This player is adjacent, add to our set
          this.adjacentPlayers.add(playerId);
        }
      }
    }

    // Check if adjacency changed
    let adjacencyChanged = false;
    if (this.adjacentPlayers.size !== previousAdjacentPlayers.size) {
      adjacencyChanged = true;
    } else {
      // Check if any player was added
      for (const playerId of this.adjacentPlayers) {
        if (!previousAdjacentPlayers.has(playerId)) {
          adjacencyChanged = true;
          break;
        }
      }
    }

    if (adjacencyChanged) {
      const chatStore = useChatStore.getState();
      if (this.adjacentPlayers.size > 0) {
        // Create a unique group ID for these players
        const playerIds = [
          this.playerId,
          ...Array.from(this.adjacentPlayers),
        ].sort();
        const newGroupId = playerIds.join("-");

        // Only update if group changed
        if (newGroupId !== this.chatGroupId) {
          this.chatGroupId = newGroupId;
          chatStore.setProximityMode(true);
          chatStore.setActiveGroupId(newGroupId);
          console.log("Joined proximity chat with players:", Array.from(this.adjacentPlayers));
        }
      } else {
        // No adjacent players, leave proximity chat
        chatStore.setProximityMode(false);
        chatStore.setActiveGroupId(null);
        this.chatGroupId = "";

        console.log("Left proximity chat - no adjacent players");
      }
    }
  }

  public sendChatMessage(message: string): void {
    if (this.socket && this.chatGroupId) {
      this.socket.emit("chatMessage", {
        message,
        groupId: this.chatGroupId,
      });
    }
  }

  private initializeMultiplayer(): void {
    if (this.socket) {
      this.username = "Player" + Math.floor(Math.random() * 1000);

      if (typeof window !== "undefined") {
        const gameAction = (window as any).__gameAction;
        const roomCode = (window as any).__roomCode;

        if (gameAction === "join" && roomCode) {
          // Join existing room
          this.joinRoom(roomCode, this.username);
        } else {
          // Create new room
          this.createOrJoinRoom(this.username);
        }
      } else {
        // Default to creating a room
        this.createOrJoinRoom(this.username);
      }
    }
  }

  private createOrJoinRoom(username: string): void {
    if (this.socket) {
      this.socket.emit("createRoom", { username });
    }
  }

  private joinRoom(roomId: string, username: string): void {
    if (this.socket) {
      this.socket.emit("joinRoom", { roomId, username });
      // Update the room code text immediately (will be confirmed when we get the roomJoined event)
      if (this.roomCodeText) {
        this.roomCodeText.setText(`Room: ${roomId}`);
      }
    }
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    // Handle room joined event
    this.socket.on("roomJoined", ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      this.roomId = roomId;
      this.playerId = playerId;
      if (this.roomCodeText) {
        this.roomCodeText.setText(`Room: ${roomId}`);
      }
    });

    // Handle player joined event
    this.socket.on("playerJoined", ({ playerId, playerData }: { playerId: string; playerData: Player }) => {
      this.addRemotePlayer(playerId, playerData);
    });

    // Handle player left event
    this.socket.on("playerLeft", ({ playerId }: { playerId: string }) => {
      this.removeRemotePlayer(playerId);
    });

    // Handle player movement event
    this.socket.on("playerMovement", ({ playerId, movement }: { playerId: string; movement: PlayerMovement }) => {
      this.updateRemotePlayerPosition(playerId, movement);
    });

    // Handle chat messages
    this.socket.on("chatMessageReceived", (message: any) => {
      if (!this.chatGroupId) return;

      const ourGroupIds = this.chatGroupId.split("-").sort();
      const messageGroupIds = message.groupId.split("-").sort();

      const playerOverlap = ourGroupIds.some((id) => messageGroupIds.includes(id));

      if (playerOverlap) {
        useChatStore.getState().addMessage(message);
      }
    });

    // Handle room errors
    this.socket.on("roomError", ({ message }: { message: string }) => {
      console.error(`Room error: ${message}`);
      if (this.roomCodeText) {
        this.roomCodeText.setText(`Error: ${message}`);
      }
    });
  }

  private addRemotePlayer(playerId: string, playerData: Player): void {
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
    if (this.gridEngine) {
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
  }

  private updateRemotePlayerPosition(playerId: string, movement: PlayerMovement): void {
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
    if (this.gridEngine) {
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
  }

  private removeRemotePlayer(playerId: string): void {
    // Remove sprite
    const remotePlayer = this.remotePlayers.get(playerId);
    if (remotePlayer) {
      remotePlayer.destroy();
    }

    // Remove from map
    this.remotePlayers.delete(playerId);

    // Try to remove from grid engine if it exists
    if (this.gridEngine) {
      try {
        const remoteCharId = `remote_${playerId}`;
        if (this.gridEngine.hasCharacter(remoteCharId)) {
          this.gridEngine.removeCharacter(remoteCharId);
        }
      } catch (error) {
        console.error("Error removing remote player from grid engine:", error);
      }
    }
  }
}