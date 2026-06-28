[docs](../docs.md) > [web](./docs.md) > fase3

# Fase 3 — Rankings, historial, estadísticas y reporte post-partida

**Estado:** ✅ Completada
**Prioridad:** Alta

## Objetivo

Implementar el sistema competitivo completo:
1. Endpoint de reporte post-partida (ELO + persistencia de datos de la partida).
2. Replays completos de las últimas 20 partidas por jugador (almacenados en DB).
3. Estadísticas por clase de unidad y por identidad por partida.
4. Historial de partidas en el perfil.
5. Tabla de clasificación global.

## Dependencias

- Fase 2 (usuarios en DB) ✅ Completada
- Fase 4 (matchmaking, gameId) ✅ Completada
- Coordinación con servidor de juego (`src/server/`) para que compute estadísticas y envíe el reporte

```
Servidor juego ──HTTP──> POST /api/games/report
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
                ELO + DB   Replay +   Stats por
                Game       actions[]  clase +
                                      identidad
                              │
                    ┌─────────┤
                    ▼         ▼
              /rankings   /perfil
                          (historial +
                           estadísticas)
```

---

## 3.1 Reporte post-partida (`POST /api/games/report`)

Endpoint que el servidor de juego (Socket.IO, puerto 3000) llama al finalizar una partida.
El servidor de juego ya tiene en memoria el `GameState` completo, `actions[]` y `attackResults[]`.
Debe computar las estadísticas agregadas y enviarlas junto con los datos de replay.

### Especificación

**URL:** `POST /api/games/report`
**Autenticación:** API key compartida (header `X-Api-Key`), no sesión de usuario.
**Content-Type:** `application/json`

**Request:**
```json
{
    "gameId": "a1b2c3d4",
    "winnerId": "uuid-del-ganador",
    "type": "quickplay" | "ranked",

    "rngSeed": 12345,
    "actions": [ { "index": 0, "playerId": "uuid", "action": { "type": "MOVE_UNIT", ... } }, ... ],
    "duration": 480,
    "totalTurns": 24,

    "deployment": {
        "uuid-jugador1": [
            { "unitId": "u1", "class": "infantry", "q": -1, "r": 1, "step": 0 },
            { "unitId": "u2", "class": "archer",   "q": 2,  "r": -1, "step": 1 }
        ],
        "uuid-jugador2": [ ... ]
    },

    "classStats": {
        "uuid-jugador1": [
            {
                "unitClass": "archer",
                "count": 3, "survived": true,
                "attacksMade": 8, "attacksHit": 6, "attacksMissed": 2,
                "criticalHits": 1, "counterAttacks": 2,
                "damageDealt": 18, "damageReceived": 6,
                "damageMitigated": 2, "counterDamage": 4,
                "kills": 2, "killsByCounter": 1, "timesKilled": 1,
                "totalMoves": 5, "totalHexesMoved": 7,
                "actionLog": [
                    { "source": "ability", "id": "patada_acrobatica", "uses": 1, "kills": 0, "damage": 1, "targetClass": "infantry" },
                    { "source": "card", "id": "precision", "uses": 2, "kills": 1, "damage": 3, "targetClass": "lancer" }
                ]
            }
        ],
        "uuid-jugador2": [ ... ]
    },

    "identityStats": {
        "uuid-jugador1": {
            "identityId": "robin_hood",
            "kills": 3, "damageDealt": 22, "damageReceived": 8,
            "abilityUses": 4, "cardsPlayed": 3
        },
        "uuid-jugador2": {
            "identityId": "espartano",
            ...
        }
    }
}
```

**Response (200):**
```json
{
    "status": "ok",
    "eloChanges": {
        "ganador": { "old": 1000, "new": 1016 },
        "perdedor": { "old": 1000, "new": 984 }
    }
}
```

**Response (400/401/404):**
```json
{ "error": "mensaje de error" }
```

### Validaciones

