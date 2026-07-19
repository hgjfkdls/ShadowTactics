# Modelos de IA

## Arquitectura

```
AIPlayer.decideAI(modelId, state, pid, timeBudget?)
  ├── decidePreparation() ← para fases PREPARATION (compartido, síncrono)
  └── await model.decide(state, pid, timeBudget?) ← todos los modelos son async
       ├── [GreedyModel]   → greedy 1-ply o 2-ply minimax, <50ms, sin yield
       ├── [MCTSModel]     → MCTS con event pattern: batches de 3 rollouts + setImmediate
       └── [MinimaxModel]  → alpha-beta con TT, quiescence, iterative deepening + yield cada 100 nodos
```

Todos los modelos comparten `actions.ts` (generación de acciones válidas), `evaluate.ts` (heurística) y `preparation.ts` (preparación).

---

## Interface AIModel

```typescript
interface AIModel {
  config: AIModelConfig;
  decide(state: GameState, playerId: string, timeBudgetMs?: number): Promise<GameAction>;
  //                                              ^^^^^^^^^ opcional  ^^^^^^^ async
}
```

`decide()` es async porque los modelos largos (MCTS, Minimax) ceden el event loop periódicamente para permitir que los timers del juego y otras conexiones Socket.IO se procesen.

```typescript
type AIModelConfig = {
  id: string;
  name: string;
  description: string;
  algorithm: 'greedy' | 'mcts' | 'minimax';
  depth: number;
  timeLimitMs: number;
  noise: number;
  weights?: Weights;
};
```

---

## Yield al Event Loop

Para evitar que la IA bloquee el event loop de Node.js durante cómputos largos (MCTS: ~5s, Minimax: ~5s), los modelos ceden el control periódicamente mediante `yieldEventLoop()`:

```typescript
// src/server/ai/models/utils.ts
export function yieldEventLoop(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}
```

| Modelo | Frecuencia de yield | Máximo bloqueo |
|--------|---------------------|----------------|
| Greedy | Nunca (<50ms) | ~50ms |
| MCTS | Cada 3 rollouts | ~30ms |
| Minimax | Cada 100 nodos en alpha-beta | ~50ms |

---

## Modelos Disponibles

### CPU Fácil (`cpu_facil`)

| Propiedad | Valor |
|-----------|-------|
| **Algoritmo** | Greedy 1-ply |
| **Tiempo** | 2000ms |
| **Ruido** | 20% |
| **Pesos** | `{ hp: 1.5, kill: 0.5, pos: 0.3, dmg: 0.3, ap: 0.1, card: 0.2, formation: 0.1 }` |

Defensivo, con ruido aleatorio. Ideal para jugadores nuevos.

### CPU Medio (`cpu_medio`)

| Propiedad | Valor |
|-----------|-------|
| **Algoritmo** | Greedy 1-ply |
| **Tiempo** | 3000ms |
| **Ruido** | 0% |
| **Pesos** | `{ hp: 1.0, kill: 1.0, pos: 0.6, dmg: 0.6, ap: 0.3, card: 0.4, formation: 0.3 }` |

Balanceado, sin ruido, decisiones consistentes.

### CPU Difícil (`cpu_dificil`)

| Propiedad | Valor |
|-----------|-------|
| **Algoritmo** | Minimax 2-ply (Greedy con profundidad 2) |
| **Tiempo** | 5000ms |
| **Ruido** | 0% |
| **Pesos** | `{ hp: 1.0, kill: 1.5, pos: 1.0, dmg: 0.8, ap: 0.5, card: 0.5, formation: 0.5 }` |

Minimax con simulación de la mejor respuesta del oponente.

### General de los Mares (`general_mares`)

| Propiedad | Valor |
|-----------|-------|
| **Algoritmo** | Monte Carlo Tree Search (MCTS) |
| **Tiempo** | 5000ms |
| **Simulaciones** | ~500-1000 (depende del tiempo) |
| **Ruido** | 0% |
| **Pesos** | `PRIORITIES.hard` (solo para evaluación heurística en rollout truncado) |

**Event pattern:** `runBatch()` ejecuta 3 iteraciones MCTS (SELECT → EXPAND → SIMULATE → BACKPROPAGATE), luego `await yieldEventLoop()` cede el control. Esto permite que los timers del juego y otras conexiones se procesen entre batches.

**Heurística:** Cuando la simulación alcanza 30 turnos sin llegar a GAME_OVER, usa `evaluate()` normalizado con `tanh(score * 0.1)`. También corta simulaciones con score inicial < -3 (posición claramente perdedora).

### El Gran General (`el_gran_general`)

| Propiedad | Valor |
|-----------|-------|
| **Algoritmo** | Minimax con poda Alfa-Beta |
| **Tiempo** | 5000ms |
| **Profundidad máxima** | 20 ply (con iterative deepening) |
| **Profundidad real esperada** | 3-5 ply |
| **Ruido** | 0% |
| **Pesos** | `PRIORITIES.hard` |

**Componentes:**

| Componente | Descripción |
|------------|-------------|
| **Alpha-Beta pruning** | Poda de ramas que no mejoran el resultado |
| **Transposition Table** | Cache de posiciones por hash Zobrist-like. **Por instancia** (no global), evitando corrupción entre partidas concurrentes |
| **Quiescence Search** | 3 ply extra solo en acciones de captura/ataque, evitando el efecto horizonte |
| **Iterative Deepening** | Profundiza progresivamente 1..20 ply. Time management: estima si la siguiente profundidad tendrá tiempo de completarse |
| **Yielding** | `yieldEventLoop()` cada 100 nodos y entre profundidades. Máximo bloqueo: ~50ms |
| **Action Ordering** | TT best move primero, luego capturas (bajo HP), luego movimientos, luego cartas |

---

## Archivos del sistema de modelos

| Archivo | Propósito |
|---------|-----------|
| `models/utils.ts` | `yieldEventLoop()` — promesa resuelta con `setImmediate` |
| `models/types.ts` | Interfaces `AIModel` (async), `AIModelConfig` |
| `models/registry.ts` | Registro y lookup centralizado |
| `models/GreedyModel.ts` | Greedy 1-ply / 2-ply minimax (async) |
| `models/MCTSModel.ts` | MCTS con event pattern (setImmediate) |
| `models/MinimaxModel.ts` | Minimax con alpha-beta, TT, quiescence, iterative deepening |
| `models/presets.ts` | 5 modelos preconfigurados |
| `AIPlayer.ts` | Facade async: `decideAI(modelId, state, pid, timeBudget?)` |
| `GameRoom.ts` | `handleBotTurn` async con `botBusy` flag + `actionQueue` |

---

## Concurrencia

El servidor maneja múltiples partidas con IA concurrentes. Los siguientes mecanismos protegen contra condiciones de carrera:

| Mecanismo | Archivo | Propósito |
|-----------|---------|-----------|
| `transpositionTable` por instancia | `MinimaxModel.ts` | Cada sala tiene su propia TT, no se corrompen entre partidas |
| `botBusy` flag | `GameRoom.ts` | Evita que `fireAutoAction` (timeout) y `handleBotTurn` se ejecuten simultáneamente |
| `actionQueue` + `processingAction` | `GameRoom.ts` | Acciones entrantes (humanas o del bot) se encolan si hay una acción en proceso, evitando reentrada en `handleAction` |
| Async yield con `setImmediate` | `utils.ts` | Libera el event loop para que los timers de todas las salas puedan tickear |
