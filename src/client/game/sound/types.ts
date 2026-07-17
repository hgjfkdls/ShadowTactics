export type SoundEvent =
  | 'ui_click' | 'ui_confirm' | 'ui_cancel' | 'ui_error' | 'ui_select_unit'
  | 'move' | 'attack' | 'hit' | 'miss' | 'critical'
  | 'counterattack' | 'kill' | 'general_kill'
  | 'heal' | 'shield' | 'buff' | 'debuff'
  | 'ability_activate' | 'card_play' | 'counter_play'
  | 'turn_start' | 'turn_end' | 'victory' | 'defeat'
  | 'roll_dice' | 'deploy_unit'
  | 'meditation' | 'whirlwind' | 'charge' | 'ride'
  | 'sword_slash';

export type SoundLayer = 'music' | 'sfx' | 'voice';

export type SoundPriority = 'low' | 'normal' | 'high' | 'interrupt';

export type SoundOptions = {
  volume?: number;
  rate?: number;
  pan?: number;
  layer?: SoundLayer;
  priority?: SoundPriority;
  allowOverlap?: boolean;
  cooldown?: number;
  loop?: boolean;
  crossfade?: number;
};

export type SoundInstance = {
  id: string;
  event: SoundEvent;
  layer: SoundLayer;
  startedAt: number;
  options: SoundOptions;
};
