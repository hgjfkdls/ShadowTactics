# Modelos de IA

## Arquitectura

```
AIPlayer.decideAI(modelId, state, pid)
  ├── decidePreparation() ← para fases PREPARATION (compartido)
  └── getModel(modelId).decide(state, pid)
       ├── [GreedyModel]  → evalúa todas las acciones, elige la mejor
       └── [MCTSModel]    → Monte Carlo Tree Search con simulación
```

Todos los modelos comparten `actions.ts` (generación de acciones válidas), `evaluate.ts` (heurística) y `preparation.ts` (fases de preparación). Cada modelo implementa `AIModel.decide()` con su propio algoritmo.

---

## Interface AIModel

```typescript
interface AIModel {
  config: AIModelConfig;
  decide(state: GameState, playerId: string): GameAction;
}

type AIModelConfig = {
  id: string;           // Identificador único (ej: 'cpu_facil')
  name: string;         // Nombre mostrado al usuario (ej: 'CPU Fácil')
  description: string;  // Descripción del comportamiento
  algorithm: 'greedy' | 'mcts';
  depth: number;        // Profundidad de búsqueda (ply para greedy, simulaciones para MCTS)
  timeLimitMs: number;  // Tiempo máximo por decisión
  noise: number;        // Ruido aleatorio 0..1 (0 = determinista)
  weights?: Weights;    // Pesos de heurística (opcional, por defecto usa los de dificultad media)
};
```

---

## Modelos Disponibles

### CPU Fácil (`cpu_facil`)

| Propiedad | Valor |
|-----------|-------|
| **Algoritmo** | Greedy 1-ply |
| **Tiempo** | 2000ms |
| **Ruido** | 20% |
| **Pesos** | `{ hp: 1.5, kill: 0.5, pos: 0.3, dmg: 0.3, ap: 0.1, card: 0.2, formation: 0.1 }` |

**Comportamiento:** Prioriza mantener HP alto sobre eliminar unidades. El ruido aleatorio del 20% hace que ocasionalmente tome decisiones subóptimas. Ideal para jugadores nuevos.

**Estrategia:** Defensivo. Prefiere no arriesgar aunque tenga oportunidades de kill.

---

### CPU Medio (`cpu_medio`)

| Propiedad | Valor |
|-----------|-------|
| **Algoritmo** | Greedy 1-ply |
| **Tiempo** | 3000ms |
| **Ruido** | 0% |
| **Pesos** | `{ hp: 1.0, kill: 1.0, pos: 0.6, dmg: 0.6, ap: 0.3, card: 0.4, formation: 0.3 }` |

**Comportamiento:** Balanceado. Sin ruido, decisiones consistentes. Evalúa todas las acciones disponibles y elige la mejor según la heurística.

**Estrategia:** Equilibrado. Ataca cuando es favorable, se retira cuando está en desventaja.

---

### CPU Difícil (`cpu_dificil`)

| Propiedad | Valor |
|-----------|-------|
| **Algoritmo** | Minimax 2-ply (Greedy con profundidad 2) |
| **Tiempo** | 5000ms |
| **Ruido** | 0% |
| **Pesos** | `{ hp: 1.0, kill: 1.5, pos: 1.0, dmg: 0.8, ap: 0.5, card: 0.5, formation: 0.5 }` |

**Comportamiento:** Para cada acción posible, simula la mejor respuesta del oponente (2-ply minimax). Elige la acción que maximiza el score en el peor escenario. Pesos agresivos: prioriza kills y posición sobre HP.

**Estrategia:** Agresivo y calculador. Busca eliminar unidades enemigas y no sobrevalora su propio HP.

**Flujo:**
```
for each acción propia:
  simState = applyAction(state, acción)
  bestOppScore = -∞
  for each acción del oponente:
    oppState = applyAction(simState, acción oponente)
    oppScore = evaluate(oppState, playerId)
    bestOppScore = max(bestOppScore, oppScore)
  score = min(evaluate(simState), bestOppScore)  // minimax
```

---

### General de los Mares (`general_mares`)

| Propiedad | Valor |
|-----------|-------|
| **Algoritmo** | Monte Carlo Tree Search (MCTS) |
| **Tiempo** | 5000ms |
| **Profundidad** | 50 simulaciones por nodo |
| **Ruido** | 0% |
| **Pesos** | No usa heurística (solo simulación aleatoria) |

**Comportamiento:** No evalúa posiciones con heurística. En su lugar, simula partidas completas (o hasta 30 turnos) jugando aleatoriamente desde cada posible acción. La acción que más veces lleva a la victoria es la elegida.

