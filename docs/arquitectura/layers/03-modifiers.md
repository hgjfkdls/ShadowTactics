# Capa Modifiers — Estrategia de migración

## Estado actual

La capa de modificadores ya está bastante bien encapsulada:

```
@shared/game/modifiers/
  types.ts      → ModifierInstance (id, sourcePlayerId, targetId, stat, value, operator, remainingTurns, remainingUses, source, sourceName)
  engine.ts     → addModifier, getModifierSum, consumeModifier, processModifiersAtTurnStart
```

**Problemas menores**:

1. `source` y `sourceName` se agregaron recientemente pero no todos los llamadores de `addModifier` los usan (habilidades, formaciones, identidades).
2. Las pasivas de unidad (Resistencia, Línea defensiva, Presión, etc.) NO son modificadores reales — están en `unit.abilities[]` y se evalúan en `ability-effects.ts`. Esto es correcto pero puede confundir.
3. `processModifiersAtTurnStart` en `engine.ts` es llamado desde `turn.ts`, pero la limpieza de modificadores player-wide también ocurre en `handleEndTurn` en `turn.ts`. Hay lógica duplicada de expiración.

## Estado ideal

```
@shared/game/modifiers/
  types.ts        → ModifierInstance (sin cambios)
  engine.ts       → addModifier, consumeModifier, getModifierSum (sin cambios)
  turn-lifecycle.ts  → processModifiersAtTurnStart, cleanupExpiredModifiers, cleanupPlayerModifiers
  debug.ts        → getModifierDescription (dev tool para inspeccionar modifiers activos)
```

## Migración

### Fase 1: Sistematizar `source`/`sourceName`

Identificar todos los llamadores de `addModifier` que NO pasan source:

| Llamador | Archivo | source actual | source deseado |
|----------|---------|--------------|----------------|
| `handleFuegoCobertura` (fuegoCoberturaCharges) | `ability.ts` | `applyAbilityFlag` (no usa addModifier) | N/A |
| `addModifier(s, target.owner, target.id, 'inmovil', ...)` | `ability.ts` | `undefined` | `source: 'ability'`, `sourceName: 'Desenvainado veloz'` |
| `addModifier(state, unit.owner, target.id, 'damage', -1, ...)` | `ability.ts` (Proteger) | `undefined` | `source: 'ability'`, `sourceName: 'Proteger'` |
| `addModifier(s, playerId, uid, 'damage', -1, ...)` | `formations.ts` | `undefined` | `source: 'formation'`, `sourceName: 'Línea'` |
| `addModifier(s, playerId, uid, 'attack', 1, ...)` | `formations.ts` | `undefined` | `source: 'formation'`, `sourceName: 'Triángulo'` |
| `addModifier(s, playerId, u.id, 'attack', 1, ...)` | `reducer.ts` (Plan batalla) | `undefined` | `source: 'ability'`, `sourceName: 'Avanzar'` |
| `addModifier(newState, currentPlayer, general.id, 'damage', -1, ...)` | `turn.ts` (Monje Shaolin) | `undefined` | `source: 'identity'`, `sourceName: 'Meditación'` |
| Varios en `turn.ts` (Inspiración Real, Escudo) | `turn.ts` | `undefined` | various |

**Proteger**: la ausencia de `source`/`sourceName` no debe romper nada — estos campos son opcionales. Simplemente se pierde trazabilidad.

### Fase 2: Unificar ciclo de vida de expiración

Actualmente hay dos lugares donde expiran modificadores:

1. **`processModifiersAtTurnStart`** en `engine.ts`: decrementa `remainingTurns`, remueve expirados, aplica `ap` y `passiveDamage`
2. **`handleEndTurn`** en `turn.ts` líneas 42-47: limpia modificadores player-wide del jugador que terminó el turno, PERO excluye `damage` player-wide (los mantiene)

**Problema**: la exclusión de `damage` player-wide en `handleEndTurn` existe porque `applyCardEffect` crea modificadores `damage` con `remainingTurns: 1` y deben persistir hasta que se consuman por uso (remainingUses). Si `handleEndTurn` los limpiara por turno, Mantenimiento no funcionaría (el debuff desaparecería al terminar el turno del jugador que lo recibe).

**Solución**: centralizar TODA la lógica de expiración en `turn-lifecycle.ts`:

```typescript
// turn-lifecycle.ts
export function processModifiersAtTurnStart(state: GameState, playerId: string): GameState
export function cleanupEndOfTurn(state: GameState, playerId: string): GameState
export function cleanupExpiredModifiers(state: GameState): GameState
```

**Proteger**: 
- `processModifiersAtTurnStart` ya es llamado desde `applyTurnStart`. No cambiar su firma.
- `cleanupEndOfTurn` debe reemplazar la lógica inline en `handleEndTurn` sin cambiar el comportamiento de exclusión de `damage`.

### Fase 3: Debug tool

```typescript
// debug.ts
export function getModifierDescription(mod: ModifierInstance, state: GameState): string
```

Retorna un string legible para depuración, usado solo en desarrollo:
```
"movementCost SET 0 (card: Movilidad, 1 turno restante, 1 uso)"
"damage ADD -1 (card: Mantenimiento, 1 turno restante, 1 uso)"
```

No necesita migración — es código nuevo.

## Interacciones críticas a proteger

| Interacción | Dependencias | Riesgo |
|-------------|-------------|--------|
| `consumeModifier` con `stat` + `playerId` + `targetId` | Llamado desde resolver, attack, move | Alto — cambiar firma rompe todo |
| `processModifiersAtTurnStart` + `passiveDamage` | Daño por flechas de fuego | Alto |
| Exclusión de `damage` player-wide en `handleEndTurn` | Mantenimiento de equipo | Medio |
| `getModifierSum` con `operator ADD/MUL/SET` | ability-effects.ts para damage y difficulty | Alto |

## Nota sobre pasivas de unidad

Las habilidades pasivas como Resistencia, Línea defensiva, Presión, Anti-caballería, Romper filas, Formación defensiva NO deben migrarse a modificadores. Son intrínsecas a la unidad (`unit.abilities[]`) y se evalúan en `ability-effects.ts`. Mezclarlas con modificadores externos (cartas, identidades) complicaría el sistema de expiración y consumo.
