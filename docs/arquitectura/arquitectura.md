[docs](../docs.md) > [arquitectura](./docs.md) > arquitectura

[volver](./docs.md) | [prev](./fases/docs.md) | [next](./arquitectura_recomendada.md)

# Arquitectura — Shadow Tactics

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Build | Vite 5 + TypeScript 5.4 |
| Frontend | React 18.2 + Tailwind CSS 4 |
| Backend | Socket.IO 4.8 sobre HTTP server raw |
| Extras | tsx (ejecución TS), nodemon (auto-reload) |

No es Next.js. Es un SPA con Vite + React y un servidor Socket.IO separado.

---

## Estructura de carpetas

```
src/
├── client/       → UI con React
├── server/       → Servidor Socket.IO del juego
├── shared/       → Lógica pura compartida (sin UI ni server)
└── test/         → Scripts de prueba ad-hoc

docs/
├── analisis.md           → Dudas y recomendaciones de diseño
├── arquitectura/
│   └── arquitectura.md   ← Este archivo
└── game/
    ├── juego.md          → Reglas del juego
    ├── cartas_efecto.md  → Cartas de efecto
    ├── cartas_identidad.md → Cartas de identidad
    └── unidades.md       → Stats y habilidades de unidades
```

---

## Arquitectura general

```
npm run dev (:5173)                    npm run server (:3000)
┌──────────────────────┐              ┌──────────────────────┐
│   React App          │              │   Socket.IO Server   │
│                      │  Socket.IO   │                      │
│  App.tsx             │◄────────────►│  index.ts            │
│  HexBoard            │              │    │                 │
│  useGameState        │              │  rooms.ts            │
│  DebugPanel          │              │    │                 │
└──────────────────────┘              │  GameRoom.ts         │
                                      │    │                 │
                                      │  shared/reducer.ts  │
                                      └──────────────────────┘
```

Dos procesos separados. Frontend en `:5173`, servidor en `:3000`. Sin REST API — toda comunicación vía Socket.IO.

---

## `src/shared/` — Lógica compartida (sin dependencias)

Código puro que corre igual en cliente y servidor.

### `shared/hex/` — Sistema de coordenadas hexagonales axiales

| Archivo | Propósito |
|---------|-----------|
| `coord.ts` | Tipo `HexCoord { q, r }` — coordenadas axiales |
| `directions.ts` | 6 vectores de dirección hexagonal |
| `distance.ts` | `hexDistance(a, b)` — distancia entre dos hex |
| `neighbors.ts` | `hexNeighbors(c)` — 6 hex adyacentes |
| `range.ts` | `hexRange(center, radius)` — todos los hex en un radio |
| `map.ts` | `HexMap`, `generateHexMap(r)` — generación del tablero |
| `index.ts` | Re-exporta todo |

### `shared/game/` — Motor de juego

| Archivo | Propósito |
|---------|-----------|
| `state.ts` | Tipos `GameState`, `Unit`, `Player`, `Card`, fases del juego |
| `actions.ts` | Tipo unión `GameAction` — todas las acciones posibles |
| `reducer.ts` | `applyAction(state, action)` — reducer puro, corazón de la lógica |
| `init.ts` | `createInitialGameState()` — estado inicial |
| `utils.ts` | RNG determinista (LCG), `rollDice()` |
| `index.ts` | Re-exporta todo |

---

## `src/server/` — Servidor (Socket.IO)

| Archivo | Propósito |
|---------|-----------|
| `index.ts` | Crea servidor HTTP + Socket.IO en puerto 3000. Maneja eventos: `JOIN_GAME`, `ACTION`, `LEAVE_GAME` |
| `GameRoom.ts` | Clase que encapsula una partida: 2 jugadores + espectadores, historial de acciones, snapshots de estado. Delega lógica a `shared/reducer.ts` |
| `rooms.ts` | Mapa singleton de salas activas. `getRoom(id)`, `removeRoomIfEmpty(id)` |
| `types.ts` | Tipos legacy (duplicados de GameRoom) |

Conexiones sin autenticación. El primer jugador es p1, el segundo p2. Estado en memoria volátil.

---

## `src/client/` — Frontend React

| Archivo / Carpeta | Propósito |
|-------------------|-----------|
| `main.tsx` | Punto de entrada, monta `<App>` |
| `App.tsx` | Componente raíz. Pantalla de unión o sala de juego |
| `style.css` | Import de Tailwind + estilos globales |
| `net/socket.ts` | Instancia Socket.IO conectada a `localhost:3000` |
| `game/useGameState.ts` | Hook principal: conecta Socket.IO con el estado de React |
| `game/board/HexBoard.tsx` | Tablero SVG: genera hexágonos, zoom/pan, interacción |
| `game/board/HexTile.tsx` | Renderiza un hexágono individual |
| `game/board/UnitsLayer.tsx` | Renderiza unidades como círculos de colores |
| `game/board/hexMath.ts` | Conversión axial → pixel para SVG |
| `game/board/movementRange.ts` | Calcula hexágonos alcanzables por una unidad |
| `game/board/useBoardInteraction.ts` | Estado de hover/selection en el tablero |
| `game/board/useViewport.ts` | Estado de zoom/pan del SVG |
| `debug/DebugStore.ts` | Almacén observable para eventos de depuración |
| `debug/DebugPanel.tsx` | Panel lateral expandible con log de eventos |
| `debug/DebugEntry.tsx` | Entrada individual del log |
| `debug/useDebugLog.ts` | Hook que suscribe al DebugStore |

---

## `src/test/` — Pruebas

| Archivo | Propósito |
|---------|-----------|
| `test.ts` | Script ad-hoc que importa `createInitialGameState()` y prueba el estado inicial |

Sin framework de testing. Se ejecuta con `tsx src/test/test.ts`.

---

## Estado de implementación vs diseño

| Funcionalidad | Docs | Código |
|--------------|------|--------|
| Tablero hexagonal (axial) | Radio 6 | Radio 6 |
| Despliegue | 11 unidades c/u | 3 unidades c/u |
| Selección de identidad | ✔ | ✔ (solo flujo, sin efectos) |
| Tirada de dados | ✔ | ✔ (2d6) |
| Movimiento | ✔ | ✔ (adyacente, cuesta movementCost PA) |
| Ataque básico | ✔ | ✔ |
| Contraataque al fallar | ✔ | ✔ |
| Sistema de PA (5 base, carry-over) | ✔ | ✔ |
| Habilidades de unidad | ✔ | ❌ No implementadas |
| Efectos de carta de identidad | ✔ | ❌ Solo estructura de tipos |
| Cartas de efecto (13) | ✔ | ❌ No implementadas |
| Mazo / robo de cartas | ✔ | ❌ No implementado |
| Victoria (eliminar general) | ✔ | ❌ No implementada |
| Persistencia de partidas | ❌ | ❌ En memoria volátil |

---

## Problemas conocidos

- `movementRange.ts` usa `unit.movement` pero el tipo `Unit` tiene `movementCost`. No funciona.
- `HexBoard.tsx` tiene `myPlayerId = 'p1'` hardcodeado. Ignora el `playerId` real del hook.
- El estado se envía completo en cada acción (sin parches ni replay).
- Dificultad del ataque en el reducer usa `target.difficulty` entero, pero los arqueros deberían tener dificultad `6 + distancia`.
