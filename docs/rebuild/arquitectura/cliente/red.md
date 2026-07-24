# Sistema de Red (Socket.IO)

## Propósito
Conexión Socket.IO con el servidor de juego. Proporciona el socket singleton que usan los demás sistemas del cliente para comunicación en tiempo real.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `src/client/net/socket.ts` | Creación del socket singleton y helper createAIGame |

## Implementación
```typescript
import { io } from 'socket.io-client';

export const socket = io(window.location.origin, { autoConnect: true });

export function createAIGame(modelId: string) {
  socket.emit('CREATE_AI_GAME', { modelId });
}
```

## Eventos Socket.IO (Cliente → Servidor)
| Evento | Propósito |
|---|---|
| `JOIN_GAME` | Unirse a sala existente o nueva |
| `ACTION` | Enviar acción de juego |
| `SURRENDER` | Rendirse |
| `DISMISS_REVEAL` | Cerrar pantalla de revelación |
| `DISMISS_ROLL_RESULT` | Cerrar resultado de dados |
| `CREATE_AI_GAME` | Crear partida vs IA |
| `LEAVE_GAME` | Abandonar sala |
| `ASSETS_LOADED` | Assets precargados listos |

## Eventos Socket.IO (Servidor → Cliente)
| Evento | Propósito |
|---|---|
| `STATE` | Nuevo estado del juego |
| `TIMER` | Tick del temporizador |
| `ROLE` | Asignación de rol (p1/p2/spectator) |
| `LOAD_ASSETS` | Iniciar precarga de assets |
| `BOTH_PLAYERS_READY` | Ambos jugadores listos |

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `socket.io-client` | Externa | Librería Socket.IO |

## Acoplamiento
- **Medio-alto**: no hay capa de abstracción sobre Socket.IO; los nombres de eventos son strings
- **No depende** de ningún otro sistema del cliente
- El singleton es importado directamente por `useGameState` y `App.tsx`
