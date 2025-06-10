import { Scene, GameObjects } from "phaser";
import { PLAYER_SIZE } from "../../../lib/game/constants/game";
import { Maps, Sprites, Tilesets } from "../../../lib/game/constants/assets";
import { UIEvents } from "../../../lib/game/constants/events";
import { dispatch } from "../../../lib/game/utils/ui";
import { useUIStore } from "../../../lib/game/stores/ui";
import { useSocket } from "@/lib/hooks/useSocket";
import { Socket } from "socket.io-client";

export default class BootScene extends Scene {
  text!: GameObjects.Text;
  private socket: Socket | null = null;
  private mapKey: string = "world";
  private loadingTimeout: NodeJS.Timeout | null = null;
  private readonly LOADING_TIMEOUT = 10000; // 10 seconds timeout

  constructor() {
    super("BootScene");
  }

  init(data: any) {
    this.socket = data.socket;
    this.mapKey = data.mapKey || "world";
  }

  launchGame(): void {
    this.sound.pauseOnBlur = false;
    // Pass socket to WorldScene
    this.scene.start("WorldScene", { 
      socket: this.socket,
      mapKey: this.mapKey // Using map.json as our main map
    });
  }

  preload(): void {
    // Set up loading events
    this.load.on('start', () => {
      console.log('Asset preloading started');
      this.startLoadingTimeout();
    });

    this.load.on('progress', (value: number) => {
      console.log(`Preloading progress: ${(value * 100).toFixed(0)}%`);
      this.events.emit('loadingProgress', {
        progress: value * 100,
        currentAsset: 'Preloading assets...',
        totalAssets: this.load.totalComplete,
        loadedAssets: this.load.totalComplete
      });
    });

    this.load.on('complete', () => {
      console.log('Preloading complete');
      this.clearLoadingTimeout();
    });

    this.load.on('loaderror', (file: any) => {
      console.error('Error preloading asset:', file.src);
      this.clearLoadingTimeout();
    });

    // Load essential assets first
    this.loadEssentialAssets();
  }

  private loadEssentialAssets() {
    // Load player sprites (essential for gameplay)
    this.load.image('elder', '/assets/sprites/elder_topdown.webp');
    this.load.image('rogue', '/assets/sprites/rogue_sheet.webp');
    
    // Load UI assets
    this.load.image('compass', '/assets/sprites/compass.webp');
  }

  private startLoadingTimeout() {
    this.clearLoadingTimeout();
    this.loadingTimeout = setTimeout(() => {
      console.warn('Loading timeout reached, proceeding with available assets');
      this.scene.start('WorldScene');
    }, this.LOADING_TIMEOUT);
  }

  private clearLoadingTimeout() {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
  }

  create(): void {
    // Start loading non-essential assets in the background
    this.loadNonEssentialAssets();
    
    // Start the world scene
    this.scene.start('WorldScene');
  }

  private loadNonEssentialAssets() {
    // Load audio in the background
    this.load.audio('soundtrack', '/assets/sounds/game_soundtrack.mp3');
    
    // Load additional UI assets
    this.load.image('desert_remains', '/assets/tilesets/desert_remains.png');
    this.load.image('desert_sands', '/assets/tilesets/desertsands.webp');
    
    // Start loading
    this.load.start();
  }

  loadImages(): void {
    console.log("Starting to load images...");
    try {
      // Load all tilemaps
      this.load.tilemapTiledJSON("desert_gate", "/assets/maps/desert_gate.json");
      this.load.tilemapTiledJSON("scene3", "/assets/maps/scene3.json");
      this.load.tilemapTiledJSON("scene4", "/assets/maps/scene4.json");

      // Load all tilesets
      this.load.image("desertgate", "/assets/tilesets/scene2map_topdown.webp");
      this.load.image("scene3", "/assets/tilesets/scene3.png");
      this.load.image("scene4", "/assets/tilesets/desert_remains.png");

      // Load player sprite (wizard)
      this.load.spritesheet("player", "/assets/images/characters/wizard.png", {
        frameWidth: 48,
        frameHeight: 48
      });

      // Load rogue sprite sheet
      console.log("Loading rogue sprite...");
      this.load.spritesheet("rogue", "assets/sprites/rogue_sheet.webp", {
        frameWidth: 48,
        frameHeight: 48,
      });

      // Load background music
      console.log("Loading background music...");
      this.load.audio('background_music', '/assets/sounds/game_soundtrack.mp3');
      
      console.log("All assets loaded successfully");
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  }

  loadMaps(): void {
    // No additional maps needed
  }

  loadSpriteSheets(): void {
    // Already loaded in loadImages
  }
}