- `gameId` debe existir en `activeMatches` (o en DB si ya se migró a persistencia).
- `winnerId` debe ser uno de los dos `userIds` del match.
- `type` debe ser `quickplay` o `ranked`.
- Si `type = quickplay`: registrar partida pero **no** modificar ELO.
- Si `type = ranked`: registrar partida **y** actualizar ELO.
- Rechazar si el gameId ya fue reportado (idempotencia).
- `actions` debe ser un array no vacío con índices secuenciales.
- Cada entrada en `classStats` debe tener un `unitClass` válido.

### Modelo ELO

Fórmula estándar con K=32:

```
Esperado  = 1 / (1 + 10^((ELO_oponente - ELO_jugador) / 400))
Nuevo ELO = ELO_actual + K × (resultado - esperado)
resultado = 1 si ganó, 0 si perdió
```

Ambos jugadores se actualizan en la misma transacción.

### Almacenamiento en DB

Esquema completo de modelos nuevos y modificados en Prisma:

```prisma
// === MODELO GAME (extendido) ===

model Game {
    id         String   @id
    player1Id  String
    player2Id  String
    winnerId   String?
    rngSeed    Int
    type       String   @default("quickplay")   // quickplay | ranked
    duration   Int?                              // segundos totales
    totalTurns Int?                              // número de turnos
    createdAt  DateTime @default(now())

    player1      User              @relation("Player1", fields: [player1Id], references: [id])
    player2      User              @relation("Player2", fields: [player2Id], references: [id])
    winner       User?             @relation("Winner", fields: [winnerId], references: [id])
    replay       GameReplay?
    classStats   GameClassStats[]
    identityStats GameIdentityStats[]
}

// === NUEVOS MODELOS ===

model GameReplay {
    gameId    String   @id
    rngSeed   Int
    actions   Json               // GameAction[] — lista completa y ordenada
    createdAt DateTime @default(now())
    game      Game     @relation(fields: [gameId], references: [id])
}

model GameClassStats {
    id          String  @id @default(uuid())
    gameId      String
    playerId    String
    unitClass   String     // archer | infantry | cavalry | lancer | general

    count       Int
    survived    Boolean

    attacksMade     Int
    attacksHit      Int
    attacksMissed   Int
    criticalHits    Int
    counterAttacks  Int

    damageDealt     Int
    damageReceived  Int
    damageMitigated Int
    counterDamage   Int

    kills           Int
    killsByCounter  Int
    timesKilled     Int

    totalMoves      Int
    totalHexesMoved Int

    actionLog       Json?    // [{ source: "ability"|"card", id, uses, kills, damage, targetClass }]
    deployment      Json?    // [{ unitId, class, q, r, step }]

    game   Game @relation(fields: [gameId], references: [id])
    player User @relation(fields: [playerId], references: [id])

    @@unique([gameId, playerId, unitClass])
}

model GameIdentityStats {
    id          String  @id @default(uuid())
    gameId      String
    playerId    String
    identityId  String     // robin_hood | francotirador | dios_trueno | capitan_guardia | ...
    won         Boolean

    kills          Int
    damageDealt    Int
    damageReceived Int
    abilityUses    Int
    cardsPlayed    Int

    game   Game @relation(fields: [gameId], references: [id])
    player User @relation(fields: [playerId], references: [id])

    @@unique([gameId, playerId, identityId])
}
```

### Replays en DB vs archivos

Los replays (`rngSeed` + `actions[]`) se almacenan en una columna `Json` de PostgreSQL.
Cada partida genera ~50-200 acciones (~5-20 KB). 20 partidas × 20 KB = ~400 KB por usuario.
No se eliminan las estadísticas, pero los replays completos solo se conservan de las
**últimas 20 partidas por jugador** (el resto se pueden purgar).

### Formato de `actionLog`

Un solo array JSON que unifica uso de habilidades y cartas, con campo `source` para distinguir:

