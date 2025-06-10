import { Scene } from "phaser";

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

  constructor() {
    super({ key: "Scene3" });
  }

  create(): void {
    // Create the tilemap
    this.tilemap = this.make.tilemap({ key: "scene3" });
    const tileset = this.tilemap.addTilesetImage("scene3", "scene3");
    if (!tileset) {
      console.error("Failed to load tileset 'scene3' for Scene3");
      return;
    }
    const layer = this.tilemap.createLayer(0, tileset);

    // Set world bounds
    this.physics.world.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
    this.cameras.main.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
    this.cameras.main.setBackgroundColor("#e2a84b");

    // Spawn player at bottom center
    if (this.tilemap) {
      const startX = this.tilemap.widthInPixels / 2;
      const startY = this.tilemap.heightInPixels - 100;
      if (this.physics && this.cameras && this.cameras.main && this.physics.add) {
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
      }
    }

    // Set up keyboard input
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

    // Continue background music if not already playing
    if (!this.sound.get("background_music")) {
      this.sound.play("background_music", {
        loop: true,
        volume: 0.5,
      });
    }
  }

  update(): void {
    if (this.player && this.cursors && this.wasdKeys) {
      this.handleMovement();
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
} 