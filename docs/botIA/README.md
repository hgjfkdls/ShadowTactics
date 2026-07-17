# Sistema de IA para jugar contra el computador

## Arquitectura

La IA corre completamente del lado del servidor (`src/server/ai/`). Aprovecha que el juego es una máquina de estados pura: `applyAction(state, action)` → nuevo `state`, sin efectos secundarios.

### Flujo de decisión

```
Turno de la IA
  → GameRoom.refreshTimer()
    → startTimer(expected)           ← timer arranca (safety net)
    → setTimeout(handleBotTurn, 500) ← agenda bot
      → handleBotTurn(info)
        → decideAI(state, pid, diff)   ← IA decide
        → handleAction(action, pid)    ← misma ruta que socket
          → applyAction(state, action) ← estado actualizado
          → onStateChanged(state)      ← broadcast a cliente
          → refreshTimer()             ← timer se reinicia
```

El timer arranca **antes** de que el bot ejecute su acción. Si la IA falla o el estado no cambia, el timer expira y `fireAutoAction` actúa como fallback (misma lógica que timeout humano).

## Estructura de archivos

```
src/server/ai/
├── AIPlayer.ts              → Orquestador principal con time budget
├── actions.ts               → Enumeración + validación de acciones
├── evaluate.ts              → Heurística de evaluación del estado
├── preparation.ts           → IA para fases de preparación
└── types.ts                 → Tipos compartidos (Weights, Difficulty)
```

## Integración en el servidor

### `GameRoom.ts` — Campos y métodos nuevos

| Miembro | Tipo | Descripción |
|---------|------|-------------|
| `PlayerSlot.isBot` | `boolean` | Indica si el slot es un bot |
| `GameRoom.isBotGame` | `boolean` | Bandera de partida contra IA |
| `GameRoom.botDifficulty` | `string` | Dificultad configurada |
| `handleBotTurn(info)` | método | Orquesta la acción del bot según la fase |
| `deployBotUnits(pid)` | async | Despliegue con 500ms entre unidades |
| `runAITurn(pid)` | async | Turno de juego con 500ms entre acciones |
| `isBotPlayer(pid)` | método | Verifica si un jugador es bot |

### Evento `CREATE_AI_GAME`

El cliente emite `CREATE_AI_GAME` con `{ difficulty: 'easy'|'medium'|'hard' }`. El servidor:
1. Crea un `GameRoom` con `gameId = ai_{timestamp}_{random}`
2. Asigna al humano como `p1`
3. Crea un slot de bot como `p2`
4. Envía `ROLE`, `STATE` y `AI_GAME_CREATED { gameId }` al cliente
5. El timer arranca y agenda la primera acción del bot

### Evento `AI_GAME_CREATED` (cliente)

El cliente escucha `AI_GAME_CREATED` para setear `gameId` en el estado de React, lo que permite que la App transicione a la pantalla de juego.

## Niveles de dificultad

| Nivel | Estrategia | Tiempo máximo | Ruido |
|-------|-----------|---------------|-------|
| **Fácil** | Greedy 1-ply + ruido aleatorio. Pesos defensivos | 2s | 20% |
| **Medio** | Greedy 1-ply sin ruido. Pesos balanceados | 3s | 0% |
| **Difícil** | Minimax 2-ply con poda. Pesos agresivos | 5s | 0% |

## Pesos de la heurística

```typescript
easy:   { hp: 1.5, kill: 0.5, pos: 0.3, dmg: 0.3, ap: 0.1, card: 0.2, formation: 0.1 }
medium: { hp: 1.0, kill: 1.0, pos: 0.6, dmg: 0.6, ap: 0.3, card: 0.4, formation: 0.3 }
hard:   { hp: 1.0, kill: 1.5, pos: 1.0, dmg: 0.8, ap: 0.5, card: 0.5, formation: 0.5 }
```

## Componentes de la evaluación (10 factores)

| # | Factor | Descripción | Rango |
|---|--------|-------------|-------|
| 1 | `hpAdvantage` | Diferencia de HP total entre ejércitos (normalizado) | -1 a 1 |
| 2 | `unitCount` | Diferencia de número de unidades (peso: hp * 0.3) | -1 a 1 |
| 3 | `graveyard` | Unidades eliminadas del rival menos las propias (tanh) | -1 a 1 |
| 4 | `generalSafety` | HP del general propio + amenaza a general enemigo | -0.5 a 1 |
| 5 | `killPotential` | Enemigos eliminables, diferenciando ataques con/sin contraataque | 0 a N |
| 6 | `positional` | Evaluación por clase: arqueros lejos, melee cerca, caballería flanqueo, general protegido | -0.15 a 0.15 |
| 7 | `formations` | Bonus por formaciones línea (3+ alineados) y adyacencia (3+ juntos) | 0 a 1 |
| 8 | `modifiers` | Penalización por debuffs propios (bloqueo, inmovil, dot) y bonus por buffs enemigos | -0.2 a 0.2 |
| 9 | `apEfficiency` | PA desperdiciado considerando carry-over (floor(ap/2)) | -1 a 0 |
| 10 | `cardAdvantage` | Diferencia de cartas en mano (tanh) | -1 a 1 |