```json
[
    { "source": "ability", "id": "carga", "uses": 3, "kills": 1, "damage": 6, "targetClass": "archer" },
    { "source": "card", "id": "flechas_de_fuego", "uses": 2, "kills": 0, "damage": 4, "targetClass": "infantry" }
]
```

### Formato de `deployment`

Posición inicial de cada unidad al terminar el despliegue, por jugador:

```json
[
    { "unitId": "u1", "class": "infantry", "q": -1, "r": 1, "step": 0 },
    { "unitId": "u2", "class": "archer",   "q": 2,  "r": -1, "step": 1 },
    { "unitId": "u3", "class": "general",  "q": 0,  "r": 0,  "step": 11 }
]
```

### Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `app/api/games/report/route.ts` | POST — recibe datos post-partida, valida contra activeMatches, computa ELO, persiste todo en transacción |
| `app/api/games/route.ts` | GET — historial paginado de partidas por usuario autenticado |
| `app/api/games/replay/route.ts` | GET — sirve rngSeed + actions[] + datos de jugadores para reproducción |
| `app/api/rankings/route.ts` | GET — clasificación global ordenada por ELO DESC |
| `app/rankings/page.tsx` | Página pública de rankings con skeleton loader, paginación, resaltado de usuario actual |
| `app/rankings/RankingsTable.tsx` | Componente cliente con tabla, paginación y skeleton |
| `app/perfil/GameHistory.tsx` | Componente cliente con historial, paginación y botón "Ver replay" |
| `src/server/report.ts` | Computa classStats/identityStats/deployment desde GameState y envía HTTP POST al endpoint |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Modelos `GameReplay`, `GameClassStats`, `GameIdentityStats` + campos `rngSeed`, `type`, `duration`, `totalTurns` en `Game` + migración |
| `lib/matchmaking.ts` | `isRanked` en `ActiveMatch`, export del tipo y del array `activeMatches` |
| `app/perfil/page.tsx` | Añadida sección `<GameHistory>` debajo de estadísticas |
| `src/server/GameRoom.ts` | `userId` en `PlayerSlot`, `getUserIdMapping()`, `onGameOverCallback` |
| `src/server/index.ts` | Pasar `userId` en `JOIN_GAME`, asignar `onGameOverCallback` + `onDisconnectCallback` para reporte |

---

## 3.2 Tabla de clasificación (`/rankings`)

Página pública que muestra el ranking global de jugadores.

### Especificación

**URL:** `/rankings`
**API:** `GET /api/rankings?page=1&limit=20`

**Response:**
```json
{
    "players": [
        {
            "position": 1,
            "username": "CazadorRojo",
            "elo": 1420,
            "wins": 42,
            "losses": 18,
            "winrate": 70,
            "total": 60
        }
    ],
    "total": 150,
    "page": 1,
    "totalPages": 8
}
```

### Columnas de la tabla

| Columna | Descripción |
|---------|-------------|
| # | Posición en el ranking |
| Jugador | Nombre de usuario |
| ELO | Puntuación competitiva (descendente) |
| Victorias | Partidas ganadas |
| Derrotas | Partidas perdidas |
| Winrate | % de victorias |
| Partidas | Total de partidas jugadas |

### UI

- Tabla responsive con diseño oscuro consistente con el tema actual.
- Resaltar al usuario autenticado con color brand.
- Paginación con flechas `<` `>` y números de página.
- Mostrar skeleton loader mientras carga.
- Si no hay datos, mostrar mensaje "Aún no hay partidas registradas".

### Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `app/rankings/page.tsx` | Página de rankings (server component con fetch) |
| `app/api/rankings/route.ts` | API con paginación, ordenado por ELO DESC |

---

## 3.3 Historial de partidas del usuario

Sección en `/perfil` que lista las partidas recientes del usuario autenticado.

### Especificación

**API:** `GET /api/games?userId=xxx&page=1&limit=10`

