import { Scene } from "phaser";

export class PauseScene extends Scene {
  private overlay: Phaser.GameObjects.Image | null = null;
  private missionCard: Phaser.GameObjects.Container | null = null;
  private isPaused: boolean = false;
  private escKey: Phaser.Input.Keyboard.Key | null = null;

  constructor() {
    super({ key: "PauseScene" });
  }

  preload() {
    console.log("PauseScene: preload called");
    // Load the overlay image
    this.load.image('tutorial_overlay', '/assets/images/tutorial_overlay.webp');
  }

  create() {
    console.log("PauseScene: create called");
    
    // Create the overlay
    this.overlay = this.add.image(0, 0, 'tutorial_overlay');
    if (this.overlay) {
      this.overlay.setOrigin(0, 0);
      this.overlay.setDisplaySize(this.scale.width, this.scale.height);
      this.overlay.setScrollFactor(0);
      this.overlay.setDepth(1000);
      this.overlay.setVisible(false);
    }

    // Create mission card
    this.createMissionCard();

    // Set up ESC key listener
    if (this.input && this.input.keyboard) {
      this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.escKey.on('down', () => {
        console.log("ESC key pressed");
        this.togglePause();
      });
    }

    // Make sure the scene stays active
    this.scene.setVisible(true);
  }

  createMissionCard() {
    console.log("PauseScene: creating mission card");
    // Create a container for the mission card
    this.missionCard = this.add.container(this.scale.width / 2, this.scale.height / 2);
    this.missionCard.setDepth(1001);

    // Create background rectangle
    const background = this.add.rectangle(0, 0, 400, 200, 0x000000, 0.9);
    background.setStrokeStyle(2, 0xffffff);

    // Create mission title
    const title = this.add.text(0, -60, 'PAUSED', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Create mission description
    const description = this.add.text(0, 0, 'Press ESC to Resume', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5);

    // Add all elements to the container
    this.missionCard.add([background, title, description]);
    this.missionCard.setVisible(false);
  }

  togglePause() {
    console.log("PauseScene: togglePause called, current state:", this.isPaused);
    if (!this.overlay || !this.missionCard) {
      console.log("PauseScene: overlay or missionCard is null");
      return;
    }

    this.isPaused = !this.isPaused;
    this.overlay.setVisible(this.isPaused);
    this.missionCard.setVisible(this.isPaused);

    // Pause/resume all game scenes
    const gameScenes = ['WorldScene', 'Scene3', 'Scene4', 'IntroScene'];
    gameScenes.forEach(sceneKey => {
      const scene = this.scene.get(sceneKey);
      if (scene) {
        if (this.isPaused) {
          console.log(`PauseScene: pausing ${sceneKey}`);
          scene.scene.pause();
        } else {
          console.log(`PauseScene: resuming ${sceneKey}`);
          scene.scene.resume();
        }
      }
    });
  }
} 