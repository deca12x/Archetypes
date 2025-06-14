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
    "Alright. No turning back.\nFind the market before night."
  ];

  constructor() {
    super({ key: "IntroScene" });
  }

  init(data: { socket?: Socket; mapKey?: string }) {
    console.log("IntroScene init started");
    this.socket = data.socket || null;
    this.mapKey = data.mapKey || "world";
    console.log("Socket initialized:", this.socket ? "Yes" : "No");
  }

  preload() {
    console.log("IntroScene preload started");
    
    // Load the video
    this.load.video("scene1", "/assets/videos/scene1final_optimized.webm");
    
    // Load background music
    this.load.audio('background_music', '/assets/sounds/game_soundtrack.mp3');
    
    // Load overlay image
    this.load.image('tutorial_overlay', '/assets/images/tutorial_overlay.png');
    
    // Add loading event listeners
    this.load.on("progress", (value: number) => {
      console.log("Loading progress:", value);
    });

    this.load.on("complete", () => {
      console.log("All assets loaded");
    });

    this.load.on("loaderror", (file: any) => {
      console.error("Error loading video:", file.src);
    });
  }

  create() {
    console.log("IntroScene create started");
    
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

    // Calculate scale to fit width with extra zoom out
    const scale = (gameWidth / videoWidth) * 0.4; // Reduce scale to 40% of original
    const scaledWidth = videoWidth * scale;
    const scaledHeight = videoHeight * scale;

    // Set video size with zoomed out scale
    this.video.setDisplaySize(scaledWidth, scaledHeight);
    
    // Center the video
    this.video.setPosition(gameWidth / 2, gameHeight / 2);
    this.video.setOrigin(0.5, 0.5);

    // Add overlay image
    this.overlayImage = this.add.image(gameWidth / 2, gameHeight / 2, 'tutorial_overlay');
    this.overlayImage.setOrigin(0.5, 0.5);
    this.overlayImage.setDisplaySize(gameWidth * 0.5, gameHeight * 0.5);
    this.overlayImage.setAlpha(0);
    this.overlayImage.setDepth(1000);

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
      wordWrap: { width: gameWidth * 0.4 }
    });
    this.messageText.setOrigin(0.5, 0.5);
    this.messageText.setDepth(2000);

    // Create click to start text
    const clickToStartText = this.add.text(gameWidth / 2, gameHeight * 0.6, 'Click to Start', {
      fontSize: '64px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 8,
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#000',
        blur: 3,
        stroke: true,
        fill: true
      }
    });
    clickToStartText.setOrigin(0.5, 0.5);
    clickToStartText.setDepth(2000);

    // Add pulsing animation to click to start text
    this.tweens.add({
      targets: clickToStartText,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Start with black screen
    this.cameras.main.setAlpha(0);

    // Fade in the scene immediately
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 1,
      duration: 1000
    });

    // Handle autoplay
    const startMedia = async () => {
      try {
        // Start background music
        this.backgroundMusic = this.sound.add('background_music', {
          volume: 0.5,
          loop: true
        });
        
        // Try to start audio context
        const audioContext = (this.sound as any).context;
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        this.backgroundMusic.play();

        // Start video playback
        if (this.video) {
          console.log("Starting video playback");
          this.video.play(false); // false means don't loop the video
          
          // Show first message at 2 seconds
          this.time.delayedCall(2000, () => {
            this.showNextMessage();
          });
          // Fade in overlay after 1 second
          this.time.delayedCall(1000, () => {
            this.tweens.add({
              targets: this.overlayImage,
              alpha: 1,
              duration: 1000,
              onComplete: () => {
                // Fade out overlay after 2 seconds
                this.time.delayedCall(2000, () => {
                  this.tweens.add({
                    targets: this.overlayImage,
                    alpha: 0,
                    duration: 1000
                  });
                });
              }
            });
          });

          // Fade out click to start text
          this.tweens.add({
            targets: clickToStartText,
            alpha: 0,
            duration: 500,
            onComplete: () => {
              clickToStartText.destroy();
            }
          });
        }
      } catch (error) {
        console.warn('Error starting media:', error);
      }
    };

    // Add click handler to start media
    this.input.once('pointerdown', () => {
      startMedia();
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
    this.messageText.setText(message);
    this.messageText.setAlpha(1);
    // Wait 3 seconds before moving to next message
    this.time.delayedCall(3000, () => {
      this.currentMessageIndex++;
      this.showNextMessage();
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