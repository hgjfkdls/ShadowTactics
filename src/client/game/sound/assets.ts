import type { SoundEvent } from './types';
import { getLocale } from '@shared/i18n';

const SOUND_MAP: Partial<Record<SoundEvent, string>> = {
  ui_click: '/sounds/ui/click.mp3',
  ui_confirm: '/sounds/ui/confirm.mp3',
  ui_cancel: '/sounds/ui/cancel.mp3',
  ui_error: '/sounds/ui/error.mp3',
  ui_select_unit: '/sounds/ui/select_unit.mp3',
  move: '/sounds/game/move.mp3',
  attack: '/sounds/game/attack.mp3',
  hit: '/sounds/game/hit.mp3',
  miss: '/sounds/game/miss.mp3',
  critical: '/sounds/game/critical.mp3',
  counterattack: '/sounds/game/counter.mp3',
  kill: '/sounds/game/kill.mp3',
  general_kill: '/sounds/game/general_kill.mp3',
  heal: '/sounds/game/heal.mp3',
  shield: '/sounds/game/shield.mp3',
  buff: '/sounds/game/buff.mp3',
  debuff: '/sounds/game/debuff.mp3',
  ability_activate: '/sounds/game/ability.mp3',
  card_play: '/sounds/game/card.mp3',
  counter_play: '/sounds/game/counter_card.mp3',
  turn_start: '/sounds/game/turn_start.mp3',
  turn_end: '/sounds/game/turn_end.mp3',
  victory: '/sounds/game/victory.mp3',
  defeat: '/sounds/game/defeat.mp3',
  roll_dice: '/sounds/game/dice.mp3',
  deploy_unit: '/sounds/game/deploy.mp3',
  meditation: '/sounds/game/meditation.mp3',
  whirlwind: '/sounds/game/whirlwind.mp3',
  charge: '/sounds/game/charge.mp3',
  ride: '/sounds/game/ride.mp3',
};

export function getSoundUrl(event: SoundEvent): string | undefined {
  return SOUND_MAP[event];
}

/** Resuelve la URL de un archivo de voz según el idioma actual */
export function getVoiceUrl(key: string): string {
  const lang = getLocale() || 'es';
  return `/sounds/${lang}/voice/${key}.mp3`;
}

/** Resuelve la URL de un SFX por clave genérica */
export function getSfxUrl(key: string): string {
  return `/sounds/game/sfx/${key}.mp3`;
}
