[docs](../docs.md) > [arquitectura](./index.md) > servidor

# 3. Estructura del repositorio (servidor de juego)

## Árbol de directorios

```
shadow-tactics/
├── src/
│   ├── server/                    # ★ Servidor de juego (Socket.IO)
│   │   ├── index.ts               # Entry point: HTTP server, Socket.IO, CORS, auth, eventos
│   │   ├── GameRoom.ts            # Sala de partida: acciones, snapshots, desconexión
│   │   ├── rooms.ts               # Registry in-memory de GameRoom (Map<gameId, GameRoom>)
│   │   ├── report.ts              # Reporte post-partida: estadísticas y envío HTTP
│   │   └── types.ts               # Tipos legacy (obsoleto, duplicado en GameRoom)
│   │
│   ├── shared/                    # ★ Lógica compartida (cliente + servidor)
│   │   ├── index.ts               # Barrel: re-exporta hex + game
│   │   │
│   │   ├── hex/                   # Sistema de coordenadas hexagonales axiales
│   │   │   ├── index.ts           # Barrel
│   │   │   ├── coord.ts           # HexCoord { q, r }
│   │   │   ├── distance.ts        # hexDistance(a, b)
│   │   │   ├── directions.ts      # 6 direcciones axiales
│   │   │   ├── neighbors.ts       # hexNeighbors(coord)
│   │   │   ├── range.ts           # hexRange(center, radius)
│   │   │   └── map.ts             # HexMap, isInsideMap, generateHexMap
│   │   │
│   │   ├── game/                  # ★ Lógica del juego (core)
│   │   │   ├── index.ts           # Barrel
│   │   │   ├── state.ts           # GameState: modelo de datos completo
│   │   │   ├── action-types.ts    # GameAction: unión discriminada (18 tipos)
│   │   │   ├── init.ts            # createInitialGameState()
│   │   │   ├── reducer.ts         # applyAction(): dispatcher central
│   │   │   ├── formations.ts      # Formaciones tácticas (Corazón de Estratega)
│   │   │   ├── utils.ts           # Barrel de utilidades
│   │   │   │
│   │   │   ├── actions/           # Handlers de cada tipo de acción
│   │   │   │   ├── index.ts       # Barrel
│   │   │   │   ├── move.ts        # MOVE_UNIT
│   │   │   │   ├── attack.ts      # ATTACK_UNIT
│   │   │   │   ├── card.ts        # USE_CARD, DISCARD_CARD, PASS_COUNTER + mazos
│   │   │   │   ├── ability.ts     # USE_ABILITY (18 habilidades activas)
│   │   │   │   ├── identity.ts    # IDENTITY_ABILITY (Robin Hood)
│   │   │   │   └── helpers.ts     # consumeAP, updateUnit, etc.
│   │   │   │
│   │   │   ├── phases/            # Gestión de fases del juego
│   │   │   │   ├── index.ts       # Barrel
│   │   │   │   ├── identity.ts    # Selección de identidad
│   │   │   │   ├── roll.ts        # Tirada de dados 2d6
│   │   │   │   ├── deployment.ts  # Despliegue de 12 pasos
│   │   │   │   ├── turn.ts        # Fin e inicio de turno
│   │   │   │   ├── simulate.ts    # Auto-completar preparación (testing)
│   │   │   │   └── identity-apply.ts  # Aplicar efectos de identidad
│   │   │   │
│   │   │   ├── combat/            # Sistema de combate
│   │   │   │   ├── index.ts       # Barrel
│   │   │   │   ├── resolver.ts    # Resolución de ataque (dados, daño)
│   │   │   │   ├── hit.ts         # Fórmulas de dificultad y crítico
│   │   │   │   ├── kill.ts        # Gestión de daño y muerte
│   │   │   │   ├── counter.ts     # Contraataque
│   │   │   │   └── ability-effects.ts  # Efectos pasivos en combate
│   │   │   │
│   │   │   ├── modifiers/         # Sistema de modificadores (buff/debuff)
│   │   │   │   ├── index.ts       # Barrel
│   │   │   │   ├── types.ts       # ModifierInstance
│   │   │   │   └── engine.ts      # addModifier, processModifiersAtTurnStart
│   │   │   │
│   │   │   ├── units/             # Sistema de unidades
│   │   │   │   ├── index.ts       # Barrel
│   │   │   │   ├── stats.ts       # BASE_STATS por clase
│   │   │   │   ├── queries.ts     # countPlayerClasses, isNearAnyAlliedUnit
│   │   │   │   └── factory.ts     # createUnit()
│   │   │   │
│   │   │   ├── movement/          # Sistema de movimiento
│   │   │   │   ├── index.ts       # Barrel
│   │   │   │   └── cost.ts        # getMovementCost
│   │   │   │
│   │   │   ├── board/             # Sistema de tablero
│   │   │   │   └── collision.ts   # isHexOccupied, isWithinBounds
│   │   │   │
│   │   │   └── data/              # Datos del juego (definiciones)
│   │   │       ├── abilities.ts   # ABILITIES + CLASS_ABILITIES
│   │   │       └── identities.ts  # IDENTITY_EFFECTS
│   │   │
│   │   ├── i18n/                  # Internacionalización
│   │   │   └── index.ts
│   │   │
│   │   └── test/                  # Tests
│   │       ├── game-actions.test.ts
│   │       ├── game-cards.test.ts
│   │       └── game-preparation.test.ts
│   │
│   └── client/                    # Cliente de juego (Vite + React)
│       ├── main.tsx
│       ├── App.tsx
│       ├── net/
│       │   └── socket.ts          # Conexión Socket.IO del cliente
│       ├── game/                  # Componentes del juego
│       └── prep/                  # Componentes de preparación
│
├── web/                           # Web oficial (Next.js + Prisma)
│   ├── app/
│   │   ├── api/
│   │   │   └── games/
│   │   │       ├── report/route.ts    # POST — recibe reportes post-partida
│   │   │       └── replay/route.ts    # GET — sirve datos de replay
│   │   └── partida/
│   │       └── [gameId]/
│   │           └── ActionLog.tsx      # Visualización de acciones
│   └── prisma/
│       └── schema.prisma              # Modelos de BD
│
├── docs/
│   └── arquitectura/
│       └── servidor/                  # ★ Este documento
│
├── .env                              # Variables de entorno del servidor de juego
├── package.json                      # Dependencias y scripts
├── tsconfig.json                     # Configuración de TypeScript
└── vite.config.ts                    # Configuración de Vite (cliente)
```

## Propósito de cada directorio principal

| Directorio | Propósito |
|-----------|-----------|
| `src/server/` | Servidor de juego Node.js con Socket.IO. Maneja conexiones, salas, acciones y reportes |
| `src/shared/game/` | Lógica de juego pura (sin IO). Compartida entre servidor y cliente para determinismo |
| `src/shared/hex/` | Sistema de coordenadas hexagonales axiales. Operaciones geométricas del tablero |
| `src/shared/i18n/` | Textos internacionalizados del juego |
| `src/shared/test/` | Tests de la lógica de juego (preparación, acciones, cartas) |
| `src/client/` | Cliente de juego Vite + React. Interfaz visual del juego |
| `web/` | Web oficial Next.js. Autenticación, matchmaking, perfiles, reportes, replays |
| `docs/` | Documentación del proyecto |
