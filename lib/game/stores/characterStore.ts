import { create } from 'zustand';
import { Character, CharacterStats, CharacterAbility } from '../types/character';
import {
  DEFAULT_WIZARD_STATS,
  DEFAULT_EXPLORER_STATS,
  DEFAULT_RULER_STATS,
  DEFAULT_HERO_STATS,
  WIZARD_ABILITIES,
  EXPLORER_ABILITIES,
  RULER_ABILITIES,
  HERO_ABILITIES
} from '../types/character';

interface CharacterState {
  currentCharacter: Character | null;
  characters: Map<string, Character>;
  setCurrentCharacter: (characterId: string) => void;
  updateCharacterStats: (characterId: string, stats: Partial<CharacterStats>) => void;
  updateCharacterAbility: (characterId: string, abilityName: string, updates: Partial<CharacterAbility>) => void;
  gainExperience: (characterId: string, amount: number) => void;
  initializeCharacters: () => void;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  currentCharacter: null,
  characters: new Map(),

  setCurrentCharacter: (characterId: string) => {
    const { characters } = get();
    const character = characters.get(characterId);
    if (character) {
      set({ currentCharacter: character });
    }
  },

  updateCharacterStats: (characterId: string, stats: Partial<CharacterStats>) => {
    const { characters } = get();
    const character = characters.get(characterId);
    if (character) {
      const updatedCharacter = {
        ...character,
        stats: { ...character.stats, ...stats }
      };
      characters.set(characterId, updatedCharacter);
      set({ characters: new Map(characters) });
    }
  },

  updateCharacterAbility: (characterId: string, abilityName: string, updates: Partial<CharacterAbility>) => {
    const { characters } = get();
    const character = characters.get(characterId);
    if (character) {
      const updatedAbilities = character.abilities.map(ability =>
        ability.name === abilityName ? { ...ability, ...updates } : ability
      );
      const updatedCharacter = {
        ...character,
        abilities: updatedAbilities
      };
      characters.set(characterId, updatedCharacter);
      set({ characters: new Map(characters) });
    }
  },

  gainExperience: (characterId: string, amount: number) => {
    const { characters } = get();
    const character = characters.get(characterId);
    if (character) {
      let { experience, level, experienceToNextLevel } = character.stats;
      experience += amount;

      // Level up if enough experience
      while (experience >= experienceToNextLevel) {
        experience -= experienceToNextLevel;
        level += 1;
        experienceToNextLevel = Math.floor(experienceToNextLevel * 1.5);

        // Increase stats on level up
        const stats = character.stats;
        stats.maxHealth += 10;
        stats.maxEnergy += 5;
        stats.attack += 2;
        stats.defense += 1;
        stats.speed += 1;
        stats.health = stats.maxHealth;
        stats.energy = stats.maxEnergy;
      }

      const updatedCharacter = {
        ...character,
        stats: {
          ...character.stats,
          experience,
          level,
          experienceToNextLevel
        }
      };
      characters.set(characterId, updatedCharacter);
      set({ characters: new Map(characters) });
    }
  },

  initializeCharacters: () => {
    const characters = new Map<string, Character>();
    
    // Initialize Wizard
    characters.set('wizard', {
      id: 'wizard',
      name: 'Wizard',
      stats: { ...DEFAULT_WIZARD_STATS },
      abilities: [...WIZARD_ABILITIES],
      sprite: 'wizard_final_spritesheet'
    });

    // Initialize Explorer
    characters.set('explorer', {
      id: 'explorer',
      name: 'Explorer',
      stats: { ...DEFAULT_EXPLORER_STATS },
      abilities: [...EXPLORER_ABILITIES],
      sprite: 'explorer_spritesheet_final'
    });

    // Initialize Ruler
    characters.set('ruler', {
      id: 'ruler',
      name: 'Ruler',
      stats: { ...DEFAULT_RULER_STATS },
      abilities: [...RULER_ABILITIES],
      sprite: 'ruler_spritesheet'
    });

    // Initialize Hero
    characters.set('hero', {
      id: 'hero',
      name: 'Hero',
      stats: { ...DEFAULT_HERO_STATS },
      abilities: [...HERO_ABILITIES],
      sprite: 'hero_attack_spritesheet'
    });

    set({ characters });
  }
})); 