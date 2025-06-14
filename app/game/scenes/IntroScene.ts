import { Scene, GameObjects } from "phaser";
import { Socket } from "socket.io-client";

export class IntroScene extends Scene {
  private video: HTMLVideoElement | null = null;
  private videoTexture: GameObjects.Video | null = null;
  private socket: Socket | null = null;
  private mapKey: string = "world";
  private backgroundMusic: Phaser.Sound.BaseSound | null = null;
  private overlayImage!: Phaser.GameObjects.Image;
  private messageText!: Phaser.GameObjects.Text;
  private currentMessageIndex: number = 0;
  private readonly messages: string[] = [
    "Their cores are draining fast.\nNo juice, no protection.",
    "Alright. No turning back.\nFind the market before night."
  ];
  private skipText: GameObjects.Text | null = null;
  private isVideoPlaying: boolean = false;
  private startButton: GameObjects.Text | null = null;

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
    
    try {
      // Create start button
      this.startButton = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Click to Start', {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }).setOrigin(0.5);

      // Make button interactive
      this.startButton.setInteractive();
      this.startButton.on('pointerdown', () => {
        this.startIntro();
      });

      // Add skip text (initially hidden)
      this.skipText = this.add.text(this.scale.width - 20, 20, 'Press SPACE to skip', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }).setOrigin(1, 0);
      this.skipText.setScrollFactor(0);
      this.skipText.setVisible(false);

      // Set up space key for skipping
      if (this.input && this.input.keyboard) {
        const spaceKey = this.input.keyboard.addKey('SPACE');
        spaceKey.on('down', () => {
          if (this.isVideoPlaying) {
            this.skipIntro();
          }
        });
      }

      // Create video
      this.videoTexture = this.add.video(0, 0, "scene1");
      if (!this.videoTexture) {
        console.error("Failed to create video");
        this.skipIntro();
        return;
      }
      console.log("Video object created");

      // Get dimensions
      const gameWidth = this.scale.width;
      const gameHeight = this.scale.height;
      const videoWidth = this.videoTexture.width;
      const videoHeight = this.videoTexture.height;

      // Calculate scale to fit width with maximum zoom out
      const scale = (gameWidth / videoWidth) * 0.25; // Reduce scale to 25% of original for maximum zoom out
      const scaledWidth = videoWidth * scale;
      const scaledHeight = videoHeight * scale;

      // Set video size with zoomed out scale
      this.videoTexture.setDisplaySize(scaledWidth, scaledHeight);
      
      // Center the video
      this.videoTexture.setPosition(gameWidth / 2, gameHeight / 2);
      this.videoTexture.setOrigin(0.5, 0.5);

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
          if (this.videoTexture) {
            console.log("Starting video playback");
            this.videoTexture.play(false); // false means don't loop the video
            
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
              targets: this.startButton,
              alpha: 0,
              duration: 500,
              onComplete: () => {
                if (this.startButton) {
                  this.startButton.destroy();
                }
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
      this.videoTexture.on("complete", () => {
        console.log("Video completed");
        this.onVideoComplete();
      });

      // Add error handling for video
      this.videoTexture.on("error", (error: any) => {
        console.error("Video error:", error);
      });

      console.log("IntroScene setup complete");
    } catch (error) {
      console.error('Error in IntroScene create:', error);
      this.skipIntro();
    }
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

  private startIntro() {
    if (this.startButton) {
      this.startButton.destroy();
    }

    try {
      // Create and play video
      this.videoTexture = this.add.video(0, 0, 'scene1');
      if (!this.videoTexture) {
        console.error('Failed to create video texture');
        this.skipIntro();
        return;
      }

      // Calculate video dimensions to maintain aspect ratio
      const gameWidth = this.scale.width;
      const gameHeight = this.scale.height;
      const videoWidth = this.videoTexture.width;
      const videoHeight = this.videoTexture.height;

      // Calculate scale to fit the video while maintaining aspect ratio
      const scaleX = gameWidth / videoWidth;
      const scaleY = gameHeight / videoHeight;
      const scale = Math.max(scaleX, scaleY);

      // Set video size and position
      this.videoTexture.setDisplaySize(videoWidth * scale, videoHeight * scale);
      this.videoTexture.setPosition(gameWidth / 2, gameHeight / 2);
      this.videoTexture.setOrigin(0.5, 0.5);

      // Start video playback
      this.videoTexture.play(true);
      this.isVideoPlaying = true;

      if (this.skipText) {
        this.skipText.setVisible(true);
      }

      // Set up video end handler
      this.videoTexture.on('complete', () => {
        this.skipIntro();
      });

      // Play background music
      this.backgroundMusic = this.sound.add('background_music', {
        volume: 0.5,
        loop: true
      });
      this.backgroundMusic.play();

    } catch (error) {
      console.error('Error in startIntro:', error);
      this.skipIntro();
    }
  }

  private skipIntro() {
    if (this.videoTexture) {
      this.videoTexture.stop();
      this.videoTexture.destroy();
    }
    if (this.skipText) {
      this.skipText.destroy();
    }
    this.isVideoPlaying = false;

    // Start WorldScene with the background music
    this.scene.start('WorldScene', {
      socket: typeof window !== 'undefined' ? (window as any).__gameSocket : null,
      mapKey: 'world',
      music: this.backgroundMusic
    });
  }
} 