[docs](../docs.md) > [web](./docs.md) > debug-matchmaking

# Depuración de error de conexión en matchmaking

## Síntoma

Al hacer clic en "Buscar partida" en `/jugar`, aparece el mensaje **"Error de conexión"** y no se puede entrar en cola.

## Diagnóstico inicial (29 jun 2026)

### Estado verificado

| Componente | Estado | Puerto |
|------------|--------|--------|
| Next.js (web) | ✅ Respondiendo | 3001 |
| Socket.IO (juego) | ✅ Escuchando | 3000 |
| PostgreSQL | ✅ Escuchando | 5432 |
| Tablas `QueueEntry`, `MatchSession`, `MatchPlayer`, `PendingInvite` | ✅ Existen en BD | — |
| Cliente Prisma generado | ✅ Incluye todos los modelos | — |
| Migraciones | ⚠️ Solo 2 (`init`, `fase3`). Los modelos de matchmaking se crearon con `db push`, no con migración | — |

### Árbol de causa raíz

```
Usuario click "Buscar partida"
  → startSearch()
    → setStatus('searching')
    → fetch POST /api/matchmaking/join
      → auth()               ← Lee JWT de cookie (sin Prisma)
      → joinQueue(userId, type)
        → prisma.queueEntry.deleteMany()
        → prisma.matchSession.deleteMany()
        → prisma.matchSession.findFirst()
        → prisma.user.findUnique()
        → findMatchInDB()
          → prisma.queueEntry.findMany()
            → ❌ Si Prisma lanza (mismatch cliente/BD / conexión DB)
              → API route lanza 500
                → Next.js devuelve HTML de error
                  → r.json() FALLA (esperaba JSON, recibió HTML)
                    → catch() → "Error de conexión"
```

---

## Plan de corrección

### Paso 1 — Regenerar Prisma client y verificar sync

**Archivos**: `prisma/schema.prisma`, `prisma/migrations/`

**Problema**: Las tablas de matchmaking (`QueueEntry`, `MatchSession`, `MatchPlayer`, `PendingInvite`) y `GamePlayerPerformance` existen en la BD pero no hay migraciones para ellas. El cliente Prisma podría estar desincronizado.

**Acción**:
```powershell
cd web
npx prisma generate                          # Regenerar cliente
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script
```
Si el diff muestra tablas/columnas sin migrar, crear una migración:
```powershell
npx prisma migrate dev --name fase4_matchmaking
```

**Criterio de éxito**: `prisma migrate status` muestra que el schema está al día y no hay drift.

---

### Paso 2 — Añadir try/catch a todas las API routes de matchmaking

**Archivos**:
- `app/api/matchmaking/join/route.ts`
- `app/api/matchmaking/status/route.ts`
- `app/api/matchmaking/leave/route.ts`
- `app/api/matchmaking/invite/route.ts`
- `app/api/matchmaking/invites/route.ts`
- `app/api/matchmaking/invites/accept/route.ts`

**Problema**: Ninguna ruta captura excepciones. Si Prisma lanza, Next.js devuelve 500 con HTML en lugar de JSON.

**Solución**: Envolver el cuerpo de cada handler en try/catch y devolver JSON consistente:

```typescript
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }
        const result = await joinQueue(session.user.id, type);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[matchmaking/join]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error interno del servidor' },
            { status: 500 },
        );
    }
}
```

**Criterio de éxito**: Un error en Prisma devuelve `{ "error": "mensaje" }` con status 500, no HTML.

---

### Paso 3 — Corregir `startSearch()` para manejar errores JSON

**Archivo**: `app/jugar/page.tsx` (función `startSearch`)

**Problema**: Si la API devuelve 500 con body JSON `{ "error": "..." }`, `data.status` es `undefined` y ningún if captura el error. El usuario se queda en "Buscando..." para siempre.

**Solución**: Detectar `data.error` como condición de error y mostrar el mensaje:

```typescript
fetch('/api/matchmaking/join', ...)
    .then((r) => r.json().catch(() => ({ error: 'Respuesta inválida del servidor' })))
    .then((data) => {
        if (data.error) {
            setStatus('error');
            setErrorMsg(data.error);
            return;
        }
        if (data.status === 'matched') { ... }
        if (data.status === 'searching') { ... }
    })
    .catch(() => {
        setStatus('error');
        setErrorMsg('Error de conexión — no se pudo contactar al servidor');
    });
```

Además, usar `r.json().catch(...)` en lugar de asumir que siempre es JSON válido.

**Criterio de éxito**: Cualquier respuesta de la API, exitosa o con error, se muestra correctamente al usuario.

---

### Paso 4 — Mejorar el polling con backoff

**Archivo**: `app/jugar/page.tsx` (efecto de polling en `QueueMode`)

**Problema**: El polling cada 3s es infinito. Si el servidor está caído, sigue intentando para siempre sin límite.

**Solución**: Añadir límite de reintentos y backoff exponencial:

```typescript
const MAX_RETRIES = 20; // 60s máximo de polling
const retryRef = useRef(0);

// En el intervalo:
pollRef.current = setInterval(() => {
    retryRef.current += 1;
    if (retryRef.current > MAX_RETRIES) {
        stopIntervals();
        setStatus('timeout');
        return;
    }
    fetch('/api/matchmaking/status')
        .then((r) => r.json())
        .then((data) => {
            retryRef.current = 0; // resetear en éxito
            ...
        })
        .catch(() => { ... });
}, 3000);
```

**Criterio de éxito**: Tras ~60s sin respuesta del servidor, el polling se detiene y muestra timeout.

---

### Paso 5 — Usar variables de entorno para URLs del cliente de juego

**Archivo**: `app/jugar/page.tsx`

**Problema**: `http://localhost:5173` hardcodeado en 3 lugares:
- `ModeSelector.handleAccept` (línea 81)
- `QueueMode.goToMatch` (línea 170)
- `InviteMode` (línea 386)

**Solución**: Crear una constante o usar `process.env.NEXT_PUBLIC_GAME_CLIENT_URL`:

```typescript
// page.tsx (top-level)
const GAME_CLIENT_URL = process.env.NEXT_PUBLIC_GAME_CLIENT_URL ?? 'http://localhost:5173';

// Uso
window.location.href = `${GAME_CLIENT_URL}/game/${gameId}?${params}`;
```

**Criterio de éxito**: La URL del cliente se configura desde `.env` y no está hardcodeada.

---

### Paso 6 — Mejorar `emitToUser` con logging y más reintentos

**Archivo**: `lib/matchmaking.ts`

**Problema**: `emitToUser` hace 2 intentos y se rinde sin logging.

**Solución**:
```typescript
function emitToUser(userId: string, event: string, data: unknown) {
    const attempt = (retries = 3) => {
        fetch(`${GAME_SERVER}/__emit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, event, data }),
        }).catch((err) => {
            console.warn(`[emitToUser] falló (${retries} retries left):`, err.message);
            if (retries > 0) setTimeout(() => attempt(retries - 1), 1000);
        });
    };
    attempt();
}
```

**Criterio de éxito**: Si el servidor de juego está caído, se registra una advertencia y se reintenta hasta 3 veces con backoff de 1s.

---

### Paso 7 — Feedback visual del estado del WebSocket

**Archivo**: `app/jugar/page.tsx`

**Problema**: `useSocket` expone `{ connected }` pero `page.tsx` no lo usa. El usuario no sabe si las notificaciones en tiempo real están activas.

**Solución**: Mostrar un indicador de estado junto al contador de cola:

```typescript
// En QueueMode
const { connected: socketConnected } = useSocket({ ... });

// En el JSX de "searching"
{!socketConnected && (
    <p className="text-xs text-amber-500">
        Conectando con el servidor de juego... Las notificaciones pueden tener latencia.
    </p>
)}
```

**Criterio de éxito**: El usuario ve si el WebSocket está conectado durante la búsqueda.

---

### Paso 8 — Corregir margen ELO en `findMatchInDB`

**Archivo**: `lib/matchmaking.ts`

**Problema**: Se evalúa el margen del candidato más antiguo, no del jugador actual. Un jugador que recién entra (margin=50) puede matchear contra alguien con mucho margen (margin=300).

**Solución**: Usar el margen más restrictivo entre ambos:

```typescript
// Ranked: usar el margen más restrictivo
for (const c of candidates) {
    const elapsed = (now.getTime() - entry.joinedAt.getTime()) / 1000;
    const margin = Math.min(50 + Math.floor(elapsed / 5) * 50, 300);
    const cElapsed = (now.getTime() - c.joinedAt.getTime()) / 1000;
    const cMargin = Math.min(50 + Math.floor(cElapsed / 5) * 50, 300);
    const effectiveMargin = Math.min(margin, cMargin);
    if (Math.abs(c.elo - entry.elo) <= effectiveMargin) {
        return c;
    }
}
```

**Criterio de éxito**: Dos jugadores solo matchean si ambos están dentro del margen ELO del otro.

---

### Paso 9 — Limpiar `pendingInvites` al salir del modo invite

**Archivo**: `app/jugar/page.tsx`

**Problema**: Al navegar entre modos, las invitaciones pendientes persisten en el estado.

**Solución**: En el `onBack` de `InviteMode`, limpiar el estado al volver al selector. Esto ya ocurre porque `mode` se setea a `null`, pero el estado local de `InviteMode` persiste hasta desmontarse. Verificar que React desmonte el componente correctamente (ya lo hace por la condición `if (mode === 'invite') return <InviteMode ... />`).

---

### Paso 10 — Verificar la relación MatchPlayer ↔ MatchSession

**Archivo**: `prisma/schema.prisma`

**Problema**: `MatchPlayer.matchId` referencia `MatchSession.gameId`, pero `MatchSession.id` es el PK (UUID autogenerado) y `gameId` es un campo `@unique`. Prisma maneja esto correctamente en nested creates, pero hay que verificar que no haya drift.

**Acción**: Confirmar que la FK en BD apunte a `MatchSession.gameId` y no a `MatchSession.id`:

```sql
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'MatchPlayer' AND tc.constraint_type = 'FOREIGN KEY';
```

---

## Orden de implementación

```
Paso 1  ─── Regenerar Prisma + migración (causa más probable del error)
Paso 2  ─── Try/catch en API routes (evita HTML 500)
Paso 3  ─── Manejo de errores en frontend (muestra error real)
Paso 8  ─── Margen ELO (corrección de lógica)
Paso 4  ─── Polling con backoff
Paso 5  ─── URLs en variables de entorno
Paso 6  ─── emitToUser con logging
Paso 7  ─── Indicador WebSocket
Paso 9  ─── Limpieza de invites
Paso 10 ─── Verificar FK en BD
```

## Verificación

Después de implementar:

1. `npx prisma generate && npx prisma migrate dev`
2. Iniciar web (`npm run dev`) y servidor juego (`npm run dev` en raíz)
3. Abrir `/jugar` en 2 navegadores/ventanas con usuarios distintos
4. Ambos click "Buscar partida" → deben matchear en <10s
5. Verificar redirección a `localhost:5173/game/{id}`
6. Probar invitación por username
7. Probar cancelar búsqueda
8. Verificar que errores de BD muestren mensaje legible sin crashear

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `lib/matchmaking.ts` | Margen ELO, emitToUser con logging |
| `app/api/matchmaking/join/route.ts` | Try/catch |
| `app/api/matchmaking/status/route.ts` | Try/catch |
| `app/api/matchmaking/leave/route.ts` | Try/catch |
| `app/api/matchmaking/invite/route.ts` | Try/catch |
| `app/api/matchmaking/invites/route.ts` | Try/catch |
| `app/api/matchmaking/invites/accept/route.ts` | Try/catch |
| `app/jugar/page.tsx` | Manejo de errores, polling, URLs env, indicador WS |
| `app/hooks/useSocket.ts` | Logging (opcional) |
| `prisma/schema.prisma` | Posible migración |
