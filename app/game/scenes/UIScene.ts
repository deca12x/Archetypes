import { Scene, GameObjects } from "phaser";
import { Sprites } from "../../../lib/game/constants/assets";

interface CharacterSlot {
  sprite: GameObjects.Sprite;
  background: GameObjects.Rectangle;
  isActive: boolean;
  isDead: boolean;
}

export default class UIScene extends Scene {
  private characterSlots: CharacterSlot[] = [];
  private currentCharacterIndex: number = 0;
  private readonly SLOT_SIZE = 48;
  private readonly SLOT_PADDING = 8;
  private readonly SLOT_BACKGROUND_COLOR = 0x000000;
  private readonly SLOT_BACKGROUND_ALPHA = 0.7;
  private readonly ACTIVE_SLOT_COLOR = 0x00ff00;
  private readonly DEAD_SLOT_COLOR = 0xff0000;

  constructor() {
    super("UI");
  }

  create() {
    // Set up the scene
    this.cameras.main.setScrollFactor(0);
    this.cameras.main.setBackgroundColor('#00000000');

    // Create character slots
    this.createCharacterSlots();
    this.setupKeyboardControls();

    // Emit ready event
    this.events.emit('ready');
  }

  private createCharacterSlots() {
    const startX = this.cameras.main.width - (this.SLOT_SIZE * 3 + this.SLOT_PADDING * 2);
    const startY = 20;

    // Create three character slots
    for (let i = 0; i < 3; i++) {
      const x = startX + (this.SLOT_SIZE + this.SLOT_PADDING) * i;
      const y = startY;

      // Create background
      const background = this.add.rectangle(
        x + this.SLOT_SIZE / 2,
        y + this.SLOT_SIZE / 2,
        this.SLOT_SIZE,
        this.SLOT_SIZE,
        this.SLOT_BACKGROUND_COLOR,
        this.SLOT_BACKGROUND_ALPHA
      );

      // Create character sprite
      const sprite = this.add.sprite(
        x + this.SLOT_SIZE / 2,
        y + this.SLOT_SIZE / 2,
        this.getCharacterSprite(i)
      );
      sprite.setScale(0.5);

      this.characterSlots.push({
        sprite,
        background,
        isActive: i === 0,
        isDead: false
      });
    }

    // Set initial active character
    this.updateActiveCharacter(0);
  }

  private getCharacterSprite(index: number): string {
    const characters = [Sprites.WIZARD, Sprites.RULER, Sprites.HERO];
    return characters[index] || Sprites.PLAYER;
  }

  private setupKeyboardControls() {
    // Add number key listeners for character switching
    this.input.keyboard.on('keydown-ONE', () => this.switchCharacter(0));
    this.input.keyboard.on('keydown-TWO', () => this.switchCharacter(1));
    this.input.keyboard.on('keydown-THREE', () => this.switchCharacter(2));
  }

  private switchCharacter(index: number) {
    if (index === this.currentCharacterIndex || this.characterSlots[index].isDead) {
      return;
    }

    this.updateActiveCharacter(index);
    
    // Emit event to WorldScene to handle character switch
    this.events.emit('characterSwitched', {
      previousCharacter: this.getCharacterSprite(this.currentCharacterIndex),
      newCharacter: this.getCharacterSprite(index)
    });

    this.currentCharacterIndex = index;
  }

  private updateActiveCharacter(index: number) {
    this.characterSlots.forEach((slot, i) => {
      slot.isActive = i === index;
      slot.background.setStrokeStyle(2, slot.isActive ? this.ACTIVE_SLOT_COLOR : 0xffffff);
    });
  }

  public setCharacterDead(index: number, isDead: boolean) {
    if (this.characterSlots[index]) {
      this.characterSlots[index].isDead = isDead;
      this.characterSlots[index].sprite.setAlpha(isDead ? 0.5 : 1);
      this.characterSlots[index].background.setStrokeStyle(2, isDead ? this.DEAD_SLOT_COLOR : 0xffffff);
    }
  }
} 