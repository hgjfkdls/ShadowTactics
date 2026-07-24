# Arquitectura del Sistema — Shadow Tactics

## Visión General

Shadow Tactics es un juego de estrategia por turnos en tablero hexagonal (radio 5) con arquitectura **cliente-servidor**. El sistema se divide en tres grandes subsistemas arquitectónicos:

```
┌─────────────────────────────────────────────────────┐
│                    Cliente (React)                   │
│  ┌──────────┬──────────┬──────────┬──────────────┐  │
│  │ Estado   │ Tablero  │ Animación│ Sonido       │  │
│  │ UI       │ Red      │ Assets   │ Temas        │  │
│  └──────────┴──────────┴──────────┴──────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ Socket.IO (JSON)
┌──────────────────────▼──────────────────────────────┐
│                   Servidor (Node.js)                 │
│  ┌──────────┬──────────┬──────────┬──────────────┐  │
│  │Conexiones│ GameRoom │  Timer   │     IA       │  │
│  │ Registry │ Reportes │          │              │  │
│  └──────────┴──────────┴──────────┴──────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ applyAction()
┌──────────────────────▼──────────────────────────────┐
│             Motor Compartido (TypeScript)            │
│  ┌──────────┬──────────┬──────────┬──────────────┐  │
│  │ State    │ Reducer  │ Combate  │ Modificadores│  │
│  │ Fases    │ Cartas   │ Pasivas  │ Efectos      │  │
│  │ Habilida-│ Selección│ Unidades │ Hex          │  │
│  │ des      │          │          │              │  │
│  └──────────┴──────────┴──────────┴──────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Cliente** (Vite + React 18): SPA que renderiza el tablero, maneja interacción del jugador, reproduce animaciones y sonido, y se comunica con el servidor vía Socket.IO.

**Servidor** (Node.js + Socket.IO): Gestiona salas de juego (`GameRoom`), temporizadores, jugadores IA, y reportes post-partida. Actúa como autoridad del estado del juego.

**Motor Compartido** (TypeScript puro): Lógica de juego inmutable y sin efectos secundarios. Corre idéntica en cliente y servidor. Contiene el `reducer`, sistemas de combate, modificadores, fases, cartas, habilidades, etc.

---

## Sistemas Arquitectónicos

### 1. Cliente (React SPA)

- **Propósito**: Interfaz de usuario, renderizado del tablero hexagonal, animaciones, sonido, interacción del jugador.
- **Puerto**: 5173 (dev) / servido por Vite
- **Tecnologías**: React 18, Tailwind CSS 4, Socket.IO Client
- **Patrón**: Context Providers + props descendentes
- **Archivo raíz**: `src/client/main.tsx` → `App.tsx`
- **Documentación detallada**: `docs/rebuild/arquitectura/cliente/`

### 2. Servidor (Node.js)

- **Propósito**: Autoridad del estado del juego, manejo de múltiples salas, temporizadores, jugadores IA, reportes.
- **Puerto**: 3000
- **Tecnologías**: Node.js HTTP, Socket.IO 4, tsx (ejecución TypeScript)
- **Patrón**: Callbacks para desacoplar Socket.IO de GameRoom
- **Archivo raíz**: `src/server/index.ts`
- **Documentación detallada**: `docs/rebuild/arquitectura/servidor/`

### 3. Motor Compartido (TypeScript)

- **Propósito**: Reglas del juego, reducción de estado, sistemas de combate, modificadores, fases, cartas, habilidades, unidades.
- **Tecnologías**: TypeScript puro, sin dependencias
- **Patrón**: Redux-like (acción → reducer → nuevo estado inmutable)
- **Archivo raíz**: `src/shared/game/index.ts`
- **Documentación detallada**: `docs/rebuild/arquitectura/motor-compartido/`

---

## Matriz de Acoplamiento entre Sistemas Arquitectónicos

| Sistema | Depende de | Dependencia | Acoplamiento |
|---|---|---|---|
| **Cliente** | Motor Compartido | Tipos `GameState`, `GameAction`, `HexCoord` y módulos de reglas (ability-config, selection, etc.) | **Alto** — el cliente importa abundantemente del motor compartido para lógica de renderizado, validación y selección |
| **Cliente** | Servidor | Eventos Socket.IO (cadenas de texto: `'STATE'`, `'ACTION'`, `'TIMER'`, etc.) | **Medio** — acoplamiento frágil por strings; no hay un contrato formal compartido de eventos |
| **Servidor** | Motor Compartido | `applyAction`, `createInitialGameState`, tipos, utilidades hex | **Muy Alto** — el servidor llama al reducer en cada acción y conoce la estructura completa del estado |
| **Servidor** | Cliente | No depende directamente; se comunican vía Socket.IO | **Bajo** — desacoplado por red |
| **Motor Compartido** | — | No depende de ningún otro sistema arquitectónico | **Nulo** — cero dependencias externas, solo TypeScript estándar |

### Observaciones de Acoplamiento

- El **Motor Compartido** es el sistema mejor desacoplado: cero dependencias externas, código puro, fácil de testear.
- El **Cliente** y el **Servidor** están fuertemente acoplados al Motor Compartido (por diseño), pero esto es deseable: comparten el mismo código de reglas, garantizando consistencia.
- El mayor riesgo de acoplamiento frágil está en los **nombres de eventos Socket.IO**, que son strings compartidos entre cliente y servidor sin verificación en tiempo de compilación.
- El **Servidor** se desacopla de Socket.IO mediante callbacks (`onStateChanged`, `onTimerTick`, etc.), lo que permite testear GameRoom sin Socket.IO.

---

## Catálogo de Subsistemas (Game-Level)

Estos subsistemas residen dentro del Motor Compartido y se documentan individualmente en `motor-compartido/`:

| Subsistema | Ruta | Descripción |
|---|---|---|
| State + Reducer | `state.ts`, `action-types.ts`, `reducer.ts`, `init.ts` | Estado central, tipos de acción, reducer principal |
| Combate | `combat/` (hit, counter, kill, resolver, ability-effects, compute) | Resolución de ataques, dificultad, daño, contraataques |
| Modificadores | `modifiers/` (engine, types) | Buffs/debuffs temporales con turnos/usuos |
| Selección | `board/selection.ts` | Cálculo de rangos, filtrado de blancos, highlights |
| Fases | `phases/` (identity, roll, deployment, turn, identity-apply) | Manejo de cada fase del juego |
| Cartas | `actions/card.ts`, `data/card-config/` | Mazo, robo, uso, contraataque de cartas |
| Habilidades | `data/ability-config/`, `data/ability-config/handler/` | Configuración y ejecución de habilidades |
| Efectos | `effects/processEffects.ts` | Procesador de efectos config-driven |
| Pasivas | `passive.ts` | Evaluación de habilidades pasivas |
| Unidades | `units/` (factory, stats, queries) | Creación, estadísticas, consultas de unidades |
| Formaciones | `formations.ts` | Detección de formaciones tácticas |
| Aura | `aura.ts` | Aura de mando del general |
| Movimiento | `movement/cost.ts` | Costo de movimiento |
| Hex | `shared/hex/` (coord, directions, distance, map, range, neighbors) | Sistema de coordenadas hexagonales |
| Datos | `data/abilities.ts`, `identities.ts`, `modifier-config.ts` | Definiciones estáticas de habilidades, identidades y modificadores |
| i18n | `shared/i18n/` (es, en) | Internacionalización |

---

## Flujo de Datos General

```
Jugador hace clic
       │
       ▼
Cliente: useHexClick → valida → sendAction(GameAction)
       │
       ▼ (Socket.IO: 'ACTION')
Servidor: index.ts → GameRoom.handleAction()
       │
       ├── applyAction(state, action) → nuevo GameState
       ├── onStateChanged(state) → emite 'STATE' a todos los clientes
       ├── refreshTimer() → actualiza temporizador
       └── Si es turno de IA: scheduleBot() → AIPlayer.decideAI()
       │
       ▼ (Socket.IO: 'STATE')
Cliente: useGameState → recibe nuevo estado → setState
       │
       ├── Board re-renderiza (nuevas posiciones, HP, etc.)
       ├── Animaciones encoladas (useGameEvents)
       ├── Sonidos reproducidos (useGameSounds)
       └── Paneles/UI actualizados
```

---

## Resumen de Acoplamiento

| Área | Nivel | Detalle |
|---|---|---|
| **Alto acoplamiento** (deseable) | Cliente ↔ Motor | El cliente necesita las reglas del motor para renderizado y validación |
| **Alto acoplamiento** (deseable) | Servidor ↔ Motor | El servidor necesita el reducer para procesar acciones |
| **Alto acoplamiento** (riesgo) | Hubs del motor: `state.ts`, `modifiers/engine.ts`, `passive.ts` y `data/ability-config/` son referenciados por casi todos los demás subsistemas |
| **Ciclo** (tipo-only) | `passive.ts` ↔ `combat/ability-effects.ts` | Importación mutua de tipos (segura pero frágil) |
| **Bajo acoplamiento** | Servidor ↔ Socket.IO | GameRoom no importa Socket.IO; se comunica vía callbacks |
| **Bajo acoplamiento** | Animación, Sonido, Temas | Sistemas del cliente con interfaces intercambiables (Renderer pattern) |
| **Bajo acoplamiento** | Movement, Timer, Modifier-config | Subsistemas del motor con dependencias mínimas o nulas |
