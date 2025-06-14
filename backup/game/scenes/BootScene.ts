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
    // Pass socket to WorldScene
    this.scene.start("WorldScene", { socket: this.socket });
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
    console.log("Loading tileset:", Tilesets.DESERT_GATE);
    this.load.image(Tilesets.DESERT_GATE, `assets/tilesets/${Tilesets.DESERT_GATE}.png`);
  }

  loadMaps(): void {
    const maps = Object.values(Maps);
    console.log("Loading maps:", maps);

    for (const map of maps) {
      console.log("Loading map:", map);
      this.load.tilemapTiledJSON(map, `assets/maps/${map}.json`);
    }
  }

  loadSpriteSheets(): void {
    // Define available character sprites
    const sprites = ["wizard", "explorer", "hero", "ruler"];
    console.log("Loading sprites:", sprites);

    sprites.forEach((sprite) => {
      console.log("Loading sprite:", sprite);
      this.load.spritesheet(sprite, `assets/images/characters/${sprite}.png`, {
        frameWidth: PLAYER_SIZE.width,
        frameHeight: PLAYER_SIZE.height,
      });
    });
  }

  // [Rest of the code remains the same]
}
