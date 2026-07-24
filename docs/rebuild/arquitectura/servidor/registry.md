# Sistema de Registry (Salas)

## Propósito
Registro central de todas las salas de juego activas. Actúa como fábrica y repositorio de instancias GameRoom.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `src/server/rooms.ts` | Map<string, GameRoom> + funciones de acceso |

## Implementación
```typescript
const rooms = new Map<string, GameRoom>();

export function getRoom(gameId: string): GameRoom {
  let room = rooms.get(gameId);
  if (!room) {
    room = new GameRoom(gameId);
    rooms.set(gameId, room);
  }
  return room;
}

export function removeRoomIfEmpty(gameId: string) {
  const room = rooms.get(gameId);
  if (room && room.isEmpty()) {
    rooms.delete(gameId);
  }
}
```

## Flujo de Datos
```
index.ts: JOINGAME
  │  getRoom(gameId) → crea o recupera GameRoom
  ▼
GameRoom.join(socketId, userId?)
  │
  ... (partida en curso)
  │
index.ts: LEAVE_GAME o disconnect
  │  room.leave(socketId)
  │  removeRoomIfEmpty(gameId) → limpia si ya no hay nadie
  ▼
Map actualizado
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `GameRoom` | Interna | Creación de instancias |

## Acoplamiento
- **Muy bajo**: implementación simple (24 líneas)
- GameRoom **no sabe que existe** el registry (desacople total)
- Única responsabilidad: mantener el mapa de salas activas
