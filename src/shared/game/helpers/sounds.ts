/** Selecciona una key de sonido desde la config de la habilidad.
 *  No consume el RNG del juego (usa Math.random()).
 *  Se ejecuta en el servidor, ambos clientes reciben el mismo voiceKey en el historial.
 *
 *  Reglas:
 *   - Si hay unitClass, busca key ending with `_{unitClass}` (ej: attack_archer)
 *   - Si no hay match de clase, usa la entrada genérica (sin sufijo de clase)
 *   - Para move, usa random del pool (move_1, move_2)
 *   - Si no hay pool definido, usa defaults: move → ['move_1','move_2'], otros → ['attack'] */
export function pickVoiceKey(
  type: 'attack' | 'support' | 'move' | 'card',
  sounds?: string[],
  unitClass?: string,
): string | undefined {
  const pool = sounds ?? (type === 'move' ? ['move_1', 'move_2'] : ['attack']);
  if (pool.length === 0) return undefined;

  if (unitClass) {
    const classMatch = pool.find(k => k.endsWith(`_${unitClass}`));
    if (classMatch) return classMatch;
    const generic = pool.find(k => !k.includes('_'));
    if (generic) return generic;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
