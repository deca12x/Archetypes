import { Scene } from "phaser";

export class TutorialScene extends Scene {
  private continueText!: Phaser.GameObjects.Text;
  private tutorialText!: Phaser.GameObjects.Text;
  private currentStep: number = 0;
  private readonly tutorialSteps = [
    "Welcome to Archetypes!",
    "Arrow Keys to move",
    "Press P to swap between characters",
    "Press X to attack",
    "Press M to toggle music",
    "Press ESC to open menu",
    "Let's begin your adventure!",
  ];

  constructor() {
    super("Tutorial");
    console.log("TutorialScene constructor called");
  }

  init() {
    console.log("TutorialScene init called");
  }

  create() {
    console.log("TutorialScene create started");
    // Add semi-transparent background
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    );
    bg.setScrollFactor(0);
    bg.setDepth(1000);
    console.log("Background added");

    // Add tutorial text
    this.tutorialText = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 - 50,
        this.tutorialSteps[0],
        {
          fontSize: "32px",
          color: "#ffffff",
          align: "center",
          fontFamily: "Arial",
          stroke: "#000000",
          strokeThickness: 4,
        }
      )
      .setOrigin(0.5);
    this.tutorialText.setDepth(1001);
    console.log("Tutorial text added");

    // Add continue text
    this.continueText = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 50,
        "Press SPACE to continue",
        {
          fontSize: "24px",
          color: "#ffffff",
          align: "center",
          fontFamily: "Arial",
          stroke: "#000000",
          strokeThickness: 3,
        }
      )
      .setOrigin(0.5);
    this.continueText.setDepth(1001);
    console.log("Continue text added");

    // Add blinking animation to continue text
    this.tweens.add({
      targets: this.continueText,
      alpha: 0,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    // Listen for space key to advance tutorial
    this.input.keyboard
      ?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      .on("down", () => {
        this.nextStep();
      });
    console.log("TutorialScene create completed");
  }

  private nextStep() {
    console.log("Moving to next tutorial step");
    this.currentStep++;

    if (this.currentStep < this.tutorialSteps.length) {
      // Show next tutorial step
      this.tutorialText.setText(this.tutorialSteps[this.currentStep]);
      console.log(
        "Updated tutorial text:",
        this.tutorialSteps[this.currentStep]
      );
    } else {
      // End tutorial and start tour
      console.log("TutorialScene: Transitioning to Tour");
      this.scene.start("Tour");
    }
  }
}
