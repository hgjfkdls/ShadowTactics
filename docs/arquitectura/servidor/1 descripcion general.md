[docs](../docs.md) > [arquitectura](./index.md) > servidor

# 1. Descripción general del servidor de juego

## Propósito

El servidor de juego es el componente central encargado de:

1. **Gestionar partidas en tiempo real** — Crea salas (`GameRoom`) para cada partida, maneja la conexión de dos jugadores y espectadores vía Socket.IO
2. **Procesar acciones de juego** — Recibe acciones de los clientes, las valida, las aplica al estado del juego mediante un reducer puro y transmite el nuevo estado a todos los participantes
3. **Mantener el estado de la partida** — Cada sala mantiene en memoria el estado completo (`GameState`), historial de acciones, snapshots periódicos y lógica de desconexión/reconexión
4. **Generar reportes post-partida** — Al finalizar la partida, computa estadísticas detalladas (por clase, por identidad, rendimiento) y las envía a la web oficial para persistencia
5. **Soportar matchmaking** — Expone un endpoint interno (`/__emit`) para que la web oficial notifique a los jugadores cuando se encuentra una partida

## Alcance

### Incluye

| Componente | Descripción |
|------------|-------------|
| **Conexión en tiempo real** | Servidor Socket.IO para comunicación bidireccional con clientes de juego y web |
| **Salas de partida** | Gestión de 2 jugadores + espectadores por partida con estado en memoria |
| **Procesamiento de acciones** | 18 tipos de acciones de juego validadas y aplicadas mediante reducer puro |
| **Sistema de combate** | Resolución de ataques con dados, dificultad, daño, contraataques y efectos pasivos |
| **Sistema de modificadores** | Buffs/debuffs con duración en turnos, aplicables a unidades o globales |
| **Sistema de cartas** | Mazo de efecto (52 cartas, 13 tipos), contrajuego (Panacea, Ladrón, Espejo), descarte |
| **Gestión de turnos** | Ciclo DRAW → MAIN → COUNTER, arrastre de PA, efectos de inicio/fin de turno |
| **Fase de preparación** | Selección de identidad (3 cartas), tirada de dados (2d6), despliegue (12 pasos) |
| **15 identidades** | Cada una con habilidades únicas que modifican al general y sus unidades |
| **Sistema de formaciones** | Detección de formaciones tácticas (Línea, Triángulo) para Corazón de Estratega |
| **Desconexión y reconexión** | Timeout de 60s con auto-rendición y restauración de estado al reconectar |
| **Reporte post-partida** | Cómputo de estadísticas (clase, identidad, rendimiento) y envío HTTP a web oficial |
| **Replay** | Registro secuencial de todas las acciones con fase, turno y timestamp |
| **Integración con matchmaking** | Endpoint `/__emit` para notificaciones en tiempo real desde la web oficial |
| **Snapshot de estado** | Capturas periódicas del GameState para reconstrucción eficiente |

### No incluye

| Componente | Motivo | Dónde se implementa |
|------------|--------|-------------------|
| **Persistencia en base de datos** | El servidor de juego no tiene acceso directo a BD | Web oficial (Next.js + Prisma + PostgreSQL) |
| **Autenticación de usuarios** | Login, registro, gestión de sesiones | Web oficial (NextAuth.js) |
| **Matchmaking** | Colas de emparejamiento, invitaciones, rankings | Web oficial (API routes + PostgreSQL) |
| **Sistema de amigos** | Solicitudes, lista de amigos, estado online | Web oficial (Fase 6 — pendiente) |
| **Tienda de cosméticos** | Moneda virtual, compras, inventario | Web oficial (Fase 5 — pendiente) |
| **Interfaz visual de usuario** | Renderizado del tablero, unidades, HUD | Cliente de juego (Vite + React) |
| **Página web estática** | Landing, cómo jugar, registro | Web oficial (Next.js pages) |
| **Servidor de archivos en producción** | Servir assets estáticos del cliente compilado | El servidor incluye soporte básico, pero el build es responsabilidad de Vite |
| **Logs y monitoreo** | No hay sistema de logging estructurado ni alertas | Pendiente de implementar |

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Lenguaje | TypeScript 5.4+ |
| Runtime | Node.js (ejecutado con `tsx`) |
| Tiempo real | Socket.IO 4.8 |
| Autenticación WebSocket | JWT (jsonwebtoken) |
| Servidor HTTP | Módulo nativo `http` de Node.js |
| Persistencia | PostgreSQL vía web API externa (HTTP) |
| Desarrollo | Nodemon + tsx (hot reload) |

## Arquitectura general

```
┌──────────┐   Socket.IO   ┌──────────────────┐   HTTP POST   ┌──────────────┐
│ Clientes │◄─────────────►│ Servidor Juego   │──────────────►│ Web Oficial  │
│ (Vite)   │               │ (puerto 3000)    │               │ (Next.js)    │
│ (Web)    │               │                  │               │ (puerto 3001)│
└──────────┘               │  GameRoom[]      │               │              │
                           │  Rooms registry  │               │  PostgreSQL  │
                           │  Report engine   │               │              │
                           └──────────────────┘               └──────────────┘
```

## Principales responsabilidades

| Responsabilidad | Archivo | Descripción |
|----------------|---------|-------------|
| Servidor HTTP + WS | `index.ts` | Inicializa el servidor, CORS, autenticación, handlers de eventos |
| Salas de partida | `GameRoom.ts` | Estado de la partida, acciones, snapshots, desconexión |
| Registry de salas | `rooms.ts` | Creación y limpieza de GameRoom instances |
| Reporte post-partida | `report.ts` | Cómputo de estadísticas y envío a web API |
| Reducer de acciones | `src/shared/game/reducer.ts` | Procesamiento de cada tipo de acción |
| Handlers de acción | `src/shared/game/actions/*.ts` | Lógica específica de cada tipo de acción |
| Handlers de fase | `src/shared/game/phases/*.ts` | Gestión de preparación, despliegue, turnos |

## Puerto y modo de ejecución

- **Puerto por defecto**: `3000`
- **Modo local**: servidor escucha en `localhost:3000`, cliente en `localhost:5173`
- **Modo online**: servidor escucha en `0.0.0.0:3000`, cliente/servidor en URLs configurables

## Ciclo de vida de una partida

```
1. Matchmaking (web) ──▶ Jugadores reciben gameId
2. JOIN_GAME ──▶ Ambos jugadores se conectan a la sala
3. BOTH_PLAYERS_READY ──▶ Partida comienza
4. Preparación ──▶ Identidad → Dados → Despliegue
5. Juego ──▶ Turnos alternados hasta game over
6. Reporte ──▶ Estadísticas enviadas a web API
7. Limpieza ──▶ Sala eliminada de memoria
```
