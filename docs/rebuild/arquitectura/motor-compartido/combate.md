# Sistema de Combate

## Propósito
Resolución de ataques: cálculo de dificultad, tirada de dados, modificación por habilidades/pasivas/aura, aplicación de daño, contraataques, y registro de resultados.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `combat/hit.ts` | `getDifficulty()`, `isCritical()`, `getCriticalBonus()` |
| `combat/counter.ts` | `canCounterattack()`, `getCounterDamage()` |
| `combat/kill.ts` | `dealDamage()`, `killUnit()` |
| `combat/resolver.ts` | `resolveAttack()`: pipeline principal de resolución |
| `combat/ability-effects.ts` | Hooks por fase: `applyDifficultyAbilities`, `applyDamageAbilities`, `applyDefenseAbilities`, `applyPostHitAbilities`, `applyCostAbilities`, `getUnitModifiers` |
| `combat/compute.ts` | `computeAttack()`, `getAbilityConfig()` |

## Pipeline de Resolución (resolver.ts)
```
resolveAttack(state, attacker, defender, abilityId, rng)
  │
  ├── 1. getDifficulty (hit.ts)
  │     └── Dificultad base: 7 (arquero), 8 (otros) + modificadores
  │
  ├── 2. applyDifficultyAbilities (ability-effects.ts)
  │     ├── Aplica aura (general cerca: -1 difficulty)
  │     ├── Aplica modificadores (getModifierSum)
  │     └── Aplica pasivas (applyConfigEffectsToCombat)
  │
  ├── 3. Roll 2d6 + isCritical (crítico en 11-12)
  │
  ├── 4. Si acierta:
  │     ├── applyDamageAbilities → modifica daño base
  │     ├── applyDefenseAbilities → modifica defensa
  │     ├── applyCostAbilities → modifica costo de PA
  │     └── dealDamage (kill.ts) → escudo → HP
  │
  ├── 5. applyPostHitAbilities
  │     ├── Efectos config-driven onHit
  │     └── Sincroniza modificadores condicionales
  │
  ├── 6. canCounterattack (counter.ts)
  │     └── Si aplica: getCounterDamage (flat 2)
  │
  └── 7. consumeModifier (modifiers/engine)
        └── Consume modificadores de ataque/dificultad/daño/defensa/costo
```

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state` | State |
| `./utils/rng` | Utilidades |
| `./utils` (updateUnit, etc.) | Utilidades |
| `./modifiers/engine` | Modificadores |
| `./aura` | Aura |
| `./passive` | Pasivas |
| `./units` | Unidades |
| `./data/ability-config` | Habilidades |
| `../hex` | Hex |
| `../../debug` | Debug |

## Acoplamiento
- **Muy alto**: el pipeline de combate toca 10+ subsistemas diferentes
- **Ciclo tipo-only** con passive.ts: `ability-effects.ts` ← → `passive.ts`
- **Alto** con modifiers/engine: 13+ llamadas a consumeModifier por ataque
- **Alto** con aura.ts: cálculo de dificultad y defensa
- `resolver.ts` es el archivo más complejo del pipeline de combate
