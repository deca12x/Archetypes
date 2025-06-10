import Phaser from 'phaser';
import React from 'react';
import { EphemeralThoughtBubble } from '../../../components/EphemeralThoughtBubble';
import { MissionBubble } from '../../../components/MissionBubble';

interface SpecialTile {
  x: number;
  y: number;
  message: string;
  type: 'ephemeral' | 'mission';
  header?: string;
}

interface MissionBubble {
  id: string;
  header: string;
  text: string;
  trigger: string;
}

class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private specialTiles: SpecialTile[] = [];
  private missionBubbles: MissionBubble[] = [];
  private activeBubble: React.ReactNode | null = null;
  private bubbleTimeout: NodeJS.Timeout | null = null;
  public events: Phaser.Events.EventEmitter;
  public username: string = '';
  public playerId: string = '';
  private totalAssets: number = 0;
  private loadedAssets: number = 0;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  constructor() {
    super({ key: 'WorldScene' });
    this.events = new Phaser.Events.EventEmitter();
    
    // Ruins Area - Ephemeral Thoughts
    this.specialTiles = [
      // Machine skull
      { 
        x: 5, 
        y: 5, 
        message: "Was this… a god once?",
        type: 'ephemeral'
      },
      // Titan ribcage
      { 
        x: 10, 
        y: 10, 
        message: "It's still humming… like it remembers.",
        type: 'ephemeral'
      },
      // Metal towers
      { 
        x: 15, 
        y: 15, 
        message: "The wind speaks. But not in any language I know.",
        type: 'ephemeral'
      },
      // Collapsed altar
      { 
        x: 20, 
        y: 20, 
        message: "Blood. Old blood. And something older.",
        type: 'ephemeral'
      },
      // Remnant tech
      { 
        x: 25, 
        y: 25, 
        message: "It's watching me back.",
        type: 'ephemeral'
      },
      // Cracked bridge
      { 
        x: 30, 
        y: 30, 
        message: "Step wrong, and the desert swallows.",
        type: 'ephemeral'
      },
      // Rusted sentinel
      { 
        x: 35, 
        y: 35, 
        message: "This one fell fighting. But what was it fighting?",
        type: 'ephemeral'
      },
    ];

    // Mission and Tutorial Bubbles
    this.missionBubbles = [
      {
        id: 'initial_mission',
        header: '>> MISSION: CROSS THE WASTELAND',
        text: 'Find shelter before nightfall. Scavenge relics. Avoid patrols. The Eye watches all.',
        trigger: 'game_start'
      },
      {
        id: 'inventory_tutorial',
        header: '>> EQUIPMENT & RELICS',
        text: 'Every item you find may hold memory, power, or both. Check your pouch to equip or inspect.',
        trigger: 'first_item_found'
      },
      {
        id: 'interactions_tutorial',
        header: '>> INTERACTING WITH OBJECTS',
        text: 'Stand near glowing objects. Press [E] to inspect, barter, or remember.',
        trigger: 'first_interaction'
      },
      {
        id: 'nebula_intro',
        header: '>> THE INNER VOICE',
        text: 'You are not alone. Your Archetype speaks. Open the link to Nebula and ask what troubles you.',
        trigger: 'first_nebula_contact'
      }
    ];
  }

  preload() {
    console.log('Starting preload...');
    
    // Set up loading events
    this.load.on('start', () => {
      console.log('Asset loading started');
    });

    this.load.on('progress', (value: number) => {
      console.log(`Loading progress: ${(value * 100).toFixed(0)}%`);
      this.events.emit('loadingProgress', {
        progress: value * 100,
        currentAsset: 'Loading assets...',
        totalAssets: this.totalAssets,
        loadedAssets: this.loadedAssets
      });
    });

    this.load.on('filecomplete', (key: string) => {
      console.log(`Asset loaded: ${key}`);
      this.loadedAssets++;
      this.events.emit('loadingProgress', {
        progress: (this.loadedAssets / this.totalAssets) * 100,
        currentAsset: `Loaded ${key}`,
        totalAssets: this.totalAssets,
        loadedAssets: this.loadedAssets
      });

      // If this is the soundtrack, start playing it
      if (key === 'soundtrack') {
        const music = this.sound.add('soundtrack', {
          volume: 0.5,
          loop: true
        });
        music.play();
      }
    });

    this.load.on('complete', () => {
      console.log('All assets loaded successfully');
      this.events.emit('sceneReady');
    });

    this.load.on('loaderror', (file: any) => {
      console.error('Error loading asset:', file.src);
      // Continue loading other assets even if one fails
      this.events.emit('loadingProgress', {
        progress: (this.loadedAssets / this.totalAssets) * 100,
        currentAsset: `Failed to load ${file.key}`,
        totalAssets: this.totalAssets,
        loadedAssets: this.loadedAssets
      });
    });

    // Load game assets
    this.totalAssets = 4; // Update based on actual assets
    this.loadedAssets = 0;

    // Load assets in priority order
    this.loadPriorityAssets();
  }

  private loadPriorityAssets() {
    // Load player sprites first (highest priority)
    this.load.image('elder', '/assets/sprites/elder_topdown.webp');
    this.load.image('rogue', '/assets/sprites/rogue_sheet.webp');
    
    // Load UI assets next
    this.load.image('compass', '/assets/sprites/compass.webp');
    
    // Load audio last (lowest priority)
    this.load.audio('soundtrack', '/assets/sounds/game_soundtrack.mp3');
  }

  create() {
    console.log('WorldScene create started');
    
    try {
      // Create the player immediately with essential assets
      console.log('Creating player sprite...');
      this.player = this.physics.add.sprite(400, 300, 'elder');
      this.player.setCollideWorldBounds(true);
      
      // Set up camera to follow player
      this.cameras.main.startFollow(this.player);
      this.cameras.main.setZoom(1);
      
      // Add keyboard controls
      this.cursors = this.input.keyboard.createCursorKeys();
      
      console.log('World setup complete');
      
      // Emit an event to notify that the scene is ready
      this.events.emit('sceneReady');
      console.log('Scene ready event emitted');
    } catch (error) {
      console.error('Error in create:', error);
      // Emit error event
      this.events.emit('sceneError', error);
    }
  }

  update() {
    if (!this.player || !this.cursors || !this.player.body) return;

    // Handle player movement
    const speed = 160;
    const cursors = this.cursors;
    const body = this.player.body;

    // Reset velocity
    this.player.setVelocity(0);

    // Handle movement
    if (cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (cursors.right.isDown) {
      this.player.setVelocityX(speed);
    }

    if (cursors.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (cursors.down.isDown) {
      this.player.setVelocityY(speed);
    }

    // Normalize diagonal movement
    if (body.velocity.x !== 0 && body.velocity.y !== 0) {
      body.velocity.normalize().scale(speed);
    }

    // Check for special tile interactions
    this.checkSpecialTileInteraction(this.player.x, this.player.y);
  }

  private checkSpecialTileInteraction(playerX: number, playerY: number) {
    const tileX = Math.floor(playerX / 32);
    const tileY = Math.floor(playerY / 32);

    const specialTile = this.specialTiles.find(
      tile => tile.x === tileX && tile.y === tileY
    );

    if (specialTile) {
      if (specialTile.type === 'ephemeral') {
        this.showEphemeralBubble(specialTile.message, playerX, playerY);
      } else if (specialTile.type === 'mission') {
        this.showMissionBubble(specialTile.header!, specialTile.message, playerX, playerY);
      }
    }
  }

  private showEphemeralBubble(message: string, x: number, y: number) {
    // Clear any existing bubble
    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout);
    }

    // Convert world coordinates to screen coordinates
    const screenX = x;
    const screenY = y - 50; // Offset above the player

    // Create new ephemeral bubble
    this.activeBubble = (
      <EphemeralThoughtBubble
        message={message}
        position={{ x: screenX, y: screenY }}
        onComplete={() => {
          this.bubbleTimeout = setTimeout(() => {
            this.activeBubble = null;
          }, 3000); // Hide after 3 seconds
        }}
      />
    );

    // Force a re-render
    this.events.emit('bubbleUpdate', this.activeBubble);
  }

  private showMissionBubble(header: string, text: string, x?: number, y?: number) {
    // Clear any existing bubble
    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout);
    }

    // Create new mission bubble
    this.activeBubble = (
      <MissionBubble
        header={header}
        text={text}
        position={x && y ? { x, y } : undefined}
        onComplete={() => {
          this.bubbleTimeout = setTimeout(() => {
            this.activeBubble = null;
          }, 5000); // Hide after 5 seconds
        }}
      />
    );

    // Force a re-render
    this.events.emit('bubbleUpdate', this.activeBubble);
  }
}

export default WorldScene; 