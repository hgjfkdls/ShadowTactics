import type { UnitClass } from './abilities';

export type IdentityEffect = {
  unitClassOverride: UnitClass;
  abilitiesOverride?: string[];
  copyStats?: boolean;
  statsToCopy?: Array<'range' | 'movementCost' | 'difficulty'>;
};

export const IDENTITY_EFFECTS: Record<string, IdentityEffect> = {
  robin_hood: {
    unitClassOverride: 'archer',
    copyStats: true,
    abilitiesOverride: ['en_la_mira', 'robar_ricos'],
  },
  francotirador: {
    unitClassOverride: 'archer',
    copyStats: true,
  },
  dios_trueno: {
    unitClassOverride: 'infantry',
    abilitiesOverride: ['resistencia', 'presion', 'rayo_celestial'],
  },
  capitan_guardia: {
    unitClassOverride: 'infantry',
    abilitiesOverride: ['resistencia', 'presion'],
  },
  caballos_guerra: {
    unitClassOverride: 'cavalry',
    copyStats: true,
    abilitiesOverride: ['romper_filas', 'cabalgar_2', 'carga', 'doble_ataque', 'a_la_carga'],
  },
  cazadores: {
    unitClassOverride: 'cavalry',
    copyStats: true,
    abilitiesOverride: ['romper_filas', 'cabalgar', 'carga'],
  },
  punta_lanza: {
    unitClassOverride: 'lancer',
    abilitiesOverride: ['anti_caballeria', 'formacion_defensiva', 'ventaja_alcance', 'torbellino'],
  },
  espartano: {
    unitClassOverride: 'lancer',
    abilitiesOverride: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque'],
  },
  monje_shaolin: {
    unitClassOverride: 'general',
    abilitiesOverride: ['meditacion'],
  },
  comandante_supremo: {
    unitClassOverride: 'general',
  },
  corazon_estratega: {
    unitClassOverride: 'general',
    abilitiesOverride: ['posicion_estrategica'],
  },
  inspiracion_real: {
    unitClassOverride: 'general',
    abilitiesOverride: ['en_nombre_del_rey', 'guardia_real'],
  },
  samurai: {
    unitClassOverride: 'general',
    abilitiesOverride: ['desenvainado_veloz', 'camino_del_guerrero'],
  },
  furia_tirano: {
    unitClassOverride: 'general',
    abilitiesOverride: ['sacrificar', 'terror'],
  },
  escudo_comandante: {
    unitClassOverride: 'general',
    abilitiesOverride: ['angel_guardian', 'proteger'],
  },
};

export function getIdentityKey(cardId: string): string {
  return cardId.split('_').slice(0, -1).join('_');
}
