# Servidor — Índice de Sistemas

## Visión General

El servidor es una aplicación Node.js con Socket.IO que gestiona salas de juego multiplayer, temporizadores, jugadores IA, y reportes post-partida. Sigue una arquitectura de **callbacks** para desacoplar la capa de red (Socket.IO) de la lógica de sala (GameRoom).

```
index.ts (entry point)
  ├── rooms.ts (registry de GameRooms)
  │     └── GameRoom.ts
  │           ├── @shared (applyAction, createInitialGameState)
  │           ├── ai/AIPlayer.ts
  │           │     ├── ai/models/ (GreedyModel, MinimaxModel, MCTSModel)
  │           │     ├── ai/actions.ts
  │           │     ├── ai/evaluate.ts
  │           │     └── ai/preparation.ts
  │           └── callbacks → index.ts → Socket.IO emits
  └── report.ts (submitReport → Web API)
```

## Sistemas

| Documento | Descripción | Archivos |
|---|---|---|
| [Conexiones](conexiones.md) | Entry point HTTP/Socket.IO, handlers de eventos | `src/server/index.ts` |
| [GameRoom](gameroom.md) | Sala de juego: estado, acciones, reconexión, snapshots | `src/server/GameRoom.ts` |
| [Timer](timer.md) | Temporizadores de fase, auto-acciones al expirar | `src/server/GameRoom.ts` (sección timer) |
| [IA](ia.md) | Jugador automático: AIPlayer, modelos, generación de acciones, evaluación | `src/server/ai/` |
| [Reportes](reportes.md) | Cómputo y envío de reportes post-partida | `src/server/report.ts` |
| [Registry](registry.md) | Registro y ciclo de vida de salas | `src/server/rooms.ts` |

## Acoplamiento Interno

- **GameRoom** es el hub central: depende del Motor Compartido, del sistema de IA, y expone callbacks
- **Conexiones** (index.ts) actúa como orquestador: crea GameRooms, cablea callbacks, maneja Socket.IO
- **Registry** es simple y está bien desacoplado (GameRoom no sabe que existe)
- **Reportes** está desacoplado vía callbacks (GameRoom no importa report.ts directamente)
- **Timer** está acoplado dentro de GameRoom (comparten el mismo archivo)
