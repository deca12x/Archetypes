import Phaser from "phaser";
import { Socket } from "socket.io-client";

export class IntroScene extends Phaser.Scene {
  private video!: Phaser.GameObjects.Video;
  private socket: Socket | null = null;
  private mapKey: string = "world";
  private backgroundMusic!: Phaser.Sound.BaseSound;
  private overlayImage!: Phaser.GameObjects.Image;
  private messageText!: Phaser.GameObjects.Text;
  private currentMessageIndex: number = 0;
  private readonly messages: string[] = [
    "Their cores are draining fast.\nNo juice, no protection.",
    "Alright. No turning back.\nFind the market before night.",
    "There — just past the ridge.\nIf I don't trade now, I'm done.",
    "Burns like hell.\nHope the coolant holds."
  ];

  constructor() {
    super({ key: "IntroScene" });
    console.log("IntroScene constructor called");
  }

  init(data: any) {
    console.log("IntroScene init called");
    this.socket = data.socket;
    this.mapKey = data.mapKey || "world";
  }

  preload() {
    console.log("IntroScene preload started");
    // Load the video
    this.load.video("scene1", "/assets/videos/scene1final_optimized.webm");
    
    // Add loading event listeners
    this.load.on("progress", (value: number) => {
      console.log(`Video loading progress: ${value * 100}%`);
    });

    this.load.on("complete", () => {
      console.log("Video loading complete");
    });

    this.load.on("loaderror", (file: any) => {
      console.error("Error loading video:", file.src);
    });

    console.log("Video loading started");
  }

  create() {
    console.log("IntroScene create started");
    
    // Start background music
    this.backgroundMusic = this.sound.add('background_music', {
      volume: 0.5,
      loop: true
    });
    this.backgroundMusic.play();
    
    // Create video
    this.video = this.add.video(0, 0, "scene1");
    if (!this.video) {
      console.error("Failed to create video");
      return;
    }
    console.log("Video object created");

    // Get dimensions
    const gameWidth = this.cameras.main.width;
    const gameHeight = this.cameras.main.height;
    const videoWidth = this.video.width;
    const videoHeight = this.video.height;

    console.log("=== Video Sizing Details ===");
    console.log("Game Viewport:", {
      width: gameWidth,
      height: gameHeight,
      aspectRatio: gameWidth / gameHeight
    });
    console.log("Original Video:", {
      width: videoWidth,
      height: videoHeight,
      aspectRatio: videoWidth / videoHeight
    });

    // Calculate scale to fit width with extra zoom out
    const scale = (gameWidth / videoWidth) * 0.4; // Reduce scale to 40% of original
    const scaledWidth = videoWidth * scale;
    const scaledHeight = videoHeight * scale;

    console.log("Scaling Calculations:", {
      scaleFactor: scale,
      scaledWidth: scaledWidth,
      scaledHeight: scaledHeight,
      scaledAspectRatio: scaledWidth / scaledHeight
    });

    // Set video size with zoomed out scale
    this.video.setDisplaySize(scaledWidth, scaledHeight);
    
    // Center the video
    this.video.setPosition(gameWidth / 2, gameHeight / 2);
    this.video.setOrigin(0.5, 0.5);

    // Add overlay image
    this.overlayImage = this.add.image(gameWidth / 2, gameHeight / 2, 'tutorial_overlay');
    this.overlayImage.setOrigin(0.5, 0.5);
    this.overlayImage.setDisplaySize(gameWidth * 0.5, gameHeight * 0.5); // Make overlay 50% of screen size
    this.overlayImage.setAlpha(0); // Start fully transparent
    this.overlayImage.setDepth(1000); // Ensure overlay is on top of video

    // Create message text with word wrap
    this.messageText = this.add.text(gameWidth / 2, gameHeight * 0.8, '', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000',
        blur: 2,
        stroke: true,
        fill: true
      },
      wordWrap: { width: gameWidth * 0.4 } // Make text width 40% of screen width
    });
    this.messageText.setOrigin(0.5, 0.5);
    this.messageText.setDepth(2000); // Ensure text is above everything
    
    console.log("Final Video Position:", {
      x: gameWidth / 2,
      y: gameHeight / 2,
      displayWidth: this.video.displayWidth,
      displayHeight: this.video.displayHeight
    });
    console.log("=== End Video Sizing Details ===");

    // Start with black screen
    this.cameras.main.setAlpha(0);
    
    // Fade in
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 1,
      duration: 2000,
      onComplete: () => {
        console.log("Fade in complete");
        // Start playing the video after fade in
        if (this.video) {
          console.log("Starting video playback");
          this.video.play();
        }
        // Show first message at 4 seconds
        this.time.delayedCall(4000, () => {
          this.showNextMessage();
        });
        // Fade in overlay after 2 seconds
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: this.overlayImage,
            alpha: 1,
            duration: 1000,
            onComplete: () => {
              // Fade out overlay after 3 seconds
              this.time.delayedCall(3000, () => {
                this.tweens.add({
                  targets: this.overlayImage,
                  alpha: 0,
                  duration: 1000
                });
              });
            }
          });
        });
      }
    });

    // Listen for video completion
    this.video.on("complete", () => {
      console.log("Video completed");
      this.onVideoComplete();
    });

    // Add error handling for video
    this.video.on("error", (error: any) => {
      console.error("Video error:", error);
    });

    console.log("IntroScene setup complete");
  }

  private showNextMessage() {
    if (this.currentMessageIndex >= this.messages.length) {
      return;
    }

    const message = this.messages[this.currentMessageIndex];
    
    // If this is the second message (index 1), we'll keep it visible
    if (this.currentMessageIndex === 1) {
      this.messageText.setText(message);
      this.messageText.setAlpha(1);
      // Wait 3 seconds before moving to next message
      this.time.delayedCall(3000, () => {
        this.currentMessageIndex++;
        this.showNextMessage();
      });
      return;
    }

    // For other messages, use the typewriter effect
    this.messageText.setText('');
    this.messageText.setAlpha(1);

    // Typewriter effect
    let i = 0;
    const typewriterInterval = this.time.addEvent({
      delay: 50,
      callback: () => {
        this.messageText.text += message[i];
        i++;
        if (i >= message.length) {
          typewriterInterval.destroy();
          // Wait 3 seconds after typing completes
          this.time.delayedCall(3000, () => {
            // Fade out current message
            this.tweens.add({
              targets: this.messageText,
              alpha: 0,
              duration: 1000,
              onComplete: () => {
                this.currentMessageIndex++;
                // Show next message after 1 second
                this.time.delayedCall(1000, () => {
                  this.showNextMessage();
                });
              }
            });
          });
        }
      },
      callbackScope: this,
      repeat: message.length - 1
    });
  }

  onVideoComplete() {
    console.log("onVideoComplete called");
    // Fade out and transition to WorldScene
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 0,
      duration: 2000,
      onComplete: () => {
        console.log("Fade out complete, transitioning to WorldScene");
        // Don't stop the music when transitioning
        this.scene.start("WorldScene", {
          socket: this.socket,
          mapKey: this.mapKey,
          music: this.backgroundMusic // Pass the music instance to the next scene
        });
      }
    });
  }
} 