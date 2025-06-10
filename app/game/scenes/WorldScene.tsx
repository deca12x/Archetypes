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

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private specialTiles: SpecialTile[] = [];
  private missionBubbles: MissionBubble[] = [];
  private activeBubble: React.ReactNode | null = null;
  private bubbleTimeout: NodeJS.Timeout | null = null;
  public events: Phaser.Events.EventEmitter;
  public username: string = '';
  public playerId: string = '';

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

  update() {
    // Check for special tile interactions
    if (this.player) {
      this.checkSpecialTileInteraction(this.player.x, this.player.y);
    }
  }
} 