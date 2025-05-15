import { Scene, GameObjects } from "phaser";
import { PLAYER_SIZE } from "../../../lib/game/constants/game";
import { Maps, Sprites, Tilesets } from "../../../lib/game/constants/assets";
import { UIEvents } from "../../../lib/game/constants/events";
import { dispatch } from "../../../lib/game/utils/ui";
import { useUIStore } from "../../../lib/game/stores/ui";
import { useSocket } from "@/lib/hooks/useSocket";

export default class BootScene extends Scene {
  text!: GameObjects.Text;
  private socket: any = null;

  constructor() {
    super("Boot");
  }

  init() {
    // Initialize socket connection
    // This gets a reference to our socket instance from the hook
    if (typeof window !== "undefined") {
      // We need to get the socket somehow - one approach is to make it a global in the client browser
      this.socket = (window as any).__gameSocket;
    }
  }

  launchGame(): void {
    this.sound.pauseOnBlur = false;
    // Start UI scene first, then World scene
    this.scene.start("UI");
    this.scene.start("WorldScene", { socket: this.socket });
  }

  preload(): void {
    this.load.on("progress", (value: number) => {
      dispatch<number>(UIEvents.LOADING_PROGRESS, value);
    });

    this.load.on("complete", () => {
      useUIStore.getState().setLoading(false);
      this.launchGame();
    });

    this.loadImages();
    this.loadSpriteSheets();
    this.loadMaps();

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
  }

  loadImages(): void {
    // Tilesets
    Object.values(Tilesets).forEach((tileset) => {
      this.load.image(tileset, `assets/tilesets/${tileset}.png`);
    });
  }

  loadMaps(): void {
    const maps = Object.values(Maps);

    for (const map of maps) {
      this.load.tilemapTiledJSON(map, `assets/maps/${map}.json`);
    }
  }

  loadSpriteSheets(): void {
    const sprites = Object.values(Sprites);

    sprites.forEach((sprite) => {
      this.load.spritesheet(sprite, `assets/images/characters/${sprite}.png`, {
        frameWidth: PLAYER_SIZE.width,
        frameHeight: PLAYER_SIZE.height,
      });
    });
  }

  createAnimations(): void {
    // Create walking animations for each character
    this.createWalkingAnimation(Sprites.WIZARD, 12); // Wizard has 12 frames
    this.createWalkingAnimation(Sprites.RULER, 12); // Ruler has 12 frames
    this.createWalkingAnimation(Sprites.HERO, 12); // Hero has 12 frames
  }

  createWalkingAnimation(spriteKey: string, frameCount: number): void {
    console.log(`Creating walking animation for ${spriteKey}`);
    this.anims.create({
      key: `${spriteKey}_walk`,
      frames: this.anims.generateFrameNumbers(spriteKey, { start: 0, end: frameCount - 1 }),
      frameRate: 10,
      repeat: -1
    });
  }

  create(): void {
    this.createAnimations();
    this.launchGame();
  }
}
