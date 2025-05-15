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
import { useCharacterStore } from "@/lib/game/stores/characterStore";
import { CHARACTER_SOUND_MAP, CharacterSounds } from "../../../lib/game/constants/sounds";

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
  private soundtrack: Phaser.Sound.HTML5AudioSound | null = null;
  private isMusicMuted: boolean = false;

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
  private movementSound: Phaser.Sound.BaseSound | null = null;
  private attackSound: Phaser.Sound.BaseSound | null = null;
  private cloudSound: Phaser.Sound.BaseSound | null = null;
  private lastMovementTime: number = 0;
  private readonly MOVEMENT_SOUND_INTERVAL = 300; // ms between movement sounds

  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private tutorialText!: Phaser.GameObjects.Text;
  private continueText!: Phaser.GameObjects.Text;
  private tutorialBg!: Phaser.GameObjects.Rectangle;
  private currentTutorialStep: number = 0;
  private readonly tutorialSteps = [
    "Welcome to Archetypes!",
    "Use WASD or Arrow Keys to move",
    "Press P to swap between characters",
    "Press X to attack",
    "Press M to toggle music",
    "Press ESC to open menu",
    "Let's begin your adventure!"
  ];

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
    this.initializeSoundtrack();

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
        this.uiScene.events.on('characterChanged', (characterId: string) => {
          this.initializeCharacter(characterId);
        });
        
        // Initialize with first character
        this.initializeCharacter('wizard');
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

    // Add tutorial popup
    this.createTutorialPopup();
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
      try {
        this.showAttackMessage();
      } catch (error) {
        console.warn('Failed to show attack message:', error);
      }
    }

    // Check for character swap input
    if (Phaser.Input.Keyboard.JustDown(this.pKey) && !this.isSwapping) {
      try {
        this.startCharacterSwap();
      } catch (error) {
        console.warn('Failed to start character swap:', error);
        // Reset swap state if it failed
        this.isSwapping = false;
        this.player.setVisible(true);
      }
    }
  }

  listenMoves(): void {
    if (!this.input.keyboard || isUIOpen()) {
      return;
    }

    try {
      // @ts-ignore - GridEngine types are incomplete
      const isMoving = this.gridEngine.isMoving(Sprites.PLAYER);

      if (!isMoving) {
        const cursors = this.cursors;
        const keys = this.wasdKeys;

        // Debug log for key states
        console.log('Key states:', {
          left: cursors.left.isDown || keys.A.isDown,
          right: cursors.right.isDown || keys.D.isDown,
          up: cursors.up.isDown || keys.W.isDown,
          down: cursors.down.isDown || keys.S.isDown
        });

        if (cursors.left.isDown || keys.A.isDown) {
          console.log('Moving left');
          this.gridEngine.move(Sprites.PLAYER, "left");
          this.playMovementSound();
        } else if (cursors.right.isDown || keys.D.isDown) {
          console.log('Moving right');
          this.gridEngine.move(Sprites.PLAYER, "right");
          this.playMovementSound();
        } else if (cursors.up.isDown || keys.W.isDown) {
          console.log('Moving up');
          this.gridEngine.move(Sprites.PLAYER, "up");
          this.playMovementSound();
        } else if (cursors.down.isDown || keys.S.isDown) {
          console.log('Moving down');
          this.gridEngine.move(Sprites.PLAYER, "down");
          this.playMovementSound();
        }
      }
    } catch (error) {
      console.error('Error in movement handling:', error);
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
    // Initialize keyboard input
    if (!this.input.keyboard) {
      console.error('Keyboard input not available');
      return;
    }

    // Create cursor keys
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Add custom keys
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.xKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    // Add WASD keys
    this.wasdKeys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    }) as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };

    // Initialize player sprite with the first character
    const initialCharacter = PLAYABLE_CHARACTERS[0];
    console.log('Initializing player with character:', initialCharacter);
    this.player = this.add.sprite(0, 0, initialCharacter);
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(1);
    this.currentCharacter = initialCharacter;

    // Log key initialization
    console.log('Keyboard initialized:', {
      cursors: this.cursors,
      enterKey: this.enterKey,
      xKey: this.xKey,
      pKey: this.pKey,
      wasdKeys: this.wasdKeys
    });
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

  private initializeCharacter(characterId: string) {
    try {
      console.log('Initializing character with ID:', characterId);
      
      // Map character ID to sprite name
      const spriteMap: Record<string, typeof PLAYABLE_CHARACTERS[number]> = {
        'wizard': 'wizard_final_spritesheet',
        'explorer': 'explorer_spritesheet_final',
        'ruler': 'ruler_spritesheet',
        'hero': 'hero_attack_spritesheet'
      };

      const spriteName = spriteMap[characterId];
      if (!spriteName) {
        console.error('Invalid character ID:', characterId);
        return;
      }

      console.log('Setting texture to:', spriteName);
      // Update player sprite
      this.player.setTexture(spriteName);
      this.currentCharacter = spriteName;

      // Update grid engine character
      if (this.gridEngine) {
        const position = this.gridEngine.getPosition(Sprites.PLAYER);
        const direction = this.gridEngine.getFacingDirection(Sprites.PLAYER);
        
        console.log('Updating grid engine character at position:', position, 'facing:', direction);
        
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

        // Ensure the player is visible
        this.player.setVisible(true);
      }

      // Update character store
      const characterStore = useCharacterStore.getState();
      characterStore.setCurrentCharacter(characterId);

      // Update UI
      if (this.uiScene) {
        this.uiScene.events.emit('characterChanged', characterId);
        this.uiScene.events.emit('updateStats', characterId);
      }

      console.log('Character initialization complete:', characterId);
    } catch (error) {
      console.error('Error initializing character:', error);
      // Reset state if initialization failed
      this.isSwapping = false;
      this.player.setVisible(true);
    }
  }

  private startCharacterSwap() {
    if (this.isSwapping) return;

    try {
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

      // Play cloud sound if available
      try {
        console.log('Attempting to play cloud sound...');
        const cloudSoundKey = 'cloud';  // Use the exact key we loaded
        console.log('Cloud sound key:', cloudSoundKey);
        
        // Stop any existing cloud sound
        if (this.cloudSound) {
          console.log('Stopping existing cloud sound');
          this.cloudSound.stop();
        }
        
        // Create and play new cloud sound
        console.log('Creating new cloud sound instance');
        this.cloudSound = this.sound.add(cloudSoundKey, {
          volume: 0.6,
          loop: false
        });
        
        // Add event listeners for debugging
        this.cloudSound.on('play', () => {
          console.log('Cloud sound started playing');
        });
        
        this.cloudSound.on('complete', () => {
          console.log('Cloud sound completed');
        });
        
        this.cloudSound.on('stop', () => {
          console.log('Cloud sound stopped');
        });
        
        // Play the sound
        console.log('Playing cloud sound');
        this.cloudSound.play();
        
      } catch (error) {
        console.warn('Failed to play cloud sound:', error);
      }

      // Ensure cloud animation exists
      if (!this.anims.exists('cloud_puff')) {
        console.error('Cloud animation does not exist');
        this.isSwapping = false;
        this.player.setVisible(true);
        return;
      }

      // Reset cloud sprite to first frame
      this.cloudSprite.setFrame(0);

      // Play cloud animation
      this.cloudSprite.play('cloud_puff');

      // When cloud animation completes, switch character
      this.cloudSprite.once('animationcomplete', () => {
        try {
          console.log('WorldScene: Cloud animation complete, switching character');
          
          // Get next character index
          const currentIndex = PLAYABLE_CHARACTERS.indexOf(this.currentCharacter);
          console.log('Current character index:', currentIndex, 'Current character:', this.currentCharacter);
          
          const nextIndex = (currentIndex + 1) % PLAYABLE_CHARACTERS.length;
          const nextCharacter = PLAYABLE_CHARACTERS[nextIndex];
          
          console.log('Next character index:', nextIndex, 'Next character:', nextCharacter);
          
          // Map sprite name to character ID
          const characterIdMap: Record<string, string> = {
            'wizard_final_spritesheet': 'wizard',
            'explorer_spritesheet_final': 'explorer',
            'ruler_spritesheet': 'ruler',
            'hero_attack_spritesheet': 'hero'
          };
          
          const characterId = characterIdMap[nextCharacter];
          console.log('Mapped character ID:', characterId, 'for sprite:', nextCharacter);
          
          if (characterId) {
            console.log('Initializing character:', characterId);
            this.initializeCharacter(characterId);
          } else {
            console.error('No character ID found for sprite:', nextCharacter);
            // Reset state if character not found
            this.isSwapping = false;
            this.player.setVisible(true);
          }
          
          // Show player
          this.player.setVisible(true);
          this.isSwapping = false;
        } catch (error) {
          console.error('Error during character swap:', error);
          // Reset state if swap failed
          this.isSwapping = false;
          this.player.setVisible(true);
        }
      });
    } catch (error) {
      console.error('Error starting character swap:', error);
      // Reset state if swap failed
      this.isSwapping = false;
      this.player.setVisible(true);
    }
  }

  private getCharacterScreenPosition() {
    try {
      // Get the character's position in the grid
      const position = this.gridEngine.getPosition(Sprites.PLAYER);
      
      // Get the actual screen position of the player sprite
      const playerX = this.player.x;
      const playerY = this.player.y;
      
      // Add one tile width (32 pixels) to move the cloud one tile to the right
      return {
        x: playerX + 32,
        y: playerY
      };
    } catch (error) {
      console.error('Error getting character screen position:', error);
      // Return a default position if there's an error
      return {
        x: this.player.x + 32,
        y: this.player.y
      };
    }
  }

  private showAttackMessage() {
    try {
      // Get the exact position where the player is rendered
      const playerPos = this.getCharacterScreenPosition();
      
      // Show attack text above the character
      this.attackText.setPosition(playerPos.x, playerPos.y - 20);
      this.attackText.setVisible(true);

      // Play attack sound
      this.playAttackSound();

      // Hide after 1 second
      this.time.delayedCall(1000, () => {
        this.attackText.setVisible(false);
      });
    } catch (error) {
      console.error('Error showing attack message:', error);
    }
  }

  private playAttackSound() {
    try {
      console.log('Playing attack sound for character:', this.currentCharacter);
      const soundKey = CHARACTER_SOUND_MAP[this.currentCharacter]?.attack;
      
      if (soundKey) {
        console.log('Found attack sound key:', soundKey);
        
        // Stop any existing attack sound
        if (this.attackSound) {
          console.log('Stopping existing attack sound');
          this.attackSound.stop();
        }
        
        // Check if sound exists
        if (!this.sound.get(soundKey)) {
          console.error('Attack sound not found:', soundKey);
          return;
        }
        
        // Create and play new attack sound
        console.log('Creating new attack sound instance');
        this.attackSound = this.sound.add(soundKey, {
          volume: 1.0, // Increased volume
          loop: false
        });
        
        // Add event listeners for debugging
        this.attackSound.on('play', () => {
          console.log('Attack sound started playing');
        });
        
        this.attackSound.on('complete', () => {
          console.log('Attack sound completed');
        });
        
        this.attackSound.on('stop', () => {
          console.log('Attack sound stopped');
        });
        
        // Play the sound
        console.log('Playing attack sound');
        this.attackSound.play();
      } else {
        console.warn('No attack sound found for character:', this.currentCharacter);
      }
    } catch (error) {
      console.warn('Failed to play attack sound:', error);
    }
  }

  private playMovementSound() {
    const currentTime = this.time.now;
    if (currentTime - this.lastMovementTime < this.MOVEMENT_SOUND_INTERVAL) {
      return;
    }

    try {
      const soundKey = CHARACTER_SOUND_MAP[this.currentCharacter]?.walk;
      if (soundKey && this.sound.get(soundKey)) {
        if (this.movementSound) {
          this.movementSound.stop();
        }
        this.movementSound = this.sound.add(soundKey, { volume: 0.5 });
        this.movementSound.play();
        this.lastMovementTime = currentTime;
      } else {
        console.warn('Movement sound not found:', soundKey);
      }
    } catch (error) {
      console.warn('Failed to play movement sound:', error);
    }
  }

  private toggleMusic() {
    if (this.soundtrack) {
      if (this.isMusicMuted) {
        // Unmute and restore volume
        this.soundtrack.setMute(false);
        this.soundtrack.setVolume(0.5);
        this.isMusicMuted = false;
        console.log('Music unmuted');
      } else {
        // Completely mute
        this.soundtrack.setMute(true);
        this.soundtrack.setVolume(0);
        this.isMusicMuted = true;
        console.log('Music muted');
      }
    }
  }

  private initializeSoundtrack() {
    try {
      // Create and configure the soundtrack
      this.soundtrack = this.sound.add(CharacterSounds.SOUNDTRACK, {
        volume: 0.5,
        loop: true
      }) as Phaser.Sound.HTML5AudioSound;
      
      // Start playing the soundtrack
      this.soundtrack.play();
      
      // Add mute toggle with 'M' key
      this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M).on('down', () => {
        this.toggleMusic();
      });

      // Add visual feedback for music state
      this.events.on('shutdown', () => {
        if (this.soundtrack) {
          this.soundtrack.stop();
        }
      });
    } catch (error) {
      console.warn('Failed to initialize soundtrack:', error);
    }
  }

  private createTutorialPopup() {
    // Create semi-transparent background
    this.tutorialBg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    );
    this.tutorialBg.setScrollFactor(0);
    this.tutorialBg.setDepth(1000);

    // Add tutorial text
    this.tutorialText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      this.tutorialSteps[0],
      {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    this.tutorialText.setDepth(1001);

    // Add continue text
    this.continueText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 50,
      "Press SPACE to continue",
      {
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5);
    this.continueText.setDepth(1001);

    // Add blinking animation to continue text
    this.tweens.add({
      targets: this.continueText,
      alpha: 0,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    // Listen for space key to advance tutorial
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => {
      this.nextTutorialStep();
    });
  }

  private nextTutorialStep() {
    this.currentTutorialStep++;
    
    if (this.currentTutorialStep < this.tutorialSteps.length) {
      // Show next tutorial step
      this.tutorialText.setText(this.tutorialSteps[this.currentTutorialStep]);
    } else {
      // End tutorial
      this.tutorialBg.destroy();
      this.tutorialText.destroy();
      this.continueText.destroy();
    }
  }
}
