# Sistema de Conexiones (Entry Point)

## Propósito
Punto de entrada del servidor HTTP + Socket.IO. Maneja conexiones de clientes, autenticación de sockets, enrutamiento de eventos, y orquestación del ciclo de vida de las salas de juego.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `src/server/index.ts` | Servidor HTTP, configuración Socket.IO, handlers de eventos |

## Responsabilidades
- Creación del servidor HTTP (Node.js `http.createServer`, sin Express)
- Configuración de Socket.IO con CORS permisivo
- Servicio de archivos estáticos en modo online (`dist/`)
- Handlers de eventos Socket.IO:
  - `JOIN_GAME`: Unir a sala (nueva o existente), asignar rol, manejar reconexión
  - `ASSETS_LOADED`: Marcar jugador listo, emitir `BOTH_PLAYERS_READY`, cancelar timeout de matchmaking
  - `ACTION`: Validar ownership del socket, delegar a `room.handleAction()`
  - `SURRENDER`: Similar a ACTION con acción de rendición
  - `DISMISS_REVEAL`, `DISMISS_ROLL_RESULT`: Sincronización 2 jugadores
  - `CREATE_AI_GAME`: Crear sala con oponente IA
  - `LEAVE_GAME`: Abandonar sala, limpiar si vacía
  - `disconnect`: Detectar desconexión, timer de 60s para auto-rendición
- Cableado de callbacks entre Socket.IO y GameRoom:
  - `onTimerTick` → emite `TIMER`
  - `onStateChanged` → emite `STATE`
  - `onGameOverCallback` → `submitReport()` + POST a web API
  - `onDisconnectCallback` → emite `OPPONENT_DISCONNECT`

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `rooms.ts` | Interna | `getRoom()`, `removeRoomIfEmpty()` |
| `report.ts` | Interna | `submitReport()` al terminar partida |
| `socket.io` | Externa | Servidor Socket.IO |
| Variables de entorno | Config | `MODE`, `SERVER_PORT`, URLs |

## Acoplamiento
- **Alto** con GameRoom: conoce múltiples métodos públicos y campos
- **Bajo** con report.ts: llamada única con parámetros bien definidos
- **Bajo** con rooms.ts: funciones simples de acceso
- **Desacople mediante callbacks**: index.ts no pasa Socket.IO a GameRoom; usa callbacks para emitir eventos
