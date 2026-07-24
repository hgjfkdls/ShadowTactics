# Sistema de Reportes

## Propósito
Computa estadísticas de una partida finalizada y las envía al portal web (API externa) para persistencia y visualización en rankings, historial de partidas, y estadísticas de jugador.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `src/server/report.ts` | computeReport() y submitReport() (288 líneas) |

## Responsabilidades

### computeReport()
Construye el payload del reporte:
- **Guardas**: retorna null si faltan userIds o no hay ganador
- **Identificación del ganador**: mapea playerId → userId
- **Estadísticas por clase** (por jugador):
  - Count, survived, attacks (made/hit/missed), critical hits, counter-attacks
  - Damage dealt/received, kills, kills by counter, times killed
- **Estadísticas por identidad** (por jugador):
  - Kills, damage dealt/received
  - Ability uses, cards played (actualmente hardcodeados a 0)
- **Datos de despliegue**: todas las unidades con posiciones finales
- **Metadatos**: rngSeed, duration, totalTurns

### submitReport()
- POST a `REPORT_API_URL` (default: `http://localhost:3001/api/games/report`)
- Header con API key
- Retorna true/false

## Flujo de Datos
```
GameRoom detecta GAME_OVER
  │
  ▼
onGameOverCallback(gameId, state, actions, userIdMapping, matchType)
  │  (cableado por index.ts)
  ▼
submitReport(gameId, state, actions, userIdMapping, matchType)
  ├── computeReport(...) → payload JSON
  └── fetch(REPORT_API_URL, { method: 'POST', headers, body })
        │
        ▼
  Web API (Next.js) → POST /api/games/report
        │
        ▼
  Prisma → PostgreSQL (Game, GameReplay, GameClassStats, GameIdentityStats)
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `@shared/game/state` (GameState, Unit) | Motor | Tipos para computar estadísticas |
| `GameRoom` (ActionRecord) | Interna | Tipo de registro de acciones |
| Variables de entorno | Config | REPORT_API_URL, REPORT_API_KEY |
| `fetch` | Node.js | HTTP call a web API |

## Acoplamiento
- **Bajo**: función pura con wrapper async
- **Medio** con GameRoom (usa ActionRecord type)
- **Alto** con el formato de la API externa (payload debe coincidir con endpoint del portal web)
- No es importado por GameRoom; se cablea vía callback desde index.ts
