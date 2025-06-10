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
    this.load.on("progress", (value: number) => {
      console.log(`Loading progress: ${value * 100}%`);
      dispatch<number>(UIEvents.LOADING_PROGRESS, value);
    });

    this.load.on("complete", () => {
      console.log("All assets loaded successfully");
      useUIStore.getState().setLoading(false);
      this.launchGame();
    });

    this.load.on("loaderror", (file: any) => {
      console.error("Error loading asset:", file.src);
    });

    // Create loading text
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: "Loading...",
      style: {
        font: "20px monospace",
        fill: "#ffffff",
      } as any,
    });
    loadingText.setOrigin(0.5, 0.5);

    // Load all required assets
    this.loadImages();
    this.loadSpriteSheets();
    this.loadMaps();
  }

  loadImages(): void {
    console.log("Loading images...");
    // Load map
    this.load.tilemapTiledJSON("desert_gate", "/assets/maps/desert_gate.json");

    // Load tileset
    this.load.image("desertgate", "/assets/tilesets/scene2map_topdown.webp");

    // Load player sprite (wizard)
    this.load.spritesheet("player", "/assets/images/characters/wizard.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    // Load rogue sprite sheet
    this.load.spritesheet("rogue", "/assets/sprites/rogue_sheet.webp", {
      frameWidth: 48,
      frameHeight: 48
    });
    console.log("Images loaded");
  }

  loadMaps(): void {
    // No additional maps needed
  }

  loadSpriteSheets(): void {
    // Already loaded in loadImages
  }

  create(): void {
    console.log("Creating animations...");
    // Create animations for the player
    this.anims.create({
      key: 'player_idle',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'player_walk',
      frames: this.anims.generateFrameNumbers('player', { start: 4, end: 11 }),
      frameRate: 12,
      repeat: -1
    });

    // Create rogue animations
    this.anims.create({
      key: "rogue_idle",
      frames: this.anims.generateFrameNumbers("rogue", { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1,
    });

    // Walking animations for each direction
    this.anims.create({
      key: "rogue_walk_up",
      frames: this.anims.generateFrameNumbers("rogue", { start: 0, end: 2 }), // First row
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "rogue_walk_right",
      frames: this.anims.generateFrameNumbers("rogue", { start: 3, end: 5 }), // Second row
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "rogue_walk_left",
      frames: this.anims.generateFrameNumbers("rogue", { start: 6, end: 8 }), // Third row
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "rogue_walk_down",
      frames: this.anims.generateFrameNumbers("rogue", { start: 9, end: 11 }), // Fourth row
      frameRate: 10,
      repeat: -1,
    });
    console.log("Animations created");

    // Start the world scene
    this.scene.start("WorldScene", {
      socket: this.socket,
      mapKey: this.mapKey
    });
  }
}
