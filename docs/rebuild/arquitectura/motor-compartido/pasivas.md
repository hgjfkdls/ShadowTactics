# Sistema de Pasivas

## Propósito
Motor de evaluación y aplicación de habilidades pasivas. Determina cuándo una pasiva está activa (según condiciones), y ejecuta sus efectos en los momentos apropiados (inicio de turno, combate, muerte, cambio de HP).

## Archivos Clave
| Archivo | Rol |
|---|---|
| `passive.ts` | Motor completo de pasivas (615 líneas) |

## Funciones Principales

| Función | Momento de activación |
|---|---|
| `evaluateActivation(state, unitId, activation, context)` | Evaluación de condiciones (usada por todas las demás) |
| `isPassiveActive(state, passiveConfig, unitId, context)` | Verifica si una pasiva está activa |
| `processTurnStartPassives(state, playerId)` | Inicio de turno: resistencia, linea_defensiva, guardia_real, etc. |
| `applyConfigEffectsToCombat(state, attacker, defender, ...)` | Durante combate: modifica dificultad, daño, defensa |
| `applyConfigEffectsToState(state, unitId, ...)` | Post-hit: flagPush para timesDamagedThisTurn |
| `syncConditionalModifiers(state, unitId)` | Sincroniza modificadores condicionales (HP thresholds) |
| `onHpChange(state, unitId)` | Cuando cambia HP: furia_berserker, etc. |
| `processOnKillPassives(state, killerId, killedId)` | Al matar: karma, camino_del_guerrero, terror |
| `processEndTurnPassives(state, playerId)` | Fin de turno: proteger_auto |

## Condiciones de Activación (18+ tipos)
- `turnStart`, `endTurn`, `onHit`, `onKill`, `whenAttacked`, `whenAttacking`
- `hasAttackedThisTurn`, `didMovePreviousTurn`, `targetDidMovePreviousTurn`
- `hpMaxPercent`, `targetIsIsolated`, `isAdjacentToAlly`, `isInFormation`
- `blockFlags`, `requireFlags`, `hasModifier`, `timesDamagedThisTurn`

## Flujo de Datos
```
Inicio de turno:
  applyTurnStart → processTurnStartPassives
    ├── Evalúa cada pasiva con activation.turnStart
    ├── applyConfigEffectsToState (addModifier, etc.)
    └── syncConditionalModifiers

Durante combate:
  applyDifficultyAbilities → applyConfigEffectsToCombat
  applyDamageAbilities → applyConfigEffectsToCombat
  applyDefenseAbilities → applyConfigEffectsToCombat
  applyPostHitAbilities → applyConfigEffectsToCombat + applyConfigEffectsToState

Al cambiar HP:
  dealDamage → onHpChange → syncConditionalModifiers

Al morir unidad:
  killUnit → processOnKillPassives

Fin de turno:
  handleEndTurn → processEndTurnPassives
```

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state` | State |
| `../hex` | Hex |
| `./utils` | Utilidades |
| `./modifiers/engine` | Modificadores |
| `./units` (BASE_STATS) | Unidades |
| `./data/ability-config` (ABILITY_CONFIG) | Habilidades |
| `./combat/ability-effects` (AbilityContext, CombatResult) | Combate (solo tipos) |
| `../i18n` | i18n |

## Acoplamiento
- **Alto**: 9 dependencias (casi todas las categorías del motor)
- **Ciclo tipo-only** con `combat/ability-effects.ts` (import mutuo de tipos)
- Es el segundo archivo más grande del motor (615 líneas)
- `processTurnStartPassives` es el punto más caliente: evalúa todas las pasivas de todas las unidades al inicio de cada turno
- Las pasivas están definidas dentro de `ABILITY_CONFIG` como configuraciones con `activation.conditions`