## Acciones válidas (`actions.ts`)

### `getAllValidActions`
Genera todas las acciones posibles sin filtrar:
- **Movimiento**: a cada hex adyacente no ocupado (costo = `unit.movementCost`)
- **Ataque básico**: a cada enemigo en rango, verificando modificadores de alcance
- **Habilidades**: por cada habilidad activa de la unidad, genera targets según `targetType` (self, ally, enemy, position)
- **Cartas**: BUFF/DEBUFF con targets disponibles
- **Counter**: cartas COUNTER en fase COUNTER
- **End turn**: siempre disponible

### `canUseAbility`
Verifica `activation.blockFlags` y `activation.requireFlags` del `ABILITY_CONFIG` antes de generar acciones de habilidad. Evita generar acciones para habilidades bloqueadas por flags como `basic_attack`, `cabalgar`, `move`.

### `getValidActions`
Envuelve `getAllValidActions` y filtra simulando cada acción con `applyAction`. Solo retorna acciones que realmente cambian el estado (diferencia de PA o referencia de objeto distinta). Esto elimina acciones inválidas por:
- Costo de PA insuficiente (con modificadores)
- Targets no válidos según el reducer
- Flags de activación incorrectos
- Fase de turno incorrecta

## `handleBotTurn` — Fases compartidas (sin `playerId`)

Para fases donde ambos jugadores actúan simultáneamente:

| Fase | Comportamiento |
|------|---------------|
| `IDENTITY_SELECTION` | `decideAI` → `decideIdentity` elige identidad con sinergia |
| `REVEAL` | `handleRevealDismiss` — dismiss automático |
| `ROLL_RESULT` | `handleRollResultDismiss` — dismiss automático |
| `ROLL` (sin playerId) | `fireAutoAction` — tira dado por ambos jugadores |

Solo se ejecuta para el jugador bot, el humano decide normalmente.

## `handleBotTurn` — Fases con `playerId`

| Fase | Comportamiento |
|------|---------------|
| `DEPLOYMENT` | `deployBotUnits` async con 500ms entre unidades |
| `TURN` | `runAITurn` async con 500ms entre acciones |
| `IDENTITY_SELECTION` (con pid) | `decideAI` |
| `ROLL` (con pid) | `decideAI` → `decideRoll` |
| `DISCARD` | `decideAI` (vía `getValidActions`) |
| `COUNTER` | `decideAI` (vía `getValidActions`) |

### `deployBotUnits`

- Despliega todas las unidades del paso actual con 500ms de delay
- Prioriza el general si ya se desplegaron ≥10 unidades y aún no está
- Usa `findRandomDeployPosition` (misma lógica que timeout humano)
- Shufflea las entradas para variar el orden
- Límite de seguridad: 30 iteraciones

### `runAITurn`

- Ejecuta hasta 30 iteraciones (safety limit)
- **Stale detection**: si el PA del bot no cambia tras 3 acciones consecutivas, envía `END_TURN`
- AP = 0 → envía `END_TURN` inmediatamente
- Maneja `COUNTER` phase con `PASS_COUNTER`
- Maneja `DRAW` phase descartando la primera carta si la mano > 3
- Resuelve prompts de identidad pendientes (`pendingIdentityTarget`, `Espartano`, `Comandante`)
- 500ms de delay entre cada acción para sensación de "realidad"

## Timer como safety net

El timer **siempre arranca** antes de que el bot ejecute su acción:

1. `refreshTimer()` → `startTimer(expected)` → timer visible
2. `setTimeout(handleBotTurn, 500)` → agenda bot
3. Bot ejecuta acción → `handleAction` → `refreshTimer()` → timer se reinicia
4. Si la acción es rechazada (estado no cambia), el timer sigue corriendo
5. Si el timer expira, `fireAutoAction` ejecuta la misma lógica que timeout humano

Cada `handleAction` llama a `refreshTimer()` que reinicia el timer desde cero. Los delays de 500ms no afectan al timer porque este se renueva tras cada acción.

## Fase de preparación

La IA maneja automáticamente:

| Fase | Comportamiento |
|------|---------------|
| `IDENTITY_SELECTION` | Elige identidad con sinergia según unidades desplegadas |
| `ROLL` | Lanza el dado automáticamente |
| `REVEAL` | Dismiss automático |
| `ROLL_RESULT` | Dismiss automático |
| `DEPLOYMENT` | Despliegue con prioridad al general (misma lógica que timeout humano) |

## Uso desde el cliente

```typescript
import { createAIGame } from './net/socket';

createAIGame('easy');    // Fácil
createAIGame('medium');  // Medio (default)
createAIGame('hard');    // Difícil
```

## Limitaciones conocidas

- La IA no planifica combos entre múltiples unidades
- No considera el uso óptimo de cartas COUNTER (solo `PASS_COUNTER`)
- El despliegue usa posiciones aleatorias con prioridad al general (no planifica formaciones)
- La poda en dificultad Hard es básica (solo 2-ply)
- No evalúa el posicionamiento del rival para decidir movimientos defensivos
