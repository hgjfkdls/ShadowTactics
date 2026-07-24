# Sistema de IA (Inteligencia Artificial)

## Propósito
Jugador automático para partidas single-player contra la IA. Incluye generación de acciones válidas, evaluación de posiciones, y modelos de decisión (Greedy, Minimax, MCTS).

## Archivos Clave
| Archivo | Rol |
|---|---|
| `AIPlayer.ts` | Orquestador: decide qué modelo usar según fase del juego |
| `actions.ts` | Generación de todas las acciones válidas desde un estado |
| `evaluate.ts` | Evaluación heurística de posiciones |
| `preparation.ts` | Lógica de IA para fase de preparación (identidad, dados, despliegue) |
| `models/registry.ts` | Registro de modelos de IA (Map<string, AIModel>) |
| `models/presets.ts` | 5 configuraciones predefinidas (facil, medio, dificil, el_gran_general, general_mares) |
| `models/GreedyModel.ts` | Modelo Greedy 1-ply (con opción 2-ply minimax) |
| `models/MinimaxModel.ts` | Minimax con alpha-beta, TT, ID, quiescence |
| `models/MCTSModel.ts` | Monte Carlo Tree Search |
| `models/types.ts` | Interfaz AIModel |
| `models/utils.ts` | yieldEventLoop para no bloquear |

## Modelos de IA
| ID | Algoritmo | Profundidad | Tiempo |
|---|---|---|---|
| `cpu_facil` | Greedy 1-ply | 1 | 2000ms |
| `cpu_medio` | Greedy 1-ply | 1 | 3000ms |
| `cpu_dificil` | Greedy 2-ply minimax | 2 | 5000ms |
| `el_gran_general` | Minimax (alpha-beta, TT, ID, quiescence) | 20 | 10000ms |
| `general_mares` | MCTS | 50 sims | 10000ms |

## Flujo de Datos
```
GameRoom.runAITurn(playerId)
  │
  ▼
AIPlayer.decideAI(modelId, state, playerId, timeBudget)
  ├── PREPARATION → decideIdentity / decideRoll (preparation.ts)
  ├── GAME → getModel(modelId).decide(state, playerId, timeBudget)
  │
  ▼
Model (Greedy | Minimax | MCTS)
  ├── Llama getValidActions(state, playerId) (actions.ts)
  │     ├── getAllValidActions(): genera todas las acciones legales
  │     └── getValidActions(): filtra simulando cada acción
  │
  ├── Evalúa cada acción candidata:
  │     └── Simula: applyAction(cloneState, action) → evaluate(newState, playerId)
  │
  └── Retorna la mejor acción
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `@shared` (GameState, applyAction, ability-config, card-config, hex, units, etc.) | Motor | Pesado: todo el motor compartido |
| `cloneState()` → `JSON.parse(JSON.stringify(...))` | Propia | Deep clone del estado |

## Acoplamiento
- **Muy alto** con el Motor Compartido: actions.ts y evaluate.ts conocen íntimamente ability-config, card-config, unidades, stats, modificadores, etc.
- **Medio** entre AIPlayer y los modelos (vía registry, desacoplado por interfaz)
- **Bajo** con GameRoom: GameRoom llama `decideAI()` sin conocer detalles internos
- **Clonación pesada**: `JSON.parse(JSON.stringify())` es el método universal de deep clone
