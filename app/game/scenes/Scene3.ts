import { Scene } from "phaser";
import { MissionCard } from "../components/MissionCard";

export default class Scene3 extends Scene {
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasdKeys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  } | null = null;
  private moveSpeed: number = 350;
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private headRemains: Phaser.GameObjects.Image | null = null;
  private headText: Phaser.GameObjects.Text | null = null;
  private desertGateText: Phaser.GameObjects.Text | null = null;
  private isNearHead: boolean = false;
  private isNearGate: boolean = false;
  private missionCard: MissionCard | null = null;

  constructor() {
    super({ key: "Scene3" });
  }

  create(): void {
    // Create the tilemap
    this.tilemap = this.make.tilemap({ key: "scene3", tileWidth: 32, tileHeight: 32 });
    const tileset = this.tilemap.addTilesetImage("scene3", "scene3");
    if (!tileset) {
      console.error("Failed to load tileset 'scene3' for Scene3");
      return;
    }
    // Create the ground layer
    this.tilemap.createLayer("ground", tileset);
    // Create the collision layer and set collision on all non-empty tiles
    this.collisionLayer = this.tilemap.createLayer("collision", tileset);
    if (this.collisionLayer) {
      this.collisionLayer.setCollisionByExclusion([-1]);
    }

    // Set world bounds
    this.physics.world.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
    this.cameras.main.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
    this.cameras.main.setBackgroundColor("#e2a84b");

    // Spawn player at bottom center
    if (this.tilemap && this.physics && this.cameras && this.cameras.main && this.physics.add) {
      const startX = this.tilemap.widthInPixels / 2;
      const startY = this.tilemap.heightInPixels - 100;
      this.player = this.physics.add?.sprite(startX, startY, "rogue") ?? null;
      this.player?.setScale(1);
      this.player?.setCollideWorldBounds(true);
      this.player?.setBounce(0.1);
      this.player?.setDamping(true);
      this.player?.setDrag(0.95);
      this.player?.setMaxVelocity(200);
      this.cameras.main?.startFollow(this.player, true);
      this.cameras.main?.setFollowOffset(0, 0);
      this.cameras.main?.setZoom(1);
      this.player?.anims?.play("rogue_idle_down", true);
      // Add collider with collision layer
      if (this.collisionLayer && this.player) {
        this.physics.add.collider(this.player, this.collisionLayer);
      }
    }

    // Set up keyboard input
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }) as {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
      };
    } else {
      console.error('Input system not available in Scene3');
    }

    // Continue background music if not already playing
    if (!this.sound.get("background_music")) {
      this.sound.play("background_music", {
        loop: true,
        volume: 0.5,
      });
    }

    // Show the fourth message after a delay
    this.time.delayedCall(2000, () => {
      const message = "Burns like hell.\nHope the coolant holds.";
      const messageText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height * 0.8, message, {
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
        wordWrap: { width: this.cameras.main.width * 0.4 }
      });
      messageText.setOrigin(0.5, 0.5);
      messageText.setDepth(2000);

      // Fade in the message
      messageText.setAlpha(0);
      this.tweens.add({
        targets: messageText,
        alpha: 1,
        duration: 1000,
        onComplete: () => {
          // Wait 3 seconds then fade out
          this.time.delayedCall(3000, () => {
            this.tweens.add({
              targets: messageText,
              alpha: 0,
              duration: 1000,
              onComplete: () => {
                messageText.destroy();
              }
            });
          });
        }
      });
    });

    // Add head remains text (initially invisible)
    this.headText = this.add.text(0, 0, "The head... it's still warm...", {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    });
    this.headText.setOrigin(0.5);
    this.headText.setDepth(1000);
    this.headText.setAlpha(0);

    // Add desert gate text (initially invisible)
    this.desertGateText = this.add.text(0, 0, "The gate to the desert... where it all began.", {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    });
    this.desertGateText.setOrigin(0.5);
    this.desertGateText.setDepth(1000);
    this.desertGateText.setAlpha(0);

    // Initialize mission card
    this.missionCard = new MissionCard(this);
    this.missionCard.show();
  }

  update(): void {
    if (this.player && this.cursors && this.wasdKeys) {
      this.handleMovement();

      // Check if player is in the top left corner (tile 0,0)
      const tileX = Math.floor(this.player.x / 32);
      const tileY = Math.floor(this.player.y / 32);
      if (tileX === 0 && tileY === 0) {
        // Only switch scene if not already switching
        if (!(this.scene as any).isTransitioning) {
          (this.scene as any).isTransitioning = true;
          this.scene.start('Scene4');
        }
      }
    }

    // Check distance to head remains
    if (this.headRemains && this.player) {
      const distanceToHead = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.headRemains.x,
        this.headRemains.y
      );

      if (distanceToHead < 100 && !this.isNearHead) {
        this.isNearHead = true;
        this.showHeadText();
      } else if (distanceToHead >= 100 && this.isNearHead) {
        this.isNearHead = false;
        this.hideHeadText();
      }
    }

    // Check if player is near the desert gate area (middle center)
    if (this.player) {
      const centerX = this.cameras.main.width / 2;
      const centerY = this.cameras.main.height / 2;
      const distanceToCenter = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        centerX,
        centerY
      );

      if (distanceToCenter < 150 && !this.isNearGate) {
        this.isNearGate = true;
        this.showDesertGateText();
      } else if (distanceToCenter >= 150 && this.isNearGate) {
        this.isNearGate = false;
        this.hideDesertGateText();
      }
    }
  }

  private handleMovement(): void {
    this.player!.setVelocity(0);
    let velocityX = 0;
    let velocityY = 0;
    if (this.cursors!.left.isDown || this.wasdKeys!.left.isDown) {
      velocityX = -this.moveSpeed;
    } else if (this.cursors!.right.isDown || this.wasdKeys!.right.isDown) {
      velocityX = this.moveSpeed;
    }
    if (this.cursors!.up.isDown || this.wasdKeys!.up.isDown) {
      velocityY = -this.moveSpeed;
    } else if (this.cursors!.down.isDown || this.wasdKeys!.down.isDown) {
      velocityY = this.moveSpeed;
    }
    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      const norm = Math.sqrt(2) / 2;
      velocityX *= norm;
      velocityY *= norm;
    }
    this.player!.setVelocity(velocityX, velocityY);
    // Play appropriate animation
    if (velocityX < 0) {
      this.player!.anims.play("rogue_walk_left", true);
    } else if (velocityX > 0) {
      this.player!.anims.play("rogue_walk_right", true);
    } else if (velocityY < 0) {
      this.player!.anims.play("rogue_walk_up", true);
    } else if (velocityY > 0) {
      this.player!.anims.play("rogue_walk_down", true);
    } else {
      this.player!.anims.play("rogue_idle_down", true);
    }
  }

  private showHeadText() {
    if (this.headText && this.player) {
      this.headText.setPosition(this.player.x, this.player.y - 50);
      this.headText.setAlpha(1);
    }
  }

  private hideHeadText() {
    if (this.headText) {
      this.headText.setAlpha(0);
    }
  }

  private showDesertGateText() {
    if (this.desertGateText && this.player) {
      this.desertGateText.setPosition(this.player.x, this.player.y - 50);
      this.desertGateText.setAlpha(1);
    }
  }

  private hideDesertGateText() {
    if (this.desertGateText) {
      this.desertGateText.setAlpha(0);
    }
  }
} 