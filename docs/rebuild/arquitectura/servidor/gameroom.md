# Sistema de GameRoom

## Propósito
Núcleo del servidor: gestiona una sala de juego completa desde su creación hasta el fin de la partida. Maneja estado del juego, jugadores, acciones, snapshots, reconexión, y coordinación con el sistema de IA.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `src/server/GameRoom.ts` | Clase GameRoom (851 líneas) |

## Responsabilidades

### Gestión de Jugadores
- `players: PlayerSlot[]` (máx 2: `p1`, `p2`)
- `spectators: Set<string>` (observadores adicionales)
- `join(socketId, userId?)`, `leave(socketId)`, `addBotPlayer(playerId)`
- `isPlayer(socketId, playerId)`, `getPlayerIdBySocket(socketId)`, `getPlayerCount()`

### Manejo de Acciones
- `handleAction(action, playerId)`: pipeline central
  - Protección contra reentrancia (`processingAction` flag + cola FIFO)
  - Registro en `actions: ActionRecord[]`
  - Aplicación via `applyAction()` del motor compartido
  - Snapshot periódico (cada acción)
  - Callback `onStateChanged`
  - Si `GAME_OVER`, dispara `onGameOverCallback`
  - Refresca temporizador

### Reconexión
- `onPlayerDisconnect(playerId)`: marca `disconnectedAt`, timer 60s para auto-rendición
- `onPlayerReconnect(playerId)`: limpia timer y flag
- `rebuildStateUpTo(actionIndex)`: reconstruye estado hasta un punto (snapshot + replay)

### Snapshots
- `snapshots: StateSnapshot[]`: cada acción genera un snapshot
- Permite reconstrucción de estado para replays/reconexión

## Flujo de Datos
```
index.ts: recibe 'ACTION' de socket
  │  valida ownership
  ▼
GameRoom.handleAction(action, playerId)
  ├── Cola si ya procesando
  ├── applyAction(state, action) → nuevo GameState
  ├── snapshot si corresponde
  ├── onStateChanged(state) → index.ts → emite 'STATE'
  ├── Si GAME_OVER → onGameOverCallback
  └── refreshTimer()
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `@shared` (applyAction, createInitialGameState, GameState, GameAction, etc.) | Motor | Reducción de estado, tipos |
| `./ai/AIPlayer.ts` | IA | `decideAI()` para turnos de bot |
| `./ai/evaluate.ts` | IA | `evaluateDeployPosition()` para despliegue de bots |
| Callbacks (onTimerTick, onStateChanged, etc.) | Config | Cableados por index.ts |

## Acoplamiento
- **Muy alto** con el Motor Compartido (depende de tipos, reducer, creación de estado, hex utils)
- **Medio** con el sistema de IA (usa AIPlayer y evaluate directamente)
- **Bajo** con rooms.ts y report.ts (no los importa; se comunican vía index.ts)
- **Alto internamente**: el timer está integrado en la misma clase (851 líneas)
