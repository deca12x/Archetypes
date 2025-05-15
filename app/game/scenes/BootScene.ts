import { Scene, GameObjects } from "phaser";
import { PLAYER_SIZE } from "../../../lib/game/constants/game";
import { Maps, Sprites, Tilesets, PLAYABLE_CHARACTERS } from "../../../lib/game/constants/assets";
import { UIEvents } from "../../../lib/game/constants/events";
import { dispatch } from "../../../lib/game/utils/ui";
import { useUIStore } from "../../../lib/game/stores/ui";
import { useSocket } from "@/lib/hooks/useSocket";
import { CharacterSounds } from "../../../lib/game/constants/sounds";

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

    this.load.on("filecomplete", (key: string) => {
      console.log('Loaded file:', key);
    });

    this.load.on("loaderror", (file: any) => {
      console.error('Error loading file:', file.key);
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

    // Load all character spritesheets
    this.load.spritesheet(Sprites.WIZARD, '/assets/images/characters/wizard attack.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet(Sprites.EXPLORER, '/assets/images/characters/explorer_spritesheet_final.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet(Sprites.RULER, '/assets/images/characters/rulerattack.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet(Sprites.HERO, '/assets/images/characters/hero_attack_spritesheet.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Load cloud sprite with correct dimensions
    this.load.spritesheet(Sprites.CLOUD, '/assets/images/characters/cloud.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Load character sounds
    console.log('Loading character sounds...');
    
    // Load cloud sound first to ensure it's available
    console.log('Loading cloud sound...');
    this.load.audio('cloud', '/assets/sounds/cloud.wav');
    
    // Load available attack sounds
    console.log('Loading character attack sounds...');
    this.load.audio(CharacterSounds.EXPLORER_ATTACK, '/assets/sounds/characters/explorer_attack.wav');
    this.load.audio(CharacterSounds.HERO_ATTACK, '/assets/sounds/characters/hero_attack.wav');
    
    // Load game soundtrack
    console.log('Loading game soundtrack...');
    this.load.audio(CharacterSounds.SOUNDTRACK, '/assets/sounds/game_soundtrack.mp3');
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
      if (sprite === Sprites.CLOUD) {
        // Load cloud sprite with same dimensions as player
        this.load.spritesheet(sprite, `assets/images/characters/${sprite}.png`, {
          frameWidth: PLAYER_SIZE.width,
          frameHeight: PLAYER_SIZE.height,
        });
      } else {
        this.load.spritesheet(sprite, `assets/images/characters/${sprite}.png`, {
          frameWidth: PLAYER_SIZE.width,
          frameHeight: PLAYER_SIZE.height,
        });
      }
    });
  }

  createAnimations(): void {
    try {
      // Create walking animations for each character
      this.createWalkingAnimation(Sprites.WIZARD, 12); // Wizard has 12 frames
      this.createWalkingAnimation(Sprites.EXPLORER, 12); // Explorer has 12 frames
      this.createWalkingAnimation(Sprites.RULER, 12); // Ruler has 12 frames
      this.createWalkingAnimation(Sprites.HERO, 12); // Hero has 12 frames

      // Create cloud animation
      this.createCloudAnimation();
    } catch (error) {
      console.error('Error creating animations:', error);
    }
  }

  createWalkingAnimation(spriteKey: string, frameCount: number): void {
    try {
      console.log(`Creating walking animation for ${spriteKey}`);
      if (!this.textures.exists(spriteKey)) {
        console.error(`Texture does not exist for ${spriteKey}`);
        return;
      }

      const frames = this.anims.generateFrameNumbers(spriteKey, { 
        start: 0, 
        end: frameCount - 1,
        first: 0
      });

      if (!frames || frames.length === 0) {
        console.error(`Failed to generate frames for ${spriteKey}`);
        return;
      }

      this.anims.create({
        key: `${spriteKey}_walk`,
        frames: frames,
        frameRate: 10,
        repeat: -1
      });

      console.log(`Walking animation created for ${spriteKey}`);
    } catch (error) {
      console.error(`Error creating walking animation for ${spriteKey}:`, error);
    }
  }

  createCloudAnimation(): void {
    try {
      console.log('Creating cloud animation');
      if (!this.textures.exists(Sprites.CLOUD)) {
        console.error('Cloud texture does not exist:', Sprites.CLOUD);
        return;
      }

      // Create cloud animation with proper frame configuration
      this.anims.create({
        key: 'cloud_puff',
        frames: this.anims.generateFrameNumbers(Sprites.CLOUD, { 
          start: 0, 
          end: 3,
          first: 0
        }),
        frameRate: 8,
        repeat: 0,
        hideOnComplete: true
      });

      console.log('Cloud animation created successfully');
    } catch (error) {
      console.error('Error creating cloud animation:', error);
    }
  }

  create(): void {
    this.createAnimations();
    // Start with world scene
    this.scene.start("WorldScene", { socket: this.socket });
  }
}
