# Sistema de Habilidades

## Propósito
Sistema de configuración y ejecución de habilidades de unidades (ataques, movimientos, habilidades especiales, habilidades de identidad, cartas). Es el sistema más grande del motor, con ~13 archivos de configuración y un handler de ejecución.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `data/ability-config/types.ts` | Tipos: AbilityConfig, ConfigEffect, ActivationCondition, AbilityRange, AbilityTarget |
| `data/ability-config/index.ts` | ABILITY_CONFIG: merge de todas las configs |
| `data/ability-config/shared.ts` | Habilidades comunes (ataque_basico, movimiento, meditacion) |
| `data/ability-config/archer.ts` | Habilidades de arquero |
| `data/ability-config/cavalry.ts` | Habilidades de caballería |
| `data/ability-config/infantry.ts` | Habilidades de infantería |
| `data/ability-config/lancer.ts` | Habilidades de lancero |
| `data/ability-config/archer-identity.ts` | Habilidades de identidad arquero |
| `data/ability-config/cavalry-identity.ts` | Habilidades de identidad caballería |
| `data/ability-config/infantry-identity.ts` | Habilidades de identidad infantería |
| `data/ability-config/lancer-identity.ts` | Habilidades de identidad lancero |
| `data/ability-config/general-identity.ts` | Habilidades de identidad general |
| `data/ability-config/handler/index.ts` | `handleAbility()`: ruteo de USE_ABILITY |
| `data/ability-config/handler/handler.ts` | `handleAbility()` completo: validación, ejecución, combate (1000+ líneas) |

## AbilityConfig
Cada habilidad tiene:
- `id`, `type` (attack/support/move/card), `icon`, `targetType`, `range`, `target`
- `base.attack`, `base.difficulty`, `base.paCost`
- `effects`: ConfigEffect[] (procesados por effects/processEffects)
- `handler`: función específica (opcional, override)
- `activation`: ActivationCondition (turnStart, onHit, onKill, whenAttacked, etc.)
- `extraDifficulty`, `extraAttack`, `flags`, `fixedDamage`, `allowedModifiers`

## Flujo de Ejecución (handler.ts)
```
handleAbility(state, action)
  │
  ├── 1. Validación: costo PA, flags, rango, target, condiciones de activación
  ├── 2. consumeAP
  ├── 3. Si tipo attack:
  │     └── resolveAttack() (pipeline de combate completo)
  ├── 4. Si tipo support:
  │     ├── Curación, buff, escudo, etc.
  │     └── processEffects() para efectos config-driven
  ├── 5. Si tipo move:
  │     └── Actualiza posición de la unidad
  └── 6. Post-procesamiento:
        ├── onHit/onKill effects
        ├── Sincronización de modificadores condicionales
        └── Registro en gameHistory
```

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state`, `action-types` | State |
| `../hex` | Hex |
| `./utils` | Utilidades |
| `./utils/rng` | Utilidades |
| `./helpers/ap` | Helpers (consumeAP) |
| `./combat` (resolveAttack, hit, ability-effects) | Combate |
| `./modifiers/engine` | Modificadores |
| `./units` | Unidades |
| `./actions/ability` | Acciones (buildAttackModifiers) |
| `./helpers/sounds` | Helpers (pickVoiceKey) |
| `./board/selection` | Selección |
| `./effects` | Efectos |
| `./data/ability-config` (ABILITY_CONFIG) | Propio |

## Acoplamiento
- **Muy alto**: handler.ts es el archivo más grande del motor (1000+ líneas) con ~15 dependencias
- **Transversal**: ABILITY_CONFIG es usado por casi todos los subsistemas (combate, fases, selección, efectos, pasivas)
- **Dos sistemas de efectos coexisten**: ABILITY_EFFECTS legacy (ability-effects.ts) y ConfigEffect nuevo (effects/processEffects.ts)
- Las configs de cartas se convierten a formato AbilityConfig para unificar el pipeline
