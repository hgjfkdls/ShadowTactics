# Sistema de Estado del Cliente

## Propósito
Gestiona el estado del juego en el cliente. Actúa como puente entre los eventos Socket.IO del servidor y el estado React, exponiendo una API imperativa (`sendAction`, `joinGame`, etc.) a todos los componentes.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `src/client/game/useGameState.ts` | Hook principal: suscripción a socket, dispatch de acciones, lógica de conexión/reconexión |
| `src/client/game/GameStateContext.tsx` | Provider de React que envuelve `useGameState` y lo expone vía contexto |

## Flujo de Datos
```
Socket.IO 'STATE' ──► useGameState ──► setState ──► GameStateContext ──► Componentes
Socket.IO 'TIMER' ──► useGameState ──► setTimer   ──► GameStateContext ──► TurnTimer
Socket.IO 'ROLE'  ──► useGameState ──► setRole    ──► GameStateContext ──► UI
                     │
Componentes ──► sendAction(action) ──► Socket.IO 'ACTION' ──► Servidor
```

## Responsabilidades
- Conexión/desconexión a sala de juego (`joinGame`, `leaveGame`)
- Envío de acciones al servidor (`sendAction`)
- Validación en cliente: verifica turno, fase, y regla de descartar-antes-de-actuar
- Manejo de reconexión y detección de oponente desconectado
- Integración con precarga de assets (`AssetPreloader`)
- Logging al sistema de debug (`debugStore.add`)
- Exposición de `GameState`, `TimerInfo`, `role`, `playerId`, `isPlayersTurn`

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `src/client/net/socket.ts` | Interna | Emit/on de eventos Socket.IO |
| `src/client/game/assets/AssetPreloader.ts` | Interna | Precarga de assets al recibir `LOAD_ASSETS` |
| `src/client/debug/DebugStore.ts` | Interna | Logging de acciones y estados |
| `@shared` (GameState, GameAction, TimerInfo) | Motor Compartido | Tipos |

## Acoplamiento
- **Alto** con el sistema de Red (socket.ts) — acoplamiento por nombres de eventos string
- **Alto** con todos los componentes de UI (todos consumen el contexto)
- **Bajo** con AssetPreloader y DebugStore (llamadas imperativas, no dependencias circulares)
- **Medio** con el Motor Compartido (solo tipos, no lógica de negocio pesada)