**Estrategia:** Impredecible y adaptable. No sigue patrones fijos, descubre tácticas por exploración aleatoria.

**Algoritmo MCTS (4 pasos):**

```
1. SELECT (UCB1)
   ┌─────────────────────────────────┐
   │ UCB1 = winRate + C * sqrt(ln(N) │
   │                   / n)           │
   │ donde:                           │
   │   winRate = wins / visits        │
   │   C = sqrt(2) (constante de      │
   │       exploración)               │
   │   N = visits del padre           │
   │   n = visits del hijo            │
   └─────────────────────────────────┘
   
2. EXPAND → crear nodo hijo con acción aleatoria no explorada

3. SIMULATE (rollout) → jugar aleatorio hasta GAME_OVER o 30 turnos
   ┌────────────────────────────────────────┐
   │ state = clone(nodo.state)              │
   │ for i = 0..30:                         │
   │   if state.gamePhase === 'GAME_OVER':  │
   │     return state.winner                │
   │   actions = getValidActions(state)     │
   │   action = random(actions)             │
   │   state = applyAction(state, action)   │
   │ return null (empate)                   │
   └────────────────────────────────────────┘

4. BACKPROPAGATE
   ┌─────────────────────────────────┐
   │ nodo.visits++                   │
   │ nodo.wins += resultado          │
   │   (1 = victoria, -1 = derrota, │
   │    0 = empate)                  │
   │ nodo = nodo.parent              │
   └─────────────────────────────────┘

→ Repetir 1-4 hasta agotar tiempo
→ Elegir la acción raíz con más visitas
```

**Ventajas del MCTS sobre Minimax:**

| Aspecto | Minimax (cpu_dificil) | MCTS (general_mares) |
|---------|----------------------|---------------------|
| Profundidad máxima | 2-ply (fija) | Ilimitada (hasta 30 turnos en simulación) |
| Poda | Manual (limitada) | Natural (UCB1 concentra en ramas prometedoras) |
| Evalúa posiciones | Heurística (aproximada) | Simulación (exacta hasta GAME_OVER) |
| Aleatoriedad | Manejo pobre | Natural (simula con RNG real) |
| Sinergias | No detecta | Descubre por simulación |
| Rendimiento | Rápido (pocas simulaciones) | Intensivo (miles de simulaciones) |

---

## Cómo agregar un nuevo modelo

**1. Crear la clase del modelo** implementando `AIModel`:

```typescript
// src/server/ai/models/MiModelo.ts
import type { GameState, GameAction } from '@shared';
import { applyAction } from '@shared/game';
import type { AIModel, AIModelConfig } from './types';
import { getValidActions, cloneState } from '../actions';
import { evaluate, getWeights } from '../evaluate';

export class MiModelo implements AIModel {
  readonly config: AIModelConfig;

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  decide(state: GameState, playerId: string): GameAction {
    // Implementar algoritmo aquí
    return { type: 'END_TURN', playerId: playerId as any };
  }
}
```

**2. Registrar en `presets.ts`**:

```typescript
import { MiModelo } from './MiModelo';

registerModel(new MiModelo({
  id: 'mi_modelo',
  name: 'Mi Modelo',
  description: 'Descripción del modelo',
  algorithm: 'greedy',
  depth: 1,
  timeLimitMs: 3000,
  noise: 0,
  weights: { hp: 1.0, kill: 1.0, pos: 0.6, dmg: 0.6, ap: 0.3, card: 0.4, formation: 0.3 },
}));
```

**3. Agregar botón en el cliente** (`App.tsx`):

```tsx
<button onClick={() => createAIGame('mi_modelo')}>Mi Modelo</button>
```

**4. El modelo aparece automáticamente** en el servidor. No requiere cambios en `GameRoom.ts`, `AIPlayer.ts` ni `index.ts`.

---

## Archivos del sistema de modelos

| Archivo | Propósito |
|---------|-----------|
| `src/server/ai/models/types.ts` | Interfaces `AIModel`, `AIModelConfig` |
| `src/server/ai/models/registry.ts` | Registro y lookup centralizado |
| `src/server/ai/models/GreedyModel.ts` | Implementación greedy + minimax |
| `src/server/ai/models/MCTSModel.ts` | Implementación MCTS con UCB1 |
| `src/server/ai/models/presets.ts` | 4 modelos preconfigurados |
| `src/server/ai/AIPlayer.ts` | Facade que recibe `modelId` |
