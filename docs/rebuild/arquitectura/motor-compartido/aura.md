# Sistema de Aura

## Propósito
Implementa el aura de mando del general, que otorga bonificaciones a unidades aliadas cercanas (rango 2). Cada clase recibe un beneficio diferente, limitado a 1 unidad por clase.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `aura.ts` | getAuraBuffs, AURA_CONFIG |

## AURA_CONFIG
```typescript
{
  range: 2,
  buffs: {
    archer:   { difficultyReduction: 1 },  // -1 dificultad al atacar
    infantry: { shieldPoints: 2 },          // +2 escudo
    cavalry:  { difficultyPenalty: 1 },     // +1 dificultad al ser atacado
    lancer:   { defenseBonus: 1 },          // +1 defensa
  }
}
```

## Funciones

### getAuraBuffs(state, unitId, playerId?)
Para una unidad, determina si está dentro del aura del general aliado y qué buffs recibe. Limitado a 1 unidad por clase (el general solo proyecta su aura a un arquero, un infante, etc.).

## Flujo de Datos
```
combat/ability-effects.ts:
  applyDifficultyAbilities → getAuraBuffs(attacker) → difficultyReduction
  applyDefenseAbilities → getAuraBuffs(defender) → defenseBonus

actions/ability.ts:
  buildAttackModifiers → getAuraBuffs → display en UI

phases/turn.ts:
  applyTurnStart → regenera escudos de infantería en aura
```

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state` | State |
| `../hex` (hexDistance) | Hex |

## Acoplamiento
- **Bajo**: solo 2 dependencias (state y hex)
- Es consumido por: combat/ability-effects, actions/ability, phases/turn
- El aura es un concepto puramente posicional (distancia al general)
