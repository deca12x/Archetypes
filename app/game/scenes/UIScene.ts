import { Scene, GameObjects } from "phaser";
import { PLAYABLE_CHARACTERS } from "../../../lib/game/constants/assets";
import { useCharacterStore } from "@/lib/game/stores/characterStore";

interface CharacterSlot {
  sprite: GameObjects.Sprite;
  background: GameObjects.Rectangle;
  isActive: boolean;
}

export default class UIScene extends Scene {
  private characterSlots: CharacterSlot[] = [];
  private currentCharacterIndex: number = 0;
  private readonly SLOT_SIZE = 48;
  private readonly SLOT_PADDING = 8;
  private readonly SLOT_BACKGROUND_COLOR = 0x000000;
  private readonly SLOT_BACKGROUND_ALPHA = 0.7;
  private readonly ACTIVE_SLOT_COLOR = 0x00ff00;
  private characterWindow!: Phaser.GameObjects.Container;

  constructor() {
    super("UIScene");
  }

  create() {
    // Set up the scene
    this.cameras.main.setScrollFactor(0);
    this.cameras.main.setBackgroundColor('#00000000');

    // Initialize character store and set initial character
    console.log('Initializing character store...');
    useCharacterStore.getState().initializeCharacters();
    useCharacterStore.getState().setCurrentCharacter('wizard');
    
    // Debug log to check store state
    const store = useCharacterStore.getState();
    console.log('Character store state:', {
      currentCharacter: store.currentCharacter,
      characters: Array.from(store.characters.entries())
    });

    // Create character selection window
    this.createCharacterWindow();

    // Set up P key for character swapping
    this.input.keyboard.on('keydown-P', () => {
      this.handleCharacterSwap();
    });

    // Emit ready event
    this.events.emit('ready');
  }

  private createCharacterWindow() {
    const startX = this.cameras.main.width - (this.SLOT_SIZE * 3 + this.SLOT_PADDING * 2);
    const startY = 20;

    // Create container for the character window
    this.characterWindow = this.add.container(startX, startY);

    // Create background for the window
    const background = this.add.rectangle(
      0,
      0,
      this.SLOT_SIZE * 3 + this.SLOT_PADDING * 2,
      this.SLOT_SIZE + this.SLOT_PADDING * 2,
      this.SLOT_BACKGROUND_COLOR,
      this.SLOT_BACKGROUND_ALPHA
    );
    this.characterWindow.add(background);

    // Create character slots
    for (let i = 0; i < PLAYABLE_CHARACTERS.length; i++) {
      const x = (this.SLOT_SIZE + this.SLOT_PADDING) * i;
      const y = 0;

      // Create slot background
      const slotBackground = this.add.rectangle(
        x + this.SLOT_SIZE / 2,
        y + this.SLOT_SIZE / 2,
        this.SLOT_SIZE,
        this.SLOT_SIZE,
        this.SLOT_BACKGROUND_COLOR,
        this.SLOT_BACKGROUND_ALPHA
      );
      slotBackground.setStrokeStyle(2, 0xffffff);

      // Create character sprite
      const sprite = this.add.sprite(
        x + this.SLOT_SIZE / 2,
        y + this.SLOT_SIZE / 2,
        PLAYABLE_CHARACTERS[i]
      );
      sprite.setScale(0.5);

      this.characterSlots.push({
        sprite,
        background: slotBackground,
        isActive: i === 0
      });

      this.characterWindow.add(slotBackground);
      this.characterWindow.add(sprite);
    }

    // Set initial active character
    this.updateActiveCharacter(0);
  }

  private handleCharacterSwap() {
    console.log('UIScene: Current character index:', this.currentCharacterIndex);
    
    // Cycle through characters
    this.currentCharacterIndex = (this.currentCharacterIndex + 1) % PLAYABLE_CHARACTERS.length;
    const nextCharacter = PLAYABLE_CHARACTERS[this.currentCharacterIndex];
    console.log('UIScene: Switching to character:', nextCharacter);
    
    // Map sprite name to character ID
    const characterIdMap: Record<string, string> = {
      'wizard_final_spritesheet': 'wizard',
      'explorer_spritesheet_final': 'explorer',
      'ruler_spritesheet': 'ruler'
    };

    // Update character store
    const characterId = characterIdMap[nextCharacter];
    if (characterId) {
      console.log('UIScene: Setting current character in store to:', characterId);
      useCharacterStore.getState().setCurrentCharacter(characterId);
    }
    
    // Update active character slot
    this.updateActiveCharacter(this.currentCharacterIndex);
    
    // Debug log to check store state after update
    const store = useCharacterStore.getState();
    console.log('UIScene: Character store state after update:', {
      currentCharacter: store.currentCharacter,
      characters: Array.from(store.characters.entries())
    });
    
    // Emit event to WorldScene
    this.events.emit('characterChanged', nextCharacter);
  }

  private updateActiveCharacter(index: number) {
    this.characterSlots.forEach((slot, i) => {
      slot.isActive = i === index;
      slot.background.setStrokeStyle(2, slot.isActive ? this.ACTIVE_SLOT_COLOR : 0xffffff);
    });
  }

  private getCharacterId(sprite: string): string {
    switch (sprite) {
      case 'wizard_final_spritesheet':
        return 'wizard';
      case 'explorer_spritesheet_final':
        return 'explorer';
      case 'ruler_spritesheet':
        return 'ruler';
      default:
        return 'wizard';
    }
  }
} 