# Capa Board — Estrategia de migración

## Estado actual

El modelo de datos está en `src/shared/game/state.ts`. Los helpers y utilitarios están dispersos:

| Archivo | Contenido | Problema |
|---------|-----------|----------|
| `state.ts` | Tipos + `GameState` + `PlayerResources` + `Unit` | Mezcla tipos con datos; algunos helpers inline |
| `utils.ts` | Re-exporta desde `utils/` | Capa fina, bien |
| `utils/pipe.ts` | `pipeState` | Función pura, bien |
| `utils/helpers.ts` | `killUnit`, `isHexOccupied`, `isWithinBounds`, `updateUnit`, `countPlayerClasses`, `dealDamage` | Mezcla lógica de board (isHexOccupied) con lógica de combate (killUnit, dealDamage) |
| `utils/rng.ts` | RNG | Independiente, bien |
| `hex.ts` | Geometría hexagonal | Independiente, bien |
| `movement/cost.ts` | `getMovementCost` | Bien separado |
| `units/` | `stats.ts`, `factory.ts`, `index.ts` | Bien separado |
| `data/abilities.ts` | Definiciones de habilidades | Bien separado |
| `data/identities.ts` | Definiciones de identidades | Bien separado |

## Estado ideal

```
@shared/game/
  state.ts                    → solo tipos: GameState, PlayerResources, Unit, HistoryEntry
  board/
    hex.ts                    → geometría (ya existe en @shared/hex.ts)
    map.ts                    → generación de mapa, bounds (ya existe en @shared/hex.ts isInsideMap)
    collision.ts              → isHexOccupied, isWithinBounds (mover desde utils/helpers.ts)
  units/
    stats.ts                  → BASE_STATS (ya existe)
    factory.ts                → createUnit (ya existe)
    queries.ts                → countPlayerClasses, findUnitByClass, getUnitsByOwner, getPlayerAP
  modifiers/
    types.ts                  → ModifierInstance (ya existe)
    engine.ts                 → addModifier, consumeModifier, getModifierSum, processModifiersAtTurnStart (ya existe)
  combat/
    resolver.ts               → resolveAttack (ya existe)
    ability-effects.ts        → AbilityHandler, ABILITY_EFFECTS (ya existe)
    counter.ts                → canCounterattack, getCounterDamage (ya existe)
    hit.ts                    → getDifficulty, isCritical, getCriticalBonus (ya existe)
    damage.ts                 → dealDamage (mover desde utils/helpers.ts)
    kill.ts                   → killUnit, checkGeneralKilled (mover desde utils/helpers.ts)
  actions/
    move.ts, attack.ts, card.ts, ability.ts, identity.ts, reducer.ts  → ya existen
  phases/
    turn.ts, deployment.ts, roll.ts, identity-apply.ts, simulate.ts  → ya existen
```

## Migración

### Fase 1: Extraer `queries.ts`

```typescript
// @shared/game/units/queries.ts
export function countPlayerClasses(state: GameState, playerId: string): Record<string, number>
export function findUnitByClass(state: GameState, playerId: string, cls: string): Unit | undefined
export function getUnitsByOwner(state: GameState, playerId: string): Unit[]
export function getPlayerAP(state: GameState, playerId: string): number  // desde actions/helpers.ts
```

**Proteger**: todas las importaciones actuales de `countPlayerClasses` desde `@shared/game/utils` y `getPlayerAP` desde `@shared/game/actions`. Mantener re-exportaciones para no romper imports existentes.

### Fase 2: Separar `damage.ts` y `kill.ts`

- Mover `dealDamage` de `utils/helpers.ts` a `combat/damage.ts`
- Mover `killUnit` de `utils/helpers.ts` a `combat/kill.ts`
- Mover `checkGeneralKilled` del reducer a `combat/kill.ts`
- Mantener re-export desde `utils/helpers.ts` o `utils/index.ts`

**Proteger**: `dealDamage` es llamado desde `resolver.ts`, `attack.ts`, `ability.ts`, `identity.ts`. Todas las importaciones deben actualizarse o mantenerse mediante re-export.

### Fase 3: Separar `collision.ts`

```typescript
// @shared/game/board/collision.ts
export function isHexOccupied(state: GameState, position: HexCoord, excludeUnitId?: string): boolean
export function isWithinBounds(pos: HexCoord, radius?: number): boolean
```

**Proteger**: `isHexOccupied` se usa en ~15 archivos. Mantener re-export desde `utils/index.ts` durante la transición.

## Interacciones críticas a proteger

| Interacción | Dependencias | Riesgo |
|-------------|-------------|--------|
| `countPlayerClasses` en `deployment.ts` y `onHexClick` | Crucial para validar límite de 3 por clase | Alto |
| `getPlayerAP` en `ActionPanel.tsx`, `HexBoard.tsx` y todos los handlers | Crucial para UI de PA | Alto |
| `dealDamage` → `killUnit` → `checkGeneralKilled` | Cadena de combate completa | Alto |
| `isHexOccupied` en movimiento, despliegue, habilidades | Usado en toda acción que valida hex | Alto |

## Estrategia de rollout

1. Crear los nuevos archivos primero
2. Migrar las importaciones una por una en PRs separados
3. Mantener re-exportaciones en `utils/index.ts` hasta que todos los consumidores estén migrados
4. Ejecutar test suite completa después de cada migración
5. Eliminar re-exportaciones viejas solo cuando no queden consumidores
