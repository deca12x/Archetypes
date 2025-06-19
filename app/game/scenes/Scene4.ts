import { Scene, GameObjects, Tilemaps } from "phaser";
import { Socket } from "socket.io-client";
import GridEngine from "grid-engine";
import { MissionCard } from "../components/MissionCard";

// Using string literal types instead of importing Direction from grid-engine
type Direction = "up" | "down" | "left" | "right";

// Define GridEngineConfig interface
interface GridEngineConfig {
  characters: {
    id: string;
    sprite: GameObjects.Sprite;
    walkingAnimationMapping?: {
      up: { leftFoot: number; standing: number; rightFoot: number };
      down: { leftFoot: number; standing: number; rightFoot: number };
      left: { leftFoot: number; standing: number; rightFoot: number };
      right: { leftFoot: number; standing: number; rightFoot: number };
    };
    startPosition: { x: number; y: number };
    facingDirection?: Direction;
    speed?: number;
    charLayer?: string;
  }[];
  collisionTilePropertyName?: string;
}

// Define GridEngine interface
interface GridEngineInterface {
  movementStarted(): { subscribe: (callback: (data: MovementEvent) => void) => void };
  movementStopped(): { subscribe: (callback: (data: MovementEvent) => void) => void };
  directionChanged(): { subscribe: (callback: (data: MovementEvent) => void) => void };
  positionChangeFinished(): { subscribe: (callback: (data: any) => void) => void };
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

interface MovementEvent {
  charId: string;
  direction: Direction;
}

export default class Scene4 extends Scene {
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private player: Phaser.GameObjects.Sprite | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasdKeys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  } | null = null;
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private groundDaytimeLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private missionCard: MissionCard | null = null;
  
  // Multiplayer properties
  public username: string = "Player";
  public playerId: string = "";
  private socket: Socket | null = null;
  private roomId: string = "";
  private gridEngine: GridEngineInterface | null = null;
  private gridEngineReady: boolean = false;
  private remotePlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private isTransitioning: boolean = false;

  constructor() {
    super({ key: "scene4" });
    console.log("Scene4 constructor called, scene key:", "scene4");
  }

  init(data: any) {
    // Get multiplayer data from previous scene
    this.socket = data.socket || (typeof window !== "undefined" ? (window as any).__gameSocket : null);
    this.roomId = data.roomId || "";
    this.playerId = data.playerId || "";
    this.username = data.username || "Player";
    
    console.log("Scene4 init called with socket:", this.socket ? "available" : "not available");
    
    if (this.socket) {
      this.setupSocketHandlers();
    }
  }

  create(): void {
    console.log("Scene4 create method started");
    
    // Initialize the tilemap
    this.initializeTilemap();
    
    // Initialize the player
    this.initializePlayer();
    
    // Initialize GridEngine
    this.initializeGridEngine();
    
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
      console.error('Input system not available in Scene4');
    }

    // Continue background music if not already playing
    if (!this.sound.get("background_music")) {
      this.sound.play("background_music", {
        loop: true,
        volume: 0.5,
      });
    }

    // Initialize mission card
    this.missionCard = new MissionCard(this);
    this.missionCard.show();
    
