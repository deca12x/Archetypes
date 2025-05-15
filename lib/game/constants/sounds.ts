export const CharacterSounds = {
  WIZARD_WALK: 'wizard_walk',
  WIZARD_ATTACK: 'wizard_attack',
  EXPLORER_WALK: 'explorer_walk',
  EXPLORER_ATTACK: 'explorer_attack',
  RULER_WALK: 'ruler_walk',
  RULER_ATTACK: 'ruler_attack',
  HERO_WALK: 'hero_walk',
  HERO_ATTACK: 'hero_attack',
  CLOUD_PUFF: 'cloud',
  SOUNDTRACK: 'game_soundtrack'
} as const;

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