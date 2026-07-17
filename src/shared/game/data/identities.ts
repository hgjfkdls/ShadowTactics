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
    abilitiesOverride: ['francotirador', 'blanco_facil', 'patada_acrobatica', 'fuego_cobertura'],
  },
  dios_trueno: {
    unitClassOverride: 'infantry',
    abilitiesOverride: ['resistencia', 'presion', 'rayo_celestial'],
  },
  capitan_guardia: {
    unitClassOverride: 'infantry',
    abilitiesOverride: ['resistencia', 'presion', 'liderar_tropas'],
  },
  caballos_guerra: {
    unitClassOverride: 'cavalry',
    copyStats: true,
    abilitiesOverride: ['romper_filas', 'cabalgar_2', 'carga', 'a_la_carga'],
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
    abilitiesOverride: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'lanza_escudo'],
  },
  monje_shaolin: {
    unitClassOverride: 'general',
    abilitiesOverride: ['meditacion', 'karma'],
  },
  comandante_supremo: {
    unitClassOverride: 'general',
    abilitiesOverride: ['voz_de_mando', 'plan_batalla'],
  },
  corazon_estratega: {
    unitClassOverride: 'general',
    abilitiesOverride: ['posicion_estrategica', 'formacion_linea', 'formacion_triangulo'],
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
    abilitiesOverride: ['angel_guardian', 'proteger', 'proteger_auto'],
  },
};

export function getIdentityKey(cardId: string): string {
  return cardId.split('_').slice(0, -1).join('_');
}
