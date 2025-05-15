export interface CharacterStats {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  attack: number;
  defense: number;
  speed: number;
  level: number;
  experience: number;
  experienceToNextLevel: number;
}

export interface CharacterAbility {
  name: string;
  description: string;
  energyCost: number;
  cooldown: number;
  currentCooldown: number;
  isUnlocked: boolean;
}

export interface Character {
  id: string;
  name: string;
  stats: CharacterStats;
  abilities: CharacterAbility[];
  sprite: string;
}

// Default stats for each character type
export const DEFAULT_WIZARD_STATS: CharacterStats = {
  health: 80,
  maxHealth: 80,
  energy: 100,
  maxEnergy: 100,
  attack: 15,
  defense: 8,
  speed: 10,
  level: 1,
  experience: 0,
  experienceToNextLevel: 100
};

export const DEFAULT_EXPLORER_STATS: CharacterStats = {
  health: 100,
  maxHealth: 100,
  energy: 80,
  maxEnergy: 80,
  attack: 12,
  defense: 12,
  speed: 12,
  level: 1,
  experience: 0,
  experienceToNextLevel: 100
};

export const DEFAULT_RULER_STATS: CharacterStats = {
  health: 120,
  maxHealth: 120,
  energy: 60,
  maxEnergy: 60,
  attack: 10,
  defense: 15,
  speed: 8,
  level: 1,
  experience: 0,
  experienceToNextLevel: 100
};

export const DEFAULT_HERO_STATS: CharacterStats = {
  health: 150,
  maxHealth: 150,
  energy: 70,
  maxEnergy: 70,
  attack: 18,
  defense: 12,
  speed: 15,
  level: 1,
  experience: 0,
  experienceToNextLevel: 100
};

// Character-specific abilities
export const WIZARD_ABILITIES: CharacterAbility[] = [
  {
    name: "Fireball",
    description: "Launches a powerful fireball at the target",
    energyCost: 20,
    cooldown: 3,
    currentCooldown: 0,
    isUnlocked: true
  },
  {
    name: "Ice Shield",
    description: "Creates a protective ice barrier",
    energyCost: 30,
    cooldown: 5,
    currentCooldown: 0,
    isUnlocked: false
  }
];

export const EXPLORER_ABILITIES: CharacterAbility[] = [
  {
    name: "Quick Step",
    description: "Increases movement speed temporarily",
    energyCost: 15,
    cooldown: 4,
    currentCooldown: 0,
    isUnlocked: true
  },
  {
    name: "Treasure Sense",
    description: "Reveals nearby hidden items",
    energyCost: 25,
    cooldown: 6,
    currentCooldown: 0,
    isUnlocked: false
  }
];

export const RULER_ABILITIES: CharacterAbility[] = [
  {
    name: "Command",
    description: "Increases party defense",
    energyCost: 25,
    cooldown: 4,
    currentCooldown: 0,
    isUnlocked: true
  },
  {
    name: "Royal Decree",
    description: "Stuns nearby enemies",
    energyCost: 40,
    cooldown: 8,
    currentCooldown: 0,
    isUnlocked: false
  }
];

export const HERO_ABILITIES: CharacterAbility[] = [
  {
    name: "Heroic Strike",
    description: "A powerful attack that deals bonus damage",
    energyCost: 30,
    cooldown: 4,
    currentCooldown: 0,
    isUnlocked: true
  },
  {
    name: "Battle Cry",
    description: "Increases attack power for a short duration",
    energyCost: 35,
    cooldown: 6,
    currentCooldown: 0,
    isUnlocked: false
  }
]; 