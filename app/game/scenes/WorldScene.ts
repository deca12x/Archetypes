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
  // Original properties
  gridEngine!: GridEngineInterface;
  player!: Phaser.Physics.Arcade.Sprite;
  speed: number = 10;
  tilemap!: Tilemaps.Tilemap;
  mapKey: string = "maptest"; // Default to maptest
  daylightOverlay!: GameObjects.Graphics;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  enterKey!: Phaser.Input.Keyboard.Key;

  // Socket.io properties
  private socket: Socket | null = null;
  public playerId: string | null = null;
  private roomId: string | null = null;
  private remotePlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private roomCodeText!: Phaser.GameObjects.Text;

  // New properties
  username: string = "";
  adjacentPlayers: Map<string, Player> = new Map();
  chatGroupId: string | null = null;
  _lastAdjacentCheck: number = 0;

  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private worldLayer!: Phaser.Tilemaps.TilemapLayer;

  constructor() {
    super("WorldScene");
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
    // Make the game instance globally accessible
    (window as any).__PHASER_GAME__ = this.game;

    // Add event listener to canvas to handle focus restoration
    const canvas = this.game.canvas;
    canvas.addEventListener("click", () => {
      // Find and blur any focused input elements
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.tagName === "INPUT") {
        activeElement.blur();
      }

      // Ensure keyboard is enabled for the game
      if (this.input.keyboard) {
        this.input.keyboard.enabled = true;
      }
    });

    this.initializePlayer();
    this.initializeTilemap();
    this.initializeCamera();
    this.initializeGrid();
    this.listenKeyboardControl();

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

    // Fix positionChangeFinished subscription and add socket event
    // @ts-ignore - We need to ignore this since the types are not correctly exported
    this.gridEngine.positionChangeFinished().subscribe((observer: any) => {
      if (observer.charId === "player") {
        savePlayerPosition(this);

        // Send position update to other players when movement finishes
        const position = this.gridEngine.getPosition("player");
        const direction = this.gridEngine.getFacingDirection("player");
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

  update(time: number): void {
    // If UI is open, don't allow player movement
    if (isUIOpen()) {
      return;
    }

    this.listenMoves();

    // Check for adjacent players every 500ms for performance
    if (!this._lastAdjacentCheck || time - this._lastAdjacentCheck > 500) {
      this.checkAdjacentPlayers();
      this._lastAdjacentCheck = time;
    }
  }

  listenMoves(): void {
    if (this.input.keyboard && !isUIOpen()) {
      // Check isMoving with ts-ignore
      // @ts-ignore - GridEngine types are incomplete
      const isMoving = this.gridEngine.isMoving("player");

      if (!isMoving) {
        const cursors = this.input.keyboard.createCursorKeys();

        if (cursors.left?.isDown) {
          this.gridEngine.move("player", "left");
        } else if (cursors.right?.isDown) {
          this.gridEngine.move("player", "right");
        } else if (cursors.up?.isDown) {
          this.gridEngine.move("player", "up");
        } else if (cursors.down?.isDown) {
          this.gridEngine.move("player", "down");
        }
      }
    }
  }

  initializeTilemap(): void {
    // Create the tilemap
    this.tilemap = this.make.tilemap({ key: "desert_gate" });

    // Add tileset
    const desertGateTileset = this.tilemap.addTilesetImage("desert_gate", "desert_gate");

    if (!desertGateTileset) {
      console.error('Failed to load tileset');
      return;
    }

    // Create layer
    const backgroundLayer = this.tilemap.createLayer("desert_gate", desertGateTileset);

    if (!backgroundLayer) {
      console.error('Failed to create layer');
      return;
    }

    // Set world bounds
    this.physics.world.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);

    // Set up camera
    this.cameras.main.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
    this.cameras.main.setZoom(1);

    // Set up collision between player and background layer
    if (this.player) {
      this.physics.add.collider(this.player, backgroundLayer);
    }
  }

  initializePlayer() {
    // Create player sprite
    this.player = this.physics.add.sprite(100, 100, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1.33); // Scale up to match map tile size (32/24 = 1.33)
    this.player.play('player_idle');

    // Set up camera to follow player
    this.cameras.main.startFollow(this.player);
  }

  initializeGrid(): void {
    // Initialize GridEngine
    this.gridEngine.create(this.tilemap, {
      characters: [
        {
          id: "player",
          sprite: this.player,
          walkingAnimationMapping: {
            up: { leftFoot: 27, standing: 28, rightFoot: 29 },
            down: { leftFoot: 0, standing: 1, rightFoot: 2 },
            left: { leftFoot: 9, standing: 10, rightFoot: 11 },
            right: { leftFoot: 9, standing: 10, rightFoot: 11 }
          },
          startPosition: { x: 5, y: 5 },
          speed: 4
        }
      ]
    });
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

    // Only add these keyboard controls if keyboard is enabled
    if (this.input.keyboard?.enabled) {
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
