import { Scene, GameObjects, Tilemaps } from "phaser";
import { Socket } from "socket.io-client";
import { Player } from "@/lib/socket/socketServer";
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
import { useChatStore } from "../../../lib/game/stores/chat";

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
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasdKeys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  } | null = null;
  private collisionObjects: Phaser.GameObjects.Rectangle[] | null = null;
  private moveSpeed: number = 350; // increased speed
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;

  constructor() {
    super({ key: "WorldScene" });
  }

  init(data: any) {
    // Get socket and mapKey from data passed from BootScene
    this.socket = data.socket;
    this.mapKey = data.mapKey || "maptest";

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

      // Set up keyboard input
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

      // Start background music
      if (!this.sound.get("background_music")) {
        this.sound.play("background_music", {
          loop: true,
          volume: 0.5,
        });
      }
    } catch (error) {
      console.error("Error in create method:", error);
    }
  }

  initializeMultiplayer() {
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

  setupGridEngineListeners() {
    // Listen for movement started
    this.gridEngine
      .movementStarted()
      .subscribe(({ charId, direction }: MovementEvent) => {
        if (charId === "player") {
          const position = this.gridEngine.getPosition("player");
          this.updatePlayerMovement(position.x, position.y, direction);
        }
      });

    // Listen for movement stopped
    this.gridEngine
      .movementStopped()
      .subscribe(({ charId, direction }: MovementEvent) => {
        if (charId === "player") {
          const position = this.gridEngine.getPosition("player");
          this.updatePlayerMovement(position.x, position.y, direction);
        }
      });

    // Listen for direction changes
    this.gridEngine
      .directionChanged()
      .subscribe(({ charId, direction }: MovementEvent) => {
        if (charId === "player") {
          const position = this.gridEngine.getPosition("player");
          this.updatePlayerMovement(position.x, position.y, direction);
        }
      });
  }

  update(): void {
    if (this.player) {
      this.handleMovement();
      // Check if player touches the top border
      if (this.player.y - this.player.height / 2 <= 0) {
        // Only switch scene if not already switching
        if (!this.scene.isTransitioning) {
          this.scene.isTransitioning = true;
          // Don't stop music, just start next scene
          this.scene.start('Scene3');
        }
      }
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
      const layer = this.tilemap.createLayer("desert_gate", tileset);
      if (!layer) {
        throw new Error("Failed to create layer");
      }
      console.log("Layer created");

      // Create the collision layer (update 'collision' to your actual layer name if needed)
      const collisionLayer = this.tilemap.createLayer("collision", tileset);
      if (collisionLayer) {
        collisionLayer.setCollisionByExclusion([-1]); // All non-empty tiles are collidable
        this.collisionLayer = collisionLayer;
      }

      // Set world bounds to match map size
      this.physics.world.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
      this.cameras.main.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
      this.cameras.main.setBackgroundColor("#e2a84b"); // Set to match map background
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

  // MULTIPLAYER METHODS

  setupSocketHandlers() {
    if (!this.socket) return;

    // Handle room creation response
    this.socket.on(
      "roomCreated",
      ({
        roomId,
        playerId,
        sprite,
      }: {
        roomId: string;
        playerId: string;
        sprite: string;
      }) => {
        this.roomId = roomId;
        this.playerId = playerId;

        // Set the player's sprite texture based on server assignment
        this.player.setTexture(sprite);

        // Update the room code text
        this.roomCodeText.setText(`Room: ${roomId}`);
        console.log(
          `Joined room ${roomId} as player ${playerId} with sprite ${sprite}`
        );
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
        sprite,
      }: {
        roomId: string;
        playerId: string;
        players: Record<string, Player>;
        sprite: string;
      }) => {
        this.roomId = roomId;
        this.playerId = playerId;

        // Set the player's sprite texture based on server assignment
        this.player.setTexture(sprite);

        // Update the room code text
        this.roomCodeText.setText(`Room: ${roomId}`);
        console.log(
          `Joined room ${roomId} as player ${playerId} with sprite ${sprite}`
        );

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

    // Handle chat messages from other players
    this.socket.on("chatMessageReceived", (message: any) => {
      console.log(
        "Chat message received:",
        message.message,
        "groupId:",
        message.groupId,
        "our groupId:",
        this.chatGroupId
      );

      // If we're not in proximity mode, ignore the message
      if (!this.chatGroupId) return;

      // Get the IDs from both group IDs to compare
      const ourGroupIds = this.chatGroupId.split("-").sort();
      const messageGroupIds = message.groupId.split("-").sort();

      // Check if we share at least one player ID with the message group
      // This ensures messages will transmit between connected players
      const playerOverlap = ourGroupIds.some((id) =>
        messageGroupIds.includes(id)
      );

      if (playerOverlap) {
        useChatStore.getState().addMessage(message);
      }
    });
  }

  // Method to create/join a room
  createOrJoinRoom(username: string) {
    if (this.socket) {
      this.socket.emit("createRoom", { username });
    }
  }

  // Method to join an existing room
  joinRoom(roomId: string, username: string) {
    if (this.socket) {
      this.socket.emit("joinRoom", { roomId, username });
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

  checkAdjacentPlayers() {
    if (!this.socket || !this.roomId || !this.playerId) return;

    const playerPosition = this.gridEngine.getPosition("player");
    if (!playerPosition) return;

    // Store previous adjacent players for comparison
    const previousAdjacentPlayers = new Map(this.adjacentPlayers);

    // Clear current adjacent players
    this.adjacentPlayers.clear();

    // Direct adjacency check - players within 1 tile
    this.remotePlayers.forEach((sprite, playerId) => {
      const remoteCharId = `remote_${playerId}`;

      if (this.gridEngine.hasCharacter(remoteCharId)) {
        const remotePosition = this.gridEngine.getPosition(remoteCharId);

        // Check if player is adjacent (Manhattan distance of 1)
        const dx = Math.abs(remotePosition.x - playerPosition.x);
        const dy = Math.abs(remotePosition.y - playerPosition.y);

        if (dx + dy <= 1) {
          // This player is adjacent, add to our map
          this.adjacentPlayers.set(playerId, {
            id: playerId,
            x: remotePosition.x,
            y: remotePosition.y,
            direction: this.gridEngine.getFacingDirection(remoteCharId),
            username: "Player",
            sprite: "",
          });
        }
      }
    });

    // Get the chat store
    const chatStore = useChatStore.getState();

    // Determine if we were or are now in proximity chat
    const wasInProximityMode = !!this.chatGroupId;
    const isNowInProximityMode = this.adjacentPlayers.size > 0;

    // Handle transition into proximity mode
    if (!wasInProximityMode && isNowInProximityMode) {
      // Generate a group ID with only our ID and adjacent players
      const playerIds = [
        this.playerId,
        ...Array.from(this.adjacentPlayers.keys()),
      ].sort();
      this.chatGroupId = playerIds.join("-");

      // Update chat UI
      chatStore.setProximityMode(true);
      chatStore.setActiveGroupId(this.chatGroupId);

      console.log(
        "Started proximity chat with adjacent players:",
        this.adjacentPlayers
      );
    }
    // Handle transition out of proximity mode
    else if (wasInProximityMode && !isNowInProximityMode) {
      chatStore.setProximityMode(false);
      chatStore.setActiveGroupId(null);
      this.chatGroupId = null;

      console.log("Left proximity chat - no adjacent players");
    }
    // Handle changes to the proximity group
    else if (isNowInProximityMode) {
      // Check if the adjacency has changed
      let adjacencyChanged = false;

      // Check if any player was added
      for (const playerId of this.adjacentPlayers.keys()) {
        if (!previousAdjacentPlayers.has(playerId)) {
          adjacencyChanged = true;
          break;
        }
      }

      // Check if any player was removed
      if (!adjacencyChanged) {
        for (const playerId of previousAdjacentPlayers.keys()) {
          if (!this.adjacentPlayers.has(playerId)) {
            adjacencyChanged = true;
            break;
          }
        }
      }

      // If adjacency changed, update the group ID
      if (adjacencyChanged) {
        const playerIds = [
          this.playerId,
          ...Array.from(this.adjacentPlayers.keys()),
        ].sort();
        const newGroupId = playerIds.join("-");

        // Update group ID
        this.chatGroupId = newGroupId;
        chatStore.setActiveGroupId(this.chatGroupId);

        console.log("Proximity chat group updated:", this.adjacentPlayers);
      }
    }
  }

  sendChatMessage(message: string) {
    if (!this.socket || !this.roomId) return;

    // Check if we're in proximity chat with other players
    const inProximityChat = this.chatGroupId !== null;

    // Only send to server if in proximity chat
    if (inProximityChat) {
      console.log("Sending chat message to group:", this.chatGroupId);
      this.socket.emit("chatMessage", {
        roomId: this.roomId,
        groupId: this.chatGroupId,
        message,
      });
    } else {
      console.log("Message is self-only (no proximity chat active)");
      // If proximity chat is not active, we could automatically route to Nebula here
      // But that's handled in the ChatWindow component instead
    }
  }
}
