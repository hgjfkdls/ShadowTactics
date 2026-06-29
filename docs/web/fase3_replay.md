[docs](../docs.md) > [web](./docs.md) > fase3_replay

# Fase 3-A — Página de detalle de partida

**Estado:** ⏳ Pendiente
**Prioridad:** Alta

## Objetivo

Crear una página de revisión de partida en `/partida/[gameId]` que muestre TODA la información de una partida: resultado, ELO, desempeño de ambos jugadores, estadísticas por clase e identidad, y un registro textual de acciones.

---

## Arquitectura

```
GameHistory ("Ver replay")
         │
         ▼
/partida/[gameId]                ← Next.js page (server component)
         │
         ▼
GET /api/games/[id]              ← API endpoint
         │
         ▼
Prisma: Game + User + GameClassStats + GameIdentityStats + GamePlayerPerformance
```

---

## Orden de implementación

```
1. GET /api/games/[id]         → API de detalle completo
2. /partida/[gameId]/page.tsx  → Server component que renderiza la página
3. GameDetailClient.tsx        → Client component con pestañas/secciones
4. ClassStatsSection.tsx       → Tabla de stats por clase
5. IdentityStatsSection.tsx    → Tabla de stats por identidad
6. ActionLog.tsx               → Registro textual de acciones
7. Wire up GameHistory.tsx     → Botón "Ver replay" navega a /partida/[id]
```

---

## Especificaciones

### 1. Endpoint `GET /api/games/[id]`

**URL:** `GET /api/games/[id]`
**Autenticación:** Sesión requerida, solo los dos participantes pueden acceder.

**Response (200):**
```json
{
  "id": "a1b2c3d4",
  "player1": { "id": "uuid1", "username": "Jugador1", "elo": 1000 },
  "player2": { "id": "uuid2", "username": "Jugador2", "elo": 1000 },
  "winnerId": "uuid1",
  "winner": "Jugador1",
  "result": "victoria" | "derrota" | null,
  "type": "ranked" | "quickplay",
  "duration": 480,
  "totalTurns": 24,
  "createdAt": "2026-06-25T12:00:00Z",
  "hasReplay": true,
  "eloChanges": {
    "uuid1": { "old": 1000, "new": 1016, "diff": 16 },
    "uuid2": { "old": 1000, "new": 984, "diff": -16 }
  },
  "performances": [ ... ],       // GamePlayerPerformance[]
  "classStats": [ ... ],         // GameClassStats[]
  "identityStats": [ ... ]       // GameIdentityStats[]
}
```

### 2. Página `/partida/[gameId]`

Layout:
- **Cabecera:** VS con nombres, resultado, modo, duración, turnos, fecha, cambio ELO
- **Desempeño:** Score badge + breakdown detallado para ambos jugadores
- **Stats por clase:** Tabla por jugador y clase (kills, daño, precisión, movimientos, etc.)
- **Stats por identidad:** Tabla por jugador e identidad (kills, daño, habilidad, cartas)
- **Registro de acciones:** Lista textual cronológica
- **Botón "Ver replay visual":** Solo si `hasReplay`, redirige al cliente de juego

### 3. ActionLog

Decodificar cada `GameAction` del array de replay a texto legible:

| Tipo de acción | Output |
|---------------|--------|
| `SELECT_IDENTITY` | "Jugador seleccionó [Identidad]" |
| `ROLL_DICE` | "🎲 Jugador sacó X" |
| `DEPLOY_UNIT` | "Jugador desplegó [Clase] en (q, r)" |
| `MOVE_UNIT` | "Jugador movió [Clase] a (q, r)" |
| `ATTACK_UNIT` | "⚔ [Clase] atacó a [Clase] — X de daño" |
| `USE_ABILITY` | "⚡ Jugador usó [Habilidad]" |
| `USE_CARD` | "🃏 Jugador jugó [Carta]" |
| `END_TURN` | "➡ Turno X — Jugador" |
| `SURRENDER` | "🏳 Jugador se rindió" |

Se usa un mapper que recibe el `GameAction` y retorna `{ text: string, icon?: string }`.

### 4. Wire up

En `GameHistory.tsx`, el botón "Ver replay" cambia de `<button>` sin onClick a `<Link href="/partida/${g.id}">` de Next.js.

---

## Archivos

### Crear

| Archivo | Descripción |
|---------|-------------|
| `web/app/api/games/[id]/route.ts` | GET — detalle completo de partida |
| `web/app/partida/[gameId]/page.tsx` | Página server component |
| `web/app/partida/GameDetailClient.tsx` | Componente cliente con pestañas |
| `web/app/partida/ClassStatsSection.tsx` | Stats por clase |
| `web/app/partida/IdentityStatsSection.tsx` | Stats por identidad |
| `web/app/partida/ActionLog.tsx` | Registro textual de acciones |

### Modificar

| Archivo | Cambio |
|---------|--------|
| `web/app/perfil/GameHistory.tsx` | Botón "Ver replay" → Link a `/partida/[id]` |
