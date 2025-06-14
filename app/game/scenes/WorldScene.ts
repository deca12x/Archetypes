import { Scene, GameObjects, Tilemaps, Physics } from "phaser";
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
import { useUIStore } from "../../../lib/game/stores/ui";
import { useSocket } from "@/lib/hooks/useSocket";

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
  public username: string = "Player";
  public playerId: string = "";
  private socket: Socket | null = null;
  private mapKey: string = "world";
  private daylightOverlay: Phaser.GameObjects.Graphics | null = null;
  private gridEngine: GridEngineInterface | null = null;
  private roomId: string = "";
  private isTransitioning: boolean = false;
  private roomCodeText: Phaser.GameObjects.Text | null = null;
  private remotePlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private chatGroupId: string = "";
  private adjacentPlayers: Set<string> = new Set();
  private backgroundMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: "WorldScene" });
  }

  init(data: any) {
    // Get socket and mapKey from data passed from BootScene
    this.socket = data.socket;
    this.mapKey = data.mapKey || "world";
    this.backgroundMusic = data.music; // Get the music instance from IntroScene

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

      // Start background music
      if (!this.backgroundMusic) {
        this.backgroundMusic = this.sound.add('background_music', {
          volume: 0.5,
          loop: true
        });
        this.backgroundMusic.play();
      }

      // Show the third message after a delay
      this.time.delayedCall(2000, () => {
        const message = "There — just past the ridge.\nIf I don't trade now, I'm done.";
        const messageText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height * 0.8, message, {
          fontSize: '32px',
          fontFamily: 'Arial',
          color: '#ffffff',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 4,
          shadow: {
            offsetX: 2,
            offsetY: 2,
            color: '#000',
            blur: 2,
            stroke: true,
            fill: true
          },
          wordWrap: { width: this.cameras.main.width * 0.4 }
        });
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
                }
              });
            });
          }
        });
      });

      // Add mission card
      const missionCard = this.add.container(20, 20);
      
      // Background
      const cardBg = this.add.rectangle(0, 0, 300, 100, 0x000000, 0.7);
      cardBg.setStrokeStyle(2, 0xffffff);
      
      // Mission title
      const missionTitle = this.add.text(0, -30, 'MISSION', {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      });
      missionTitle.setOrigin(0, 0.5);
      
      // Mission objective
      const missionObjective = this.add.text(0, 10, 'Get to the marketplace\nbefore night falls', {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        lineSpacing: 5
      });
      missionObjective.setOrigin(0, 0.5);
      
      // Add all elements to the container
      missionCard.add([cardBg, missionTitle, missionObjective]);
      missionCard.setDepth(1000); // Ensure it's above other elements
      
      // Add a subtle pulsing effect to the border
      this.tweens.add({
        targets: cardBg,
        alpha: 0.5,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
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

  update(): void {
    if (this.player) {
      this.handleMovement();
      // Check if player is in the transition area (top center of the map)
      const transitionX = this.tilemap?.widthInPixels ? this.tilemap.widthInPixels / 2 : 0;
      const transitionY = 50; // 50 pixels from top
      const distanceToTransition = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        transitionX,
        transitionY
      );
      
      // Only transition if player is close to the transition point
      if (distanceToTransition < 30 && !this.isTransitioning) {
        this.isTransitioning = true;
        // Don't stop music, just start next scene
        this.scene.start('Scene3');
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
      const groundLayer = this.tilemap.createLayer("ground", tileset, 0, 0);
      if (!groundLayer) {
        throw new Error("Failed to create layer");
      }
      console.log("Layer created");

      // Create the collision layer (update 'collision' to your actual layer name if needed)
      const collisionLayer = this.tilemap.createLayer("collision", tileset, 0, 0);
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

    this.socket.on("roomCreated", (data: { roomId: string }) => {
      this.roomId = data.roomId;
      if (this.roomCodeText) {
        this.roomCodeText.setText(`Room Code: ${data.roomId}`);
      }
    });

    this.socket.on("playerJoined", (data: { playerId: string, username: string }) => {
      if (data.playerId !== this.playerId) {
        this.addRemotePlayer(data.playerId, { username: data.username });
      }
    });

    this.socket.on("playerLeft", (data: { playerId: string }) => {
      this.removeRemotePlayer(data.playerId);
    });

    this.socket.on("chatMessage", (data: { playerId: string, message: string }) => {
      if (data.playerId !== this.playerId) {
        // Handle incoming chat message
        console.log(`Chat from ${data.playerId}: ${data.message}`);
      }
    });
  }

  createOrJoinRoom(username: string) {
    if (!this.socket) return;
    this.socket.emit("createOrJoinRoom", { username });
  }

  joinRoom(roomId: string, username: string) {
    if (!this.socket) return;
    this.socket.emit("joinRoom", { roomId, username });
  }

  addRemotePlayer(playerId: string, playerData: { username: string }) {
    if (!this.player) return;
    const remotePlayer = this.add.sprite(
      this.player.x,
      this.player.y,
      "rogue"
    );
    remotePlayer.setScale(1);
    this.remotePlayers.set(playerId, remotePlayer);
  }

  updateRemotePlayerPosition(playerId: string, movement: PlayerMovement) {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (remotePlayer) {
      remotePlayer.x = movement.x;
      remotePlayer.y = movement.y;
      // Update animation based on direction
      switch (movement.direction) {
        case "left":
          remotePlayer.anims.play("rogue_walk_left", true);
          break;
        case "right":
          remotePlayer.anims.play("rogue_walk_right", true);
          break;
        case "up":
          remotePlayer.anims.play("rogue_walk_up", true);
          break;
        case "down":
          remotePlayer.anims.play("rogue_walk_down", true);
          break;
      }
    }
  }

  removeRemotePlayer(playerId: string) {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (remotePlayer) {
      remotePlayer.destroy();
      this.remotePlayers.delete(playerId);
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
    if (!this.socket || !this.roomId || !this.playerId || !this.gridEngine) return;

    const playerPosition = this.gridEngine.getPosition("player");
    if (!playerPosition) return;

    // Store previous adjacent players for comparison
    const previousAdjacentPlayers = new Set(this.adjacentPlayers);
    this.adjacentPlayers.clear();

    // Check each remote player
    for (const [playerId, remotePlayer] of this.remotePlayers.entries()) {
      const remoteCharId = `remote_${playerId}`;
      if (!this.gridEngine.hasCharacter(remoteCharId)) continue;

      const remotePosition = this.gridEngine.getPosition(remoteCharId);
      if (!remotePosition) continue;

      // Calculate distance (Manhattan distance for simplicity)
      const dx = Math.abs(playerPosition.x - remotePosition.x);
      const dy = Math.abs(playerPosition.y - remotePosition.y);

      if (dx + dy <= 1) {
        // This player is adjacent, add to our set
        this.adjacentPlayers.add(playerId);
      }
    }

    // If adjacency changed, update chat group
    let adjacencyChanged = false;

    // Check if any player was added
    for (const playerId of this.adjacentPlayers) {
      if (!previousAdjacentPlayers.has(playerId)) {
        adjacencyChanged = true;
        break;
      }
    }

    // Check if any player was removed
    if (!adjacencyChanged) {
      for (const playerId of previousAdjacentPlayers) {
        if (!this.adjacentPlayers.has(playerId)) {
          adjacencyChanged = true;
          break;
        }
      }
    }

    if (adjacencyChanged) {
      // Create new chat group ID from sorted player IDs
      const playerIds = [
        this.playerId,
        ...Array.from(this.adjacentPlayers)
      ].sort();
      this.chatGroupId = playerIds.join("-");
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
