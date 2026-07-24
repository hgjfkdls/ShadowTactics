# Sistema de State + Reducer

## Propósito
Corazón del motor compartido. Define la estructura del estado del juego (`GameState`), los tipos de acción (`GameAction`), el reducer principal (`applyAction`), y la inicialización del estado (`createInitialGameState`).

## Archivos Clave
| Archivo | Rol |
|---|---|
| `state.ts` | Tipos: GameState, Unit, PlayerResources, Card, HexMap, etc. |
| `action-types.ts` | Unión discriminada GameAction (14 tipos de acción) |
| `reducer.ts` | applyAction(): rutea acciones a handlers y aplica post-procesamiento |
| `init.ts` | createInitialGameState(): crea estado inicial con unidades, mazos, identidades |

## GameState (state.ts)
Campos principales:
- `gamePhase`: `'PREPARATION' | 'GAME' | 'GAME_OVER'`
- `turnPhase`: `'MAIN' | 'COUNTER' | 'DRAW'`
- `preparationPhase`: `'IDENTITY_SELECTION' | 'ROLL' | ...`
- `map`: `HexMap` (registro de hex → unitId)
- `units`: `Record<UnitId, Unit>`
- `players`: `Record<PlayerId, PlayerResources>`
- `activeModifiers`: `ModifierInstance[]`
- `gameHistory`: `HistoryEntry[]`
- `attackResults`: `AttackResult[]`
- `graveyard`: `Unit[]`
- `rng`: estado del PRNG mulberry32

## GameAction (action-types.ts)
14 tipos de acción:
- `SELECT_IDENTITY`, `ROLL_DICE`, `DEPLOY_UNIT`
- `END_TURN`, `USE_CARD`, `USE_ABILITY`, `PASS_COUNTER`, `DISCARD_CARD`
- `IDENTITY_ABILITY`, `ESPARTANO_CHOICE`, `COMANDANTE_CHOICE`
- `CONTINUE_ATTACK_RESULT`, `OCCUPY_POSITION`, `SURRENDER`, `CONFIRM_DEATH`
- `SIMULATE_PREPARATION` (solo testing)

## Reducer (reducer.ts)
```
applyAction(state, action) → GameState
  │
  ├── PREPARATION → phases/identity, roll, deployment
  ├── USE_CARD → actions/card.ts
  ├── USE_ABILITY → data/ability-config/handler/
  ├── END_TURN → phases/turn.ts
  ├── COMANDANTE_CHOICE, ESPARTANO_CHOICE → inline
  ├── CONTINUE_ATTACK_RESULT → inline
  ├── OCCUPY_POSITION, SURRENDER, CONFIRM_DEATH → inline
  │
  └── Post-procesamiento:
        ├── Asigna gameTime a history entry
        ├── Push attack results
        ├── Verifica general muerto → GAME_OVER
        └── Refresca formaciones
```

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state.ts` | Propio |
| `action-types.ts` | Propio |
| `./phases/*` | Fases |
| `./actions/*` | Acciones |
| `./data/ability-config/handler` | Habilidades |
| `./utils/*` | Utilidades |
| `./formations.ts` | Formaciones |
| `./modifiers/engine` | Modificadores |
| `../hex` | Hex |

## Acoplamiento
- **state.ts**: el sistema más referenciado de todo el proyecto. CERO subsistemas del motor no lo importan.
- **action-types.ts**: segundo más referenciado. Depende de state.ts y hex.
- **reducer.ts**: hub central con 8+ dependencias internas. Conoce todos los subsistemas del motor.
- **init.ts**: depende de state.ts y actions/card.ts para construir mazos.