**Response:**
```json
{
    "games": [
        {
            "id": "a1b2c3d4",
            "opponent": "JugadorX",
            "result": "victoria" | "derrota",
            "eloChange": "+16",
            "type": "ranked",
            "date": "2026-06-25T12:00:00Z",
            "duration": 480,
            "totalTurns": 24,
            "hasReplay": true
        }
    ],
    "total": 25,
    "page": 1,
    "totalPages": 3
}
```

### Columnas

| Columna | Descripción |
|---------|-------------|
| Oponente | Nombre del rival |
| Resultado | Victoria (🟢) o Derrota (🔴) |
| Cambio ELO | ±puntos (solo ranked, gris si quickplay) |
| Modo | Ranked / Partida rápida |
| Duración | Tiempo total de la partida |
| Turnos | Número de turnos jugados |
| Replay | Icono si tiene replay disponible (clic para ver) |
| Fecha | Fecha formateada (ej. "25 jun 2026") |

### Replay

Al hacer clic en una partida con `hasReplay: true`, se puede cargar el replay:

**API:** `GET /api/games/replay?gameId=xxx`

**Response:**
```json
{
    "rngSeed": 12345,
    "actions": [ ... ],
    "players": {
        "uuid1": { "username": "Jugador1", "identityId": "robin_hood" },
        "uuid2": { "username": "Jugador2", "identityId": "espartano" }
    }
}
```

El cliente de juego puede cargar estos datos para reproducir la partida paso a paso.

### UI

- Tabla debajo de las estadísticas del perfil.
- Botón "Ver replay" en cada fila que tenga `hasReplay: true`.
- Paginación si hay más de 10 partidas.
- Si no hay partidas, ocultar sección (ya existe el mensaje actual).

### Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `app/api/games/route.ts` | API con filtro por userId, paginación, ordenado por fecha DESC |
| `app/api/games/replay/route.ts` | GET — retorna rngSeed + actions para un gameId |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/perfil/page.tsx` | Añadir sección de historial después de las estadísticas |

---

## 3.4 Estadísticas detalladas por partida (futuro)

Una vez almacenados los datos de `GameClassStats` y `GameIdentityStats`, se pueden construir vistas detalladas:

- **Por clase**: en `/perfil`, pestaña "Estadísticas" que agregue datos de todas las partidas del jugador agrupados por clase (daño total por clase, kills totales, etc.).
- **Por identidad**: winrate por identidad, identidad más usada, etc.
- **Análisis de despliegue**: mapa de calor de posiciones iniciales según resultado.

Esto alimentará directamente el [sistema de logros y recompensas](./plan.md#fase-5--tienda-de-cosméticos) (ej: "Inflige 100 de daño con lanceros en una partida").

---

## Mejora previa necesaria: `isRanked` en `ActiveMatch`

Antes de implementar el reporte, se debe añadir el campo `isRanked` a `ActiveMatch` en `lib/matchmaking.ts`.

### Cambio

```typescript
type ActiveMatch = {
    gameId: string;
    userIds: string[];
    type: QueueType;         // 'quickplay' | 'ranked'
    isRanked: boolean;       // true si type === 'ranked'
    matchedAt: number;
};
```

Esto permite al endpoint de reporte validar que el tipo de partida coincida y saber si debe calcular ELO.

---

## Orden de implementación

```
1. Añadir isRanked a ActiveMatch               (pre-requisito)
2. Actualizar schema.prisma con nuevos modelos  (GameReplay, GameClassStats, GameIdentityStats)
3. POST /api/games/report                       (endpoint principal — acepta todo el payload)
4. GET /api/games                               (historial con hasReplay)
5. GET /api/games/replay                        (servir replay)
6. GET /api/rankings                            (clasificación)
7. Frontend /rankings                           (página pública)
8. Frontend historial en /perfil                (sección en perfil)
```

---

## Próximos pasos tras Fase 3

- Sistema de rachas (win streak bonus).
- Estadísticas agregadas globales (clases más usadas, identidades más ganadoras).
- Página de estadísticas detalladas por jugador.
- Integración de datos de clase/identidad con logros y recompensas (Fase 5).