    // Notify server that we've entered Scene4
    if (this.socket && this.roomId) {
      console.log("🎬 Scene4 Notifying server that we entered Scene4");
      this.socket.emit("playerEnteredScene", {
        roomId: this.roomId,
        sceneName: "scene4",
        playerId: this.playerId
      });
    }
  }

  update(): void {
    if (!this.gridEngineReady) {
      return;
    }

    // Handle player movement
    this.handleMovement();

    // Check for scene transition (left border to WorldScene)
    this.checkForSceneTransition();
  }

  private initializeTilemap(): void {
    console.log("Initializing Scene4 tilemap...");
    try {
      // Create the tilemap
      this.tilemap = this.make.tilemap({ key: "scene4", tileWidth: 32, tileHeight: 32 });
      const tileset = this.tilemap.addTilesetImage("scene4", "scene4");
      if (!tileset) {
        throw new Error("Failed to load tileset 'scene4' for Scene4");
      }

      // Create the ground_nightime layer (default visible)
      const groundNighttimeLayer = this.tilemap.createLayer("ground_nightime", tileset);
      if (!groundNighttimeLayer) {
        throw new Error("Failed to create ground_nightime layer");
      }

      // Create the ground_daytime layer (invisible by default)
      this.groundDaytimeLayer = this.tilemap.createLayer("ground_daytime", tileset);
      if (this.groundDaytimeLayer) {
        this.groundDaytimeLayer.setVisible(false);
      }

      // Create the collision layer and set collision on all non-empty tiles
      this.collisionLayer = this.tilemap.createLayer("collision", tileset);
      if (this.collisionLayer) {
        this.collisionLayer.setCollisionByExclusion([-1]);
        
        // Add "collides" property to all collision tiles for GridEngine
        this.collisionLayer.forEachTile((tile) => {
          if (tile.index !== -1) {
            tile.properties = { collides: true };
          }
        });
      }

      // Set world bounds
      this.cameras.main.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
      this.cameras.main.setBackgroundColor("#22223b");
      
      console.log("Scene4 tilemap initialized successfully");
    } catch (error) {
      console.error("Error in initializeTilemap:", error);
    }
  }

  private initializePlayer(): void {
    console.log("Initializing Scene4 player...");
    try {
      if (!this.tilemap) {
        console.error('Tilemap not initialized');
        return;
      }

      // Calculate bottom center position
      const mapWidth = this.tilemap.widthInPixels;
      const mapHeight = this.tilemap.heightInPixels;
      const startX = mapWidth / 2;
      const startY = mapHeight - 100;

      // Create player sprite at the correct starting position
      this.player = this.add.sprite(startX, startY, "rogue");
      this.player.setOrigin(0.5, 0.5);
      this.player.setScale(1);
      
      // Set initial idle animation
      this.player.anims.play("rogue_idle_down", true);
      
      // Set up camera to follow player
      this.cameras.main.startFollow(this.player, true);
      this.cameras.main.setFollowOffset(0, 0);
      this.cameras.main.setZoom(1);
      
      console.log("Scene4 player sprite created at:", { x: this.player.x, y: this.player.y });
    } catch (error) {
      console.error("Error in initializePlayer:", error);
    }
  }

  private initializeGridEngine(): void {
    if (!this.tilemap || !this.player) {
      console.error("Cannot initialize GridEngine: tilemap or player is null");
      return;
    }

    try {
      console.log("Initializing Scene4 GridEngine...");

      // Create the grid engine configuration
      const gridEngineConfig: GridEngineConfig = {
        characters: [
          {
            id: "player",
            sprite: this.player,
            startPosition: {
              x: Math.floor(this.player.x / 32),
              y: Math.floor(this.player.y / 32),
            },
            facingDirection: "down" as Direction,
            speed: 4,
          },
        ],
        collisionTilePropertyName: "collides",
      };

      // Create GridEngine manually
      console.log("Creating Scene4 GridEngine manually...");
      try {
        const manualGridEngine = new GridEngine(this);
        console.log("Scene4 Manual GridEngine created:", manualGridEngine);
        
        if (this.tilemap) {
          manualGridEngine.create(this.tilemap, gridEngineConfig);
          console.log("Scene4 Manual GridEngine initialized successfully");
          
          this.gridEngine = manualGridEngine as unknown as GridEngineInterface;
          this.gridEngineReady = true;
          
          // Reset any stuck movement state
          this.resetGridEngineMovement();
          
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
      }
      
    } catch (error) {
      console.error("Error initializing GridEngine:", error);
    }
  }

  private resetGridEngineMovement(): void {
    if (!this.gridEngine) return;
    
    console.log("🎬 Scene4 Resetting GridEngine movement state...");
    
    // Force stop any ongoing movement
    try {
      // Set the player to a known good position
      const currentPos = this.gridEngine.getPosition("player");
      console.log("🎬 Scene4 Current GridEngine position:", currentPos);
      
      // Force the position to be valid
      const validX = Math.max(0, Math.min(currentPos.x, 59));
      const validY = Math.max(0, Math.min(currentPos.y, 59));
      
      this.gridEngine.setPosition("player", { x: validX, y: validY });
      console.log("🎬 Scene4 Set GridEngine position to:", { x: validX, y: validY });
      
      // Update sprite position
      this.updateSpritePosition({ x: validX, y: validY });
      
    } catch (error) {
      console.error("🎬 Scene4 Error resetting GridEngine movement:", error);
    }
  }

  private setupGridEngineListeners() {
    if (!this.gridEngine) return;
    
    console.log("🎬 Scene4 Setting up GridEngine listeners...");
    
    // Listen for movement started
    this.gridEngine
      .movementStarted()
      .subscribe(({ charId, direction }: MovementEvent) => {
        console.log("🎬 Scene4 GridEngine: Movement started", { charId, direction });
        if (charId === "player" && this.player) {
          const position = this.gridEngine?.getPosition("player");
          if (position) {
            this.updateSpritePosition(position);
            this.playWalkingAnimation(direction);
            
            // Send position update to other players
            if (this.socket && this.roomId) {
              this.socket.emit("playerPosition", {
                playerId: this.socket.id,
                position: position,
                facingDirection: direction
              });
            }
          }
        }
      });

    // Listen for movement stopped
    this.gridEngine
      .movementStopped()
      .subscribe(({ charId, direction }: MovementEvent) => {
        console.log("🎬 Scene4 GridEngine: Movement stopped", { charId, direction });
        if (charId === "player" && this.player) {
          const position = this.gridEngine?.getPosition("player");
          if (position) {
            this.updateSpritePosition(position);
            this.playIdleAnimation(direction);
            
            // Send final position update to other players
            if (this.socket && this.roomId) {
              this.socket.emit("playerPosition", {
                playerId: this.socket.id,
                position: position,
                facingDirection: direction
              });
            }
          }
        }
      });

    // Listen for direction changes
    this.gridEngine
      .directionChanged()
      .subscribe(({ charId, direction }: MovementEvent) => {
        console.log("🎬 Scene4 GridEngine: Direction changed", { charId, direction });
        if (charId === "player" && this.player) {
          const position = this.gridEngine?.getPosition("player");
          if (position) {
            this.updateSpritePosition(position);
            this.playWalkingAnimation(direction);
          }
        }
      });

    // Listen for position change finished
    this.gridEngine
      .positionChangeFinished()
      .subscribe((data: any) => {
        console.log("🎬 Scene4 GridEngine: Position change finished", data);
        if (data.charId === "player" && this.player) {
          const position = this.gridEngine?.getPosition("player");
          if (position) {
            this.updateSpritePosition(position);
            this.playIdleAnimation(data.direction || "down");
          }
        }
      });
      
    console.log("🎬 Scene4 GridEngine listeners set up successfully");
  }

  private updateSpritePosition(position: { x: number; y: number }) {
    if (!this.player) {
      console.warn("🎬 Scene4 updateSpritePosition: Player is undefined, skipping position update");
      return;
    }
    
    const tileSize = 32; // Correct tile size for this map
    const pixelX = position.x * tileSize + tileSize / 2;
    const pixelY = position.y * tileSize + tileSize / 2;
    
    console.log("🎬 Scene4 Updating sprite position:", {
      tilePosition: position,
      pixelPosition: { x: pixelX, y: pixelY },
      currentSpritePosition: { x: this.player.x, y: this.player.y }
    });
    
    this.player.setPosition(pixelX, pixelY);
    console.log("🎬 Scene4 Sprite position after setPosition:", { x: this.player.x, y: this.player.y });
  }

  private playWalkingAnimation(direction: Direction) {
    if (!this.player) {
      console.warn("🎬 Scene4 playWalkingAnimation: Player is undefined, skipping animation");
      return;
    }
    
    if (!this.player.anims) {
      console.warn("🎬 Scene4 playWalkingAnimation: Player animations are undefined, skipping animation");
      return;
    }
    
    let animationKey = "rogue_walk_down"; // default
    
    switch (direction) {
      case "up":
        animationKey = "rogue_walk_up";
        break;
      case "down":
        animationKey = "rogue_walk_down";
        break;
      case "left":
        animationKey = "rogue_walk_left";
        break;
      case "right":
        animationKey = "rogue_walk_right";
        break;
    }
    
    console.log("🎬 Scene4 Playing walking animation:", animationKey);
    try {
      this.player.anims.play(animationKey, true);
    } catch (error) {
      console.error("🎬 Scene4 Error playing walking animation:", error);
    }
  }

  private playIdleAnimation(direction: Direction) {
    if (!this.player) {
      console.warn("🎬 Scene4 playIdleAnimation: Player is undefined, skipping animation");
      return;
    }
    
    if (!this.player.anims) {
      console.warn("🎬 Scene4 playIdleAnimation: Player animations are undefined, skipping animation");
      return;
    }
    
    let animationKey = "rogue_idle_down"; // default
    
    switch (direction) {
      case "up":
        animationKey = "rogue_idle_up";
        break;
      case "down":
        animationKey = "rogue_idle_down";
        break;
      case "left":
        animationKey = "rogue_idle_left";
        break;
      case "right":
        animationKey = "rogue_idle_right";
        break;
    }
    
    console.log("🎬 Scene4 Playing idle animation:", animationKey);
    try {
      this.player.anims.play(animationKey, true);
    } catch (error) {
      console.error("🎬 Scene4 Error playing idle animation:", error);
    }
  }

  private handleMovement(): void {
    if (!this.gridEngine || !this.gridEngineReady || !this.cursors || !this.wasdKeys) {
      console.log("🎬 Scene4 Movement blocked - missing dependencies:", {
        gridEngine: !!this.gridEngine,
        gridEngineReady: this.gridEngineReady,
        cursors: !!this.cursors,
        wasdKeys: !!this.wasdKeys
      });
      return;
    }

    // Only handle movement if the player is not currently moving
    if (this.gridEngine.isMoving("player")) {
      // Add debugging to see what's happening with the movement state
      const playerPosition = this.gridEngine.getPosition("player");
      const spritePosition = this.player ? { x: this.player.x, y: this.player.y } : null;
      console.log("🎬 Scene4 Player is already moving, skipping input. State:", {
        gridEnginePosition: playerPosition,
        spritePosition: spritePosition,
        isMoving: this.gridEngine.isMoving("player"),
        spriteVisible: this.player?.visible,
        spriteActive: this.player?.active
      });
      return;
    }

    let direction: Direction | null = null;

    // Check for input and set direction (only cardinal directions)
    if (this.cursors.left.isDown || this.wasdKeys.left.isDown) {
      direction = "left";
      console.log("🎬 Scene4 Left key pressed");
    } else if (this.cursors.right.isDown || this.wasdKeys.right.isDown) {
      direction = "right";
      console.log("🎬 Scene4 Right key pressed");
    } else if (this.cursors.up.isDown || this.wasdKeys.up.isDown) {
      direction = "up";
      console.log("🎬 Scene4 Up key pressed");
    } else if (this.cursors.down.isDown || this.wasdKeys.down.isDown) {
      direction = "down";
      console.log("🎬 Scene4 Down key pressed");
    }

    // Move the player if a direction is pressed
    if (direction) {
      console.log("🎬 Scene4 Attempting to move player:", direction);
      const beforePosition = this.gridEngine.getPosition("player");
      const beforeSpritePosition = this.player ? { x: this.player.x, y: this.player.y } : null;
      console.log("🎬 Scene4 Position before move:", beforePosition, "Sprite position:", beforeSpritePosition);
      
      // Check if the target position would be valid
      const targetX = beforePosition.x + (direction === "left" ? -1 : direction === "right" ? 1 : 0);
      const targetY = beforePosition.y + (direction === "up" ? -1 : direction === "down" ? 1 : 0);
      console.log("🎬 Scene4 Target position:", { x: targetX, y: targetY });
      
      // Check if target position is within map bounds
      if (targetX < 0 || targetX >= 60 || targetY < 0 || targetY >= 60) {
        console.log("🎬 Scene4 Movement blocked: Target position is outside map bounds");
        return;
      }
      
      // Check if target position has collision
      if (this.collisionLayer) {
        const targetTile = this.collisionLayer.getTileAt(targetX, targetY);
        if (targetTile && targetTile.index !== -1) {
          console.log("🎬 Scene4 Movement blocked: Target position has collision tile", targetTile.index);
          return;
        }
      }
      
      console.log("🎬 Scene4 Target position is walkable, attempting move");
      this.gridEngine.move("player", direction);
      console.log("🎬 Scene4 Move command sent to GridEngine");
      
      // Check position after move
      setTimeout(() => {
        const afterPosition = this.gridEngine?.getPosition("player");
        const afterSpritePosition = this.player ? { x: this.player.x, y: this.player.y } : null;
        const isStillMoving = this.gridEngine?.isMoving("player");
        console.log("🎬 Scene4 Position after move:", afterPosition, "Sprite position:", afterSpritePosition, "Still moving:", isStillMoving);
        
        // If the sprite moved but GridEngine thinks it's still moving, try to force completion
        if (isStillMoving && beforeSpritePosition && afterSpritePosition) {
          const spriteMoved = beforeSpritePosition.x !== afterSpritePosition.x || beforeSpritePosition.y !== afterSpritePosition.y;
          console.log("🎬 Scene4 Sprite moved:", spriteMoved);
          
          if (spriteMoved) {
            console.log("🎬 Scene4 Sprite moved but GridEngine still thinks it's moving - this might be a bug");
          } else {
            // If sprite didn't move and GridEngine is stuck, try to force completion
            console.log("🎬 Scene4 GridEngine is stuck, trying to force movement completion...");
            
            // Try to manually set the target position
            if (this.gridEngine && direction) {
              const targetX = beforePosition.x + (direction === "left" ? -1 : direction === "right" ? 1 : 0);
              const targetY = beforePosition.y + (direction === "up" ? -1 : direction === "down" ? 1 : 0);
              
              console.log("🎬 Scene4 Forcing GridEngine to target position:", { x: targetX, y: targetY });
              this.gridEngine.setPosition("player", { x: targetX, y: targetY });
              this.updateSpritePosition({ x: targetX, y: targetY });
            }
          }
        }
      }, 100);
    }
  }

  private checkForSceneTransition() {
    if (!this.gridEngine || !this.tilemap || !this.player) return;

    const playerPosition = this.gridEngine.getPosition("player");
    
    // Check if player is at the left border (any vertical position, but at the left)
    const leftBorderX = 0;
    
    if (playerPosition.x <= leftBorderX && !this.isTransitioning) {
      console.log("Player reached left border, triggering transition to WorldScene");
      this.isTransitioning = true;
      
      // Notify other players about the transition
      if (this.socket && this.roomId) {
        this.socket.emit("sceneTransition", {
          roomId: this.roomId,
          sceneName: "WorldScene",
          playerId: this.socket.id
        });
      }
      
      // Start the transition for this player
      this.startSceneTransition("WorldScene");
    }
  }

  private startSceneTransition(sceneName: string) {
    console.log(`🎬 Scene4 Starting transition to ${sceneName}`);
    
    // Pass multiplayer data to the next scene
    const transitionData = {
      socket: this.socket,
      roomId: this.roomId,
      playerId: this.playerId,
      username: this.username
    };
    
    // Stop the current scene (Scene4) and start the new scene
    this.scene.stop();
    this.scene.start(sceneName, transitionData);
  }

  setupSocketHandlers() {
    console.log("🎬 Scene4 Setting up socket handlers...");
    if (!this.socket) {
      console.warn("🎬 Scene4 Socket not available for setting up handlers");
      return;
    }

    this.socket.on("playerPosition", (data: { playerId: string, position: { x: number; y: number }, facingDirection: string }) => {
      console.log("🎬 Scene4: Received player position:", data);
      if (data.playerId !== this.playerId) {
        this.handlePlayerPosition(data.playerId, data.position, data.facingDirection);
      }
    });

    // Handle scene change events
    this.socket.on("playerSceneChanged", (data: { playerId: string; previousScene: string; newScene: string; player: any }) => {
      console.log("🎬 Scene4 Player scene changed:", data);
      
      if (data.playerId === this.playerId) {
        // This is our own scene change, ignore
        return;
      }
      
      if (data.previousScene === "scene4" && data.newScene !== "scene4") {
        // Player left Scene4, remove them
        console.log("🎬 Scene4 Player left Scene4, removing:", data.playerId);
        this.removeRemotePlayer(data.playerId);
      } else if (data.previousScene !== "scene4" && data.newScene === "scene4") {
        // Player entered Scene4, add them
        console.log("🎬 Scene4 Player entered Scene4, adding:", data.playerId);
        this.handlePlayerJoined(data.playerId, data.player);
      }
    });

    // Handle when we enter a scene and need to see other players
    this.socket.on("playersInScene", (data: { sceneName: string; players: any[] }) => {
      console.log("🎬 Scene4 Players in scene:", data);
      if (data.sceneName === "scene4") {
        // Add all players who are already in Scene4
        data.players.forEach((player) => {
          this.handlePlayerJoined(player.id, player);
        });
      }
    });

    // Handle when another player enters our scene
    this.socket.on("playerEnteredScene", (data: { sceneName: string; player: any }) => {
      console.log("🎬 Scene4 Player entered scene:", data);
      if (data.sceneName === "scene4") {
        this.handlePlayerJoined(data.player.id, data.player);
      }
    });

    // Remove automatic scene transition following - players should transition independently
    // this.socket.on("sceneTransition", (data: { roomId: string, sceneName: string, playerId: string }) => {
    //   console.log("Scene4: Received scene transition request:", data);
    //   if (data.playerId !== this.playerId && data.roomId === this.roomId) {
    //     console.log("Another player triggered scene transition, following...");
    //     this.startSceneTransition(data.sceneName);
    //   }
    // });
  }

  handlePlayerPosition(playerId: string, position: { x: number; y: number }, facingDirection: string) {
    console.log("Scene4: Received position from player:", playerId, position, facingDirection);
    
    const remoteCharId = `remote_${playerId}`;
    const remotePlayer = this.remotePlayers.get(playerId);
    
    if (this.gridEngine && this.gridEngine.hasCharacter(remoteCharId) && remotePlayer) {
      // Validate position is within reasonable bounds
      if (position.x < 0 || position.y < 0 || position.x > 50 || position.y > 50) {
        console.warn("Invalid position received:", position, "for player:", playerId);
        return;
      }
      
      // Update position in GridEngine
      this.gridEngine.setPosition(remoteCharId, position);
      
      // Calculate world position from tile position with precise centering
      const worldX = Math.round(position.x * 32 + 16);
      const worldY = Math.round(position.y * 32 + 16);
      remotePlayer.setPosition(worldX, worldY);
      
      // Update facing direction and animation
      this.gridEngine.turnTowards(remoteCharId, facingDirection as Direction);
      this.updateRemotePlayerAnimation(remoteCharId, facingDirection as Direction);
      
      console.log("Updated remote player position:", remoteCharId, position, { x: worldX, y: worldY });
    }
  }
  
  updateRemotePlayerAnimation(charId: string, direction: Direction) {
    const remotePlayer = this.remotePlayers.get(charId.replace("remote_", ""));
    if (!remotePlayer) return;
    
    const animMap = {
      up: "rogue_idle_up",
      down: "rogue_idle_down", 
      left: "rogue_idle_left",
      right: "rogue_idle_right"
    };
    
    const animName = animMap[direction];
    if (animName) {
      remotePlayer.anims.play(animName, true);
    }
  }

  handlePlayerJoined(playerId: string, playerData: { username: string }) {
    console.log("🎬 Scene4 Player joined:", playerId, playerData);
    
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
      console.log("🎬 Scene4 Sending position to new player:", currentPos);
      this.socket?.emit("playerPosition", {
        playerId: this.socket.id,
        position: currentPos,
        facingDirection: this.gridEngine.getFacingDirection("player")
      });
    }
  }

  addRemotePlayer(playerId: string, playerData: { username: string }, initialPosition?: { x: number; y: number }) {
    if (!this.player || !this.gridEngine) return;
    
    // Check if player already exists
    if (this.remotePlayers.has(playerId)) {
      console.log("🎬 Scene4 Player already exists, skipping creation:", playerId);
      return;
    }
    
    console.log("🎬 Scene4 Adding remote player:", playerId, playerData, "initial position:", initialPosition);
    
    // Use provided position or default to player's position
    const startPos = initialPosition || { x: 5, y: 5 };
    
    // Validate position
    if (startPos.x < 0 || startPos.y < 0 || startPos.x > 50 || startPos.y > 50) {
      console.warn("🎬 Scene4 Invalid initial position:", startPos, "using default");
      startPos.x = 5;
      startPos.y = 5;
    }
    
    const worldX = Math.round(startPos.x * 32 + 16);
    const worldY = Math.round(startPos.y * 32 + 16);
    
    // Create remote player sprite
    const remotePlayer = this.add.sprite(
      worldX,
      worldY,
      "rogue"
    );
    remotePlayer.setScale(1);
    remotePlayer.setOrigin(0.5, 0.5);
    
    // Set initial idle animation
    remotePlayer.anims.play("rogue_idle_down", true);
    
    this.remotePlayers.set(playerId, remotePlayer);
    
    // Add remote player to GridEngine with a unique character ID
    const remoteCharId = `remote_${playerId}`;
    if (!this.gridEngine.hasCharacter(remoteCharId)) {
      console.log("🎬 Scene4 Adding remote player to GridEngine:", remoteCharId, "at position:", startPos);
      this.gridEngine.addCharacter({
        id: remoteCharId,
        sprite: remotePlayer,
        startPosition: startPos,
        facingDirection: "down" as Direction,
        speed: 4,
      });
    } else {
      console.log("🎬 Scene4 Remote player already exists in GridEngine:", remoteCharId);
    }
  }

  removeRemotePlayer(playerId: string) {
    console.log("🎬 Scene4 Removing remote player:", playerId);
    
    const remotePlayer = this.remotePlayers.get(playerId);
    if (remotePlayer) {
      // Remove from GridEngine first
      const remoteCharId = `remote_${playerId}`;
      if (this.gridEngine && this.gridEngine.hasCharacter(remoteCharId)) {
        console.log("🎬 Scene4 Removing from GridEngine:", remoteCharId);
        this.gridEngine.removeCharacter(remoteCharId);
      }
      
      // Destroy the sprite
      remotePlayer.destroy();
      this.remotePlayers.delete(playerId);
      
      console.log("🎬 Scene4 Remote player removed successfully:", playerId);
    } else {
      console.warn("🎬 Scene4 Remote player not found for removal:", playerId);
    }
  }
} 