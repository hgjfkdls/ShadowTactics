[docs](../../docs.md) > [arquitectura](../index.md) > [servidor](./index.md) > analisis

# Análisis del servidor de juego

## 🔴 Bugs identificados

### B1. `lastAttackResult` fuera del tipo `GameState`

**Archivos**: `src/shared/game/reducer.ts:41-50`, `src/shared/game/actions/ability.ts:736-871`, `src/shared/game/actions/attack.ts:159`, `src/shared/game/combat/resolver.ts:107`, `src/shared/game/combat/kill.ts:27`

`lastAttackResult` se usa como propiedad del estado en múltiples lugares pero **no está definida en el tipo `GameState`** en `state.ts`. El reducer la crea en el objeto retornado y luego la consume en el siguiente paso, pero TypeScript no lo reconoce:

```typescript
// reducer.ts:44
const hadAttack = !!result.lastAttackResult; // ❌ lastAttackResult no existe en GameState
```

Esto causa ~20 errores de TypeScript en compilación estricta y es frágil — cualquier refactor que modifique el estado podría perder esta propiedad silenciosamente.

**Impacto**: Alto. Errores de tipo que ocultan bugs potenciales. El código funciona porque JavaScript permite propiedades extra en objetos, pero cualquier refactor puede romperlo sin que el compilador avise.

**Solución**: Añadir `lastAttackResult?: AttackResultSummary` a la definición de `GameState` en `state.ts`.

---

### B2. `handleAction` y `onPlayerDisconnect` caminos inconsistentes

**Archivos**: `src/server/GameRoom.ts:127-167`

`onPlayerDisconnect` **bypasea `handleAction`** — aplica el SURRENDER con `applyAction()` directamente sin pasar por el método principal que usan todas las demás acciones. Como consecuencia:

- El snapshot del estado para la acción SURRENDER **no se guarda** (el código de snapshot está en `handleAction`, no en `onPlayerDisconnect`)
- La inyección de `GAME_OVER` se hace manualmente (duplicando lógica de `handleAction`)
- Si en el futuro se añade validación centralizada en `handleAction`, el camino de desconexión no la tendrá

```typescript
// GameRoom.ts:147 — No pasa por handleAction()
this.currentState = applyAction(this.currentState, { type: 'SURRENDER', playerId });
```

**Impacto**: Alto. Datos de replay incompletos para partidas terminadas por desconexión. El snapshot del estado final no se guarda.

**Solución**: Refactorizar `onPlayerDisconnect` para que el timeout llame a `handleAction()` en lugar de `applyAction()` directamente, o extraer la lógica de snapshot+GAMEOVER a un método compartido.

---

### B3. Sin validación de `activePlayer` en el handler Socket.IO de ACTION

**Archivos**: `src/server/index.ts:174-181`

El servidor verifica que el socket pertenece al `playerId` pero **no verifica que sea el turno del jugador** en el handler central:

```typescript
socket.on('ACTION', ({ gameId, action, playerId }) => {
    const room = getRoom(gameId);
    if (!room.isPlayer(socket.id, playerId)) return;  // Solo verifica ownership
    const newState = room.handleAction(action, playerId);
    io.to(gameId).emit('STATE', newState);
});
```

La validación de turno se delega a cada handler individual, y no todos la tienen:
- `handleMove` no verifica `action.playerId === state.activePlayer` explícitamente
- `handleAttack` tampoco
- Algunos sí la tienen (ej: `handleEndTurn`, `handleCard`)

**Impacto**: Medio. Un cliente modificado podría enviar acciones fuera de turno y algunos handlers las procesarían antes de rechazarlas.

**Solución**: Añadir validación de `activePlayer` en el handler Socket.IO antes de llamar a `handleAction`, o en el propio `handleAction` de GameRoom.

---

### B4. `computeReport` retorna `null` sin recuperación

**Archivos**: `src/server/report.ts:89-98`

Si `computeReport` retorna `null` (falta winner, userIds incompletos, etc.), `submitReport` logea el error pero **no reintenta y la partida se pierde**:

```typescript
const payload = computeReport(gameId, state, actions, userIdMapping, matchType, initialDeployments);
if (!payload) {
    console.error(`[report] No se pudo computar reporte para ${gameId}`);
    return false;  // ❌ La partida se juega completamente pero los datos se pierden
}
```

**Impacto**: Alto. La partida se juega completamente pero si hay un error en el cómputo (ej: userIdMapping incompleto porque un jugador no tenía userId), los datos no se pueden recuperar después.

**Solución**: Almacenar las acciones y el estado en un archivo temporal o cola de reintentos para recuperación manual.

---

### B5. `gameStartTime` no se actualiza en reconexión

**Archivos**: `src/shared/game/phases/deployment.ts:90`, `src/server/report.ts:221`

`gameStartTime` se fija al entrar en fase `GAME` y nunca se actualiza. Si un jugador se desconecta 30s, la `duration` del reporte será:

```typescript
const duration = gameStartTime > 0 ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
```

Incluye el tiempo de desconexión, dando una duración incorrecta (mayor a la real).

**Impacto**: Bajo. La duración reportada no refleja el tiempo real de juego si hubo desconexiones.

**Solución**: Descontar el tiempo desconectado de la duración final, o pausar un contador de duración durante la desconexión.

---

### B6. `SNAPSHOT_EVERY_N_ACTIONS = 1` inadecuado para producción

**Archivos**: `src/server/GameRoom.ts:77`

Con snapshot en cada acción, una partida de 200 acciones genera **200 copias completas del estado**. Cada `GameState` contiene el array `gameHistory[]` completo, `attackResults[]`, y todos los modificadores. Para partidas largas, esto puede consumir decenas de MB en memoria por sala.

```typescript
private SNAPSHOT_EVERY_N_ACTIONS = 1;  // Cada acción = 1 snapshot
```

**Impacto**: Medio. En desarrollo es aceptable; en producción con 100+ partidas simultáneas puede agotar la memoria.

**Solución**: Espaciar a cada 5-10 acciones en producción. Ajustar según el tamaño promedio del estado.

---

### B7. La sala no se limpia si el timeout de desconexión nunca se dispara

**Archivos**: `src/server/GameRoom.ts:136-166`, `src/server/rooms.ts`

Si un jugador se desconecta durante `PREPARATION` (no `GAME`), el timeout **no se inicia**:

```typescript
if (playerId && room.getCurrentState().gamePhase === 'GAME') {
    room.onPlayerDisconnect(playerId);  // Solo para fase GAME
}
```

Pero la sala permanece en memoria hasta que ambos `leave()` o la sala esté vacía. Si nadie más se conecta, la sala queda huérfana.

**Impacto**: Bajo. Fuga de memoria lenta si hay muchas partidas abandonadas en preparación.

**Solución**: Añadir timeout de limpieza para salas en PREPARATION con un solo jugador.

---

## ✅ Fortalezas

| # | Fortaleza | Dónde | Detalle |
|---|-----------|-------|---------|
| **F1** | **Reducer puro y determinista** | `reducer.ts` | `applyAction(state, action) → newState` sin efectos secundarios. Misma seed RNG + mismas acciones → mismo estado final. Esto permite replay exacto y tests deterministas |
| **F2** | **Event Sourcing simplificado** | `GameRoom.ts:206-263` | Cada acción se registra en `ActionRecord[]` con índice, turno, fase y timestamp. Permite reproducción bit-por-bit de la partida |
| **F3** | **Snapshots para reconexión eficiente** | `GameRoom.ts:273-295` | `rebuildStateUpTo()` busca el snapshot más cercano y re-aplica solo las acciones posteriores. O(1) para snapshot exacto |
| **F4** | **Mecanismo de desconexión/reconexión robusto** | `GameRoom.ts:127-184` | Timeout de 60s con auto-rendición, restauración de flags de habilidad, notificación al oponente vía Socket.IO |
| **F5** | **Inmutabilidad del estado** | Todos los handlers | Cada handler devuelve un nuevo objeto con spread operator. Sin mutaciones. Previene efectos secundarios entre handlers |
| **F6** | **Modularización clara** | `actions/`, `phases/`, `combat/`, `modifiers/` | Cada sistema tiene su directorio con barrel `index.ts`. Fácil de navegar y testear de forma aislada |
| **F7** | **Retry con backoff en reportes HTTP** | `report.ts:379-411` | 3 reintentos con backoff (1s, 5s, 15s) para tolerar caídas transitorias de la web API. Timeout total ~21s |
| **F8** | **Tipado fuerte con unión discriminada** | `action-types.ts` | 18 tipos de acción como unión discriminada con `type` como discriminante. TypeScript estrecha automáticamente en los switch |
| **F9** | **Auth JWT compartido con web** | `index.ts:87-99`, `index.ts:101-105` | Mismo `AUTH_SECRET` de NextAuth.js. Usuarios se unen a su room personal para notificaciones de matchmaking |
| **F10** | **Validación de ownership de socket** | `index.ts:177`, `GameRoom.ts:111-114` | Verifica que el socket emisor es el dueño del playerId. Impide que un jugador ejecute acciones del otro |

---

## ⚠️ Puntos de mejora

### M1. Sin logging estructurado

**Archivos**: Todo el servidor.

Solo se usa `console.log` / `console.error` sin formato consistente. No hay:
- Niveles (info, warn, error, debug)
- Prefijos de módulo consistentes (algunos usan `[report]`, otros no)
- Timestamp en los logs
- Correlation ID para seguir el flujo de una partida
- Logs de rendimiento (duración de `handleAction`, memoria de snapshots)

**Sugerencia**: Implementar un logger simple con niveles y prefijos `[modulo]`. Ej:
```typescript
const log = {
    info: (msg: string, ...args: any[]) => console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[${new Date().toISOString()}] [WARN] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, ...args),
};
```

---

### M2. Sin rate limiting en Socket.IO

**Archivos**: `src/server/index.ts:174`

Un cliente malicioso puede emitir `ACTION` cientos de veces por segundo:

```typescript
socket.on('ACTION', ({ gameId, action, playerId }) => {
    // Sin límite — el cliente puede enviar 1000 acciones/segundo
    const newState = room.handleAction(action, playerId);
    io.to(gameId).emit('STATE', newState);
});
```

Impacto: degradación del servidor, inundación de `STATE` a clientes, consumo de memoria por `ActionRecord[]`.

**Sugerencia**: Añadir throttle por socket (ej: máx 10 acciones/segundo) con `socket.data.lastActionTime`.

---

### M3. Sin validación en runtime de acciones

**Archivos**: `src/server/index.ts:174`

Las acciones llegan como `object` desde Socket.IO y se tipan como `GameAction` con un cast:

```typescript
socket.on('ACTION', ({ gameId, action, playerId }) => {
    // action es object — se confía en que el cliente envió algo válido
    const newState = room.handleAction(action as GameAction, playerId);
```

Si un cliente envía `{ type: 'INVALID' }`, se tratará como `GameAction` sin validación. Los handlers internos pueden fallar o comportarse inesperadamente.

**Sugerencia**: Validar con Zod y exponer el schema desde `@shared` para que cliente y servidor compartan la misma validación.

---

### M4. El tipo `GameState` es monolítico y difícil de mantener

**Archivos**: `src/shared/game/state.ts` (305 líneas, ~80 campos)

Un solo tipo con todos los campos del juego. Muchos son opcionales (`?`) y específicos de identidades concretas:

- `robinHoodHealedThisTurn?: boolean` (para Robin Hood)
- `globalPresionActive?: boolean` (para Capitán de la Guardia)
- `pendingEspartanoChoice?: boolean` (para Espartano)
- ... etc.

La complejidad crece con cada identidad añadida.

**Sugerencia**: Separar en submódulos con estado específico de cada identidad. Usar `Record<string, any>` para flags de identidad o un mapa tipado.

---

### M5. Sin purge de replays antiguos

**Archivos**: No implementado.

Los `GameReplay` se acumulan indefinidamente en PostgreSQL. La documentación (fase3.md) menciona purgar >20 por jugador pero no hay código que lo implemente.

