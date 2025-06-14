import { Scene } from "phaser";
import { Maps, Tilesets, Layers } from "../../../lib/game/constants/assets";

export default class TourScene extends Scene {
  private tourText!: Phaser.GameObjects.Text;
  private continueText!: Phaser.GameObjects.Text;
  private currentStep: number = 0;
  private map!: Phaser.Tilemaps.Tilemap;
  private player!: Phaser.GameObjects.Sprite;
  private camera!: Phaser.Cameras.Scene2D.Camera;
  private highlight!: Phaser.GameObjects.Rectangle;

  private readonly tourSteps = [
    {
      text: "Welcome to Archetypes! Let's learn how to play!",
      position: { x: 5, y: 5 }
    },
    {
      text: "MOVEMENT: Use WASD or Arrow Keys to move your character around",
      position: { x: 10, y: 10 }
    },
    {
      text: "CHARACTER SWAP: Press P to switch between different characters\nEach character has unique abilities!",
      position: { x: 15, y: 15 }
    },
    {
      text: "ATTACK: Press X to attack and interact with the world",
      position: { x: 20, y: 20 }
    },
    {
      text: "MUSIC: Press M to toggle the game music on/off",
      position: { x: 25, y: 25 }
    },
    {
      text: "MENU: Press ESC to open the game menu",
      position: { x: 30, y: 30 }
    },
    {
      text: "Ready to begin your adventure? Press SPACE to start!",
      position: { x: 35, y: 35 }
    }
  ];

  constructor() {
    super("Tour");
    console.log("TourScene constructor called");
  }

  init() {
    console.log("TourScene init called");
  }

  preload() {
    console.log("TourScene preload started");
    // Load the map
    this.load.tilemapTiledJSON(Maps.DESERT_GATE, '/assets/maps/desert_gate.json');
    
    // Load tilesets
    Object.values(Tilesets).forEach((tileset) => {
      this.load.image(tileset, `/assets/tilesets/${tileset}.png`);
    });
    console.log("TourScene preload completed");
  }

  create() {
    console.log("TourScene create started");
    
    // Create the map
    this.map = this.make.tilemap({ key: Maps.DESERT_GATE });
    
    // Add tilesets
    const all_tilesets = Object.values(Tilesets).reduce(
      (acc: Phaser.Tilemaps.Tileset[], value: Tilesets) => {
        if (this.map.tilesets.find(({ name }) => name === value)) {
          const tileset = this.map.addTilesetImage(value);
          if (tileset) {
            acc = [...acc, tileset];
          }
        }
        return acc;
      },
      []
    );

    // Create layers in the correct order
    Object.values(Layers)
      .filter((layer) => layer !== Layers.OBJECTS)
      .forEach((layer) => {
        this.map.createLayer(layer, all_tilesets);
      });
    
    // Add semi-transparent background
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7  // Increased opacity for better text visibility
    );
    bg.setScrollFactor(0);
    bg.setDepth(1000); // Ensure background is on top
    console.log("Background added");

    // Create highlight rectangle
    this.highlight = this.add.rectangle(0, 0, 64, 64, 0xffff00, 0.3);
    this.highlight.setStrokeStyle(2, 0xffff00);
    this.highlight.setVisible(false);
    this.highlight.setDepth(1001); // Ensure highlight is above background

    // Add tour text with improved visibility
    this.tourText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      this.tourSteps[0].text,
      {
        fontSize: '28px',  // Increased font size
        color: '#ffffff',
        align: 'center',
        fontFamily: 'Arial',
        wordWrap: { width: this.cameras.main.width - 100 },
        stroke: '#000000',  // Added text stroke for better visibility
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    this.tourText.setDepth(1002); // Ensure text is above highlight
    console.log("Tour text added");

    // Add continue text with improved visibility
    this.continueText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 50,
      "Press SPACE to continue",
      {
        fontSize: '24px',  // Increased font size
        color: '#ffffff',
        align: 'center',
        fontFamily: 'Arial',
        stroke: '#000000',  // Added text stroke for better visibility
        strokeThickness: 3
      }
    ).setOrigin(0.5);
    this.continueText.setDepth(1002); // Ensure text is above highlight
    console.log("Continue text added");

    // Add blinking animation to continue text
    this.tweens.add({
      targets: this.continueText,
      alpha: 0,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    // Listen for space key to advance tour
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => {
      this.nextStep();
    });

    // Set camera bounds to map size
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );

    // Start with first step
    this.showStep(0);
    console.log("TourScene create completed");
  }

  private showStep(stepIndex: number) {
    console.log("Showing tour step:", stepIndex);
    const step = this.tourSteps[stepIndex];
    
    // Update text
    this.tourText.setText(step.text);
    console.log("Updated tour text:", step.text);

    // Move camera to position
    this.cameras.main.pan(
      step.position.x * 32, // Convert tile position to pixels
      step.position.y * 32,
      1000,
      'Power2'
    );

    // Show highlight at position
    this.highlight.setPosition(
      step.position.x * 32 + 16, // Center in tile
      step.position.y * 32 + 16
    );
    this.highlight.setVisible(true);

    // Add highlight animation
    this.tweens.add({
      targets: this.highlight,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
  }

  private nextStep() {
    console.log("Moving to next tour step");
    this.currentStep++;
    
    if (this.currentStep < this.tourSteps.length) {
      // Show next tour step
      this.showStep(this.currentStep);
    } else {
      // End tour and start game
      console.log("Tour completed, starting WorldScene");
      this.scene.start("WorldScene");
    }
  }
} 