export type SoundConfigEntry = {
  i18nKey: string;
};

export const SOUND_CONFIG: Record<string, SoundConfigEntry> = {
  move_1:        { i18nKey: 'sound.move_1' },
  move_2:        { i18nKey: 'sound.move_2' },
  attack:        { i18nKey: 'sound.attack' },
  attack_archer: { i18nKey: 'sound.attack_archer' },
  attack_cavalry:{ i18nKey: 'sound.attack_cavalry' },
};

export type SoundKey = keyof typeof SOUND_CONFIG;