**Sugerencia**: Implementar purge periódico (diario) que elimine replays excedentes por jugador.

---

### M6. `types.ts` en `server/` está obsoleto

**Archivos**: `src/server/types.ts`

```typescript
export type PlayerSlot = { socketId: string; playerId: 'p1' | 'p2'; userId?: string; };
export type ActionRecord = { index: number; action: GameAction; playerId: 'p1' | 'p2'; time: number; };
export type StateSnapshot = { actionIndex: number; state: GameState; time: number; };
```

Estos tipos ahora están definidos en `GameRoom.ts` (con campos adicionales como `phase`, `turn`). El archivo `types.ts` no se importa en ningún lado del proyecto.

**Sugerencia**: Eliminar `src/server/types.ts`.

---

### M7. Sin endpoint de health check

**Archivos**: `src/server/index.ts:227-229`

El servidor HTTP no expone rutas de health check. No hay forma de monitorear:
- Si el servidor está vivo
- Cuántas salas hay activas
- Cuánta memoria se está usando
- Uptime

**Sugerencia**: Añadir `GET /health` que devuelva:
```json
{ "status": "ok", "uptime": 3600, "rooms": 5, "players": 10, "memory": "45MB" }
```

---

### M8. El modo `online` no está probado

**Archivos**: `src/server/index.ts:10,52-76`

El modo online sirve archivos estáticos del build de Vite (`dist/`). Este código nunca se ha probado en un despliegue real y podría tener:
- Bugs de rutas (el SPA fallback podría no funcionar)
- Problemas de MIME types
- Errores de encoding con archivos grandes

**Sugerencia**: No usar el servidor para servir estáticos en producción. Desplegar el cliente por separado (Vercel, Netlify, etc.) y mantener el servidor solo para WebSocket.

---

### M9. Sin tests del pipeline Socket.IO

**Archivos**: No existen.

Los tests existentes (`src/shared/test/`) solo prueban la lógica de juego pura (reducer, acciones, fases). No hay tests que verifiquen:

- Que `socket.on('ACTION')` → `handleAction` → `STATE` funciona
- Que `submitReport` envía el payload correcto con `gameHistory`
- Que el timeout de desconexión dispara el surrender
- Que la reconexión restaura el estado correctamente

**Sugerencia**: Implementar tests de integración con `socket.io-client` simulando dos jugadores.

---

### M10. `gameOverReason` no se persiste en la BD

**Archivos**: `web/app/api/games/report/route.ts`, `web/prisma/schema.prisma`

La razón del game over (`general_killed`, `surrender`, `disconnect`) está solo en el `GameState` en memoria y en la acción `GAME_OVER` del array de acciones. La tabla `Game` no tiene campo `gameOverReason`.

Consultar esta información requiere parsear el JSON de `GameReplay.actions`, lo cual es ineficiente.

**Sugerencia**: Añadir columna `gameOverReason` a `Game` en Prisma, migrar, y almacenarla en el reporte.

---

## Priorización

```
P1 - Crítico (corregir ahora):
  B1 (lastAttackResult fuera del tipo)
  B2 (path desconexión inconsistente)
  M2 (rate limiting)

P2 - Importante (corregir pronto):
  B4 (reporte sin recuperación)
  M5 (purge replays)
  M10 (persistir gameOverReason)
  M3 (validación runtime de acciones)

P3 - Mejora continua:
  M1 (logging estructurado)
  M6 (eliminar types.ts obsoleto)
  M7 (health check)
  B3 (validación activePlayer)
  B5 (gameStartTime en reconexión)
  B6 (SNAPSHOT_EVERY_N_ACTIONS)
  M4 (GameState monolítico)
  M8 (modo online)
  M9 (tests Socket.IO)
  B7 (limpieza de salas huérfanas)
```

---

## Resumen

| Categoría | Cantidad |
|-----------|----------|
| 🔴 Bugs | 7 |
| ✅ Fortalezas | 10 |
| ⚠️ Mejoras | 10 |
| **Total** | **27 hallazgos** |
