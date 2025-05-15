export enum CharacterSounds {
  // Movement sounds
  WIZARD_WALK = "wizard_walk",
  EXPLORER_WALK = "explorer_walk",
  RULER_WALK = "ruler_walk",
  HERO_WALK = "hero_walk",
  
  // Attack sounds - using available sounds
  WIZARD_ATTACK = "explorer_attack",  // Using explorer attack for wizard
  EXPLORER_ATTACK = "explorer_attack",
  RULER_ATTACK = "hero_attack",       // Using hero attack for ruler
  HERO_ATTACK = "hero_attack",
  
  // Other sounds
  SOUNDTRACK = "game_soundtrack"
}

export const CHARACTER_SOUND_MAP: Record<string, { walk: string; attack: string }> = {
  'wizard_final_spritesheet': {
    walk: 'wizard_walk',
    attack: 'wizard_attack'
  },
  'explorer_spritesheet_final': {
    walk: 'explorer_walk',
    attack: 'explorer_attack'
  },
  'ruler_spritesheet': {
    walk: 'ruler_walk',
    attack: 'ruler_attack'
  },
  'hero_spritesheet': {
    walk: 'hero_walk',
    attack: 'hero_attack'
  }
}; 