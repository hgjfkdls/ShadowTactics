# Sistema de Efectos

## Propósito
Procesador de efectos config-driven. Interpreta arrays de `ConfigEffect` definidos en las configuraciones de habilidades y cartas, y los aplica al estado del juego de forma genérica.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `effects/processEffects.ts` | `processEffects()`: intérprete principal de efectos |
| `effects/index.ts` | Re-export |

## Tipos de Efecto (ConfigEffect)
| Efecto | Propósito |
|---|---|
| `flagPush` | Activa un flag booleano en una unidad |
| `flagPop` | Desactiva un flag |
| `modifierPush` | Añade un modificador temporal |
| `modifierPop` | Elimina un modificador por ID/source |
| `combatMutator` | Modifica stats de combate (ataque, defensa, dificultad) |
| `stateChange` | Cambio directo de estado (HP, AP, posición) |
| `trigger` | Dispara otra habilidad o efecto |

## Flujo de Datos
```
ConfigEffect[] (desde ability-config o card-config)
  │
  ▼
processEffects(state, context, effects)
  │  context: { sourceUnit, targetUnit, playerId, abilityId, ... }
  │
  ├── flagPush → state.units[id].flags[flag] = true
  ├── flagPop  → state.units[id].flags[flag] = false
  ├── modifierPush → addModifier(state, ...)
  ├── modifierPop → removeModifier(state, ...)
  ├── combatMutator → modifica stats temporalmente (para el cómputo actual)
  ├── stateChange → HP, posición, etc. (vía updateUnit o dealDamage)
  └── trigger → ejecuta otra habilidad por ID
```

## Funciones Auxiliares
| Función | Propósito |
|---|---|
| `matchesFilter(context, filter)` | Evalúa condiciones (flags, HP range, distancia, etc.) |
| `getEffectValue(effect, context)` | Obtiene valor numérico del efecto (soporta identity bonuses y conditional values) |

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state` | State |
| `./data/ability-config/types` | Habilidades (tipos ConfigEffect) |
| `./data/ability-config` | Habilidades (ABILITY_CONFIG para effectValue) |
| `./utils` | Utilidades |
| `./modifiers/engine` | Modificadores |
| `../hex` | Hex |
| `./units` | Unidades (BASE_STATS) |

## Acoplamiento
- **Medio**: conoce ability-config, modifiers/engine, hex, y units
- Representa el **sistema de efectos nuevo** que coexiste con el legacy `ABILITY_EFFECTS` en `combat/ability-effects.ts`
- Es usado por: actions/card.ts, actions/identity.ts, data/ability-config/handler, data/card-config/handler
