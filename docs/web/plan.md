[docs](../docs.md) > [web](./docs.md) > plan

# Plan de implementación — Web oficial

## Resumen de estado

| Fase | Descripción | Estado | Archivos |
|------|-------------|--------|----------|
| 1 | Landing + Cómo jugar | ✅ Completada | `app/page.tsx`, `app/como-jugar/page.tsx`, `components/Navbar.tsx`, `components/Footer.tsx`, `app/globals.css`, `app/layout.tsx` |
| 2 | Autenticación + Perfil + DB | ✅ Completada | `lib/auth.ts`, `lib/prisma.ts`, `app/login/`, `app/registro/`, `app/perfil/`, `app/api/register/`, `middleware.ts`, `types/next-auth.d.ts`, `components/Provider.tsx`, `components/AuthButton.tsx` |
| 3 | Reporte + Estadísticas (clase, identidad) + Replays + Rankings | ✅ Completada | [fase3.md](./fase3.md) |
| 4 | Matchmaking | ✅ Completada | `lib/matchmaking.ts`, `app/api/matchmaking/*`, `app/jugar/page.tsx` |
| 5 | Tienda de cosméticos + moneda virtual | ⏳ Pendiente | [fase5.md](./fase5.md) |
| 6 | Sistema de amigos | ⏳ Pendiente | plan.md §6 (integrado) |

---

## ✅ Lo que está hecho

### Fase 1 — Landing y Cómo jugar
- Landing page con hero, características, clases de unidad, CTA.
- Página "Cómo jugar" con guía completa (8 secciones).
- Navbar responsive con menú móvil.
- Footer con enlaces.
- Tema oscuro con Tailwind v4 + colores brand (violeta `#3b28cc`).
- Metadata SEO y etiquetas `lang="es"`.

### Fase 2 — Autenticación, registro y perfil
- Schema de Prisma con modelos `User` (ELO, wins, losses) y `Game`.
- Migraciones SQL.
- Singleton de PrismaClient con adapter-pg.
- NextAuth.js v5 con Credentials provider y estrategia JWT.
- Callbacks JWT y session que propagan `id` y `username`.
- API `POST /api/register` con validación Zod + bcryptjs.
- Formularios de login y registro (client components).
- Auto-login tras registro.
- Página de perfil protegida (server component) con estadísticas.
- Middleware Edge Runtime que protege `/perfil`.
- Tipos extendidos de next-auth (`types/next-auth.d.ts`).
- SessionProvider (`components/Provider.tsx`).
- AuthButton contextual en navbar.
- Config de Next.js con `serverExternalPackages` para Prisma.

### Fase 3 — Reporte, estadísticas y rankings

- `POST /api/games/report` — Endpoint que recibe datos post-partida del servidor de juego, valida, computa ELO (K=32, solo ranked), persiste Game + GameReplay + GameClassStats + GameIdentityStats en una transacción.
- `GET /api/games` — Historial paginado de partidas por usuario (oponente, resultado, cambio ELO, modo, duración, turnos, replay disponible).
- `GET /api/games/replay` — Sirve rngSeed + actions[] + datos de identidades para reproducción.
- `GET /api/rankings` — Clasificación global ordenada por ELO DESC con paginación.
- Frontend `/rankings` — Tabla pública con skeleton loader, paginación, resaltado del usuario autenticado.
- Sección de historial en `/perfil` — Tabla con columnas resultado, ELO, modo, duración, turnos, replay, fecha + paginación.
- `src/server/report.ts` — Computa classStats e identityStats desde GameState y ataca el endpoint de reporte.
- `isRanked` en `ActiveMatch` — Exportado junto al array para que el endpoint de reporte valide el tipo de partida.
- Modelos Prisma: `GameReplay`, `GameClassStats`, `GameIdentityStats` + campos `rngSeed`, `type`, `duration`, `totalTurns` en `Game`.

### Fase 4 — Matchmaking
- Dos colas en memoria: `quickplayQueue` (FIFO, sin ELO) y `rankedQueue` (margen ELO progresivo 50→300).
- Lógica de `findMatch` con expansión de margen cada 5s.
- Generación de `gameId` (UUID v4, primeros 8 chars).
- `ActiveMatch` con expiración a 30s, campo `isRanked`.
- `PendingInvite` con expiración a 30s.
- API REST:
  - `POST /api/matchmaking/join` — Entrar en cola (`type: quickplay | ranked`).
  - `GET /api/matchmaking/status` — Polling (searching / matched / timeout).
  - `POST /api/matchmaking/leave` — Salir de cola.
  - `POST /api/matchmaking/invite` — Invitar por username.
  - `GET /api/matchmaking/invites` — Invitaciones entrantes.
  - `POST /api/matchmaking/invites/accept` — Aceptar invitación.
- Frontend `/jugar`:
  - Selector de modo (quickplay / ranked / invite).
  - Cola con spinner, tiempo transcurrido, contador en cola.
  - Pantalla de match encontrado con info del oponente + redirección.
  - Invitar amigo con input + validación.
  - Invitaciones entrantes con botón "Aceptar" (poll 3s).
  - Manejo de timeout y errores.
  - Usuario no autenticado → enlace a login.

---

## ⏳ Lo que falta

### Mejoras a Fase 4

#### 4.2 Migrar colas a Redis
- Las colas en memoria se pierden al reiniciar el servidor.
- Migrar `quickplayQueue`, `rankedQueue`, `activeMatches`, `pendingInvites` a Redis.
- Usar `ioredis` o `@upstash/redis`.
- Estructuras: sorted sets para colas, hashes para matches activos.
- Beneficio: persistencia y posible escalado horizontal.

#### 4.3 Notificaciones WebSocket (sin polling)
- Reemplazar polling de invitaciones (cada 3s) por WebSocket.
- Usar Socket.IO o Server-Sent Events.
- El servidor notifica al invitado en tiempo real cuando recibe una invitación.
- Reducción de latencia y carga en el servidor.

#### 4.4 Sonido/sensación visual en match encontrado
- Animación más vistosa al encontrar partida (efecto de "flash" o confetti).
- Vibración/feedback en el botón de "Buscar partida".

---

### Fase 5 — Tienda de cosméticos

Prioridad: **Baja**
Documento completo: [fase5.md](./fase5.md)

Incluye:
- Modelos de datos (Cosmetic, UserCosmetic, Transaction).
- Tienda (`/tienda`) con compra de un clic.
- Inventario y equipamiento en perfil.
- Moneda virtual (ganancias por partida, integrado con Fase 3).
- Logros y recompensas basados en estadísticas de clase/identidad (Fase 3).

---

### Fase 6 — Sistema de amigos

Prioridad: **Media**
Documento: integrado en plan.md (pendiente de extraer a fase6.md)

#### 6.1 Modelo de datos

Nuevos modelos en Prisma:

```prisma
model FriendRequest {
    id         String         @id @default(uuid())
    senderId   String
    receiverId String
    status     RequestStatus  // PENDING | ACCEPTED | REJECTED
    createdAt  DateTime       @default(now())
    sender     User           @relation("SentRequests", fields: [senderId], references: [id])
    receiver   User           @relation("ReceivedRequests", fields: [receiverId], references: [id])

    @@unique([senderId, receiverId])
}

enum RequestStatus {
    PENDING
    ACCEPTED
    REJECTED
}
```

> **Alternativa:** Modelo `Friendship` con `userId` y `friendId` (dos filas por amistad, o una sola con orden). La opción con `FriendRequest` es más expresiva para el flujo de solicitudes.

Se añade también una relación many-to-many en `User`:

```prisma
model User {
    // ... campos existentes ...
    sentRequests    FriendRequest[] @relation("SentRequests")
    receivedRequests FriendRequest[] @relation("ReceivedRequests")
}
```

#### 6.2 API endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/friends/request` | Enviar solicitud `{ username }` |
| POST | `/api/friends/respond` | Aceptar/rechazar `{ requestId, accept: bool }` |
| GET | `/api/friends` | Lista de amigos (con estado online) |
| GET | `/api/friends/requests` | Solicitudes pendientes recibidas |
| DELETE | `/api/friends/remove` | Eliminar amigo `{ friendId }` |

**POST /api/friends/request**
```json
// Request
{ "username": "amigo123" }
// Response (200)
{ "status": "sent" }
// Response (400)
{ "error": "Usuario no encontrado" }
{ "error": "Ya eres amigo de este usuario" }
{ "error": "Ya enviaste una solicitud a este usuario" }
```

**POST /api/friends/respond**
```json
{ "requestId": "uuid", "accept": true }
// Response
{ "status": "accepted" }
```

**GET /api/friends**
```json
{
    "friends": [
        { "id": "uuid", "username": "amigo", "elo": 1100, "status": "online" | "in_game" | "offline" }
    ]
}
```

#### 6.3 UI

**Página de amigos (`/amigos`)**
- Lista de amigos con avatar (inicial), username, ELO, estado (🟢 online / 🟡 en partida / ⚫ offline).
- Botón "Invitar a partida" junto a cada amigo online → redirige a `/jugar` con el username pre-rellenado en el modo invite.
- Campo para buscar y añadir amigos por username.
- Pestaña de solicitudes pendientes con botones Aceptar/Rechazar.

**Indicador en `/jugar`**
- En el modo "Invitar amigo", añadir un desplegable con la lista de amigos online para invitación rápida (sin escribir username manualmente).

**Notificaciones**
- Las solicitudes de amistad recibidas podrían mostrar un badge en la navbar, o integrarse con el futuro sistema de WebSocket.

#### 6.4 Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `app/amigos/page.tsx` | Página de amigos con listas y gestión |
| `app/api/friends/request/route.ts` | POST — enviar solicitud |
| `app/api/friends/respond/route.ts` | POST — aceptar/rechazar |
| `app/api/friends/route.ts` | GET — lista de amigos |
| `app/api/friends/requests/route.ts` | GET — solicitudes pendientes |
| `app/api/friends/remove/route.ts` | DELETE — eliminar amigo |

#### 6.5 Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Añadir modelos `FriendRequest` y `RequestStatus` |
| `components/Navbar.tsx` | Añadir enlace "Amigos" |
| `app/jugar/page.tsx` | Modo invite: lista de amigos online en desplegable |

#### 6.6 Dependencias

- Fase 2 (usuarios en DB) ✅
- Fase 4 (invitar amigo a partida) ✅ — se reutiliza el flujo existente
- Opcional: 4.3 (WebSocket) — para estado online en tiempo real

#### 6.7 Orden dentro de Fase 6

```
1. Modelo FriendRequest + migración
2. POST /api/friends/request + POST /api/friends/respond
3. GET /api/friends + GET /api/friends/requests
4. DELETE /api/friends/remove
5. Frontend /amigos
6. Desplegable de amigos en /jugar
7. Badge de notificaciones en navbar (opcional, post-WebSocket)
```

---

### Tareas de infraestructura

Prioridad: **Media**

#### I.1 Variables de entorno y producción
- Asegurar que `AUTH_SECRET` y `DATABASE_URL` estén configurados en Vercel/Railway.
- Migrar de trust-auth a usuario/contraseña en PostgreSQL.
- Configurar dominio personalizado.

#### I.2 Pipeline CI/CD
- Scripts de lint + typecheck en CI.
- Prisma migrate deploy en despliegue.
- Tests automatizados (opcional).

#### I.3 Monitoreo
- Logs de errores en producción.
- Alertas de caída del servicio.

---

## Dependencias entre tareas

```
Fase 1 ─────────────────────────────────────────────── ✅
Fase 2 ─────────────────────────────────────────────── ✅
Fase 4 ─────────────────────────────────────────────── ✅
                                                      
Fase 3 ─────────────────────────────────────────────── ✅
                                                      
4.2 (Redis) ────────── mejora independiente
4.3 (WebSocket) ────── mejora independiente
                                                      
Fase 5 ─────────────── independiente (nuevos modelos)
                                                       
Fase 6.1-6.5 ───────── depende de ──── Fase 2 (usuarios)
Fase 6.6 (invite) ──── reutiliza ───── Fase 4 (matchmaking)
Fase 6.7 (online) ──── mejora con ───── 4.3 (WebSocket)
```

## Orden recomendado

1. ✅ **Fase 3** (report + stats + replays + rankings + historial) — completado
2. **Segundo** → 4.2 (Redis) + 4.3 (WebSocket) — mejoras de escalabilidad
3. **Tercero** → Fase 5 (Tienda) — cuando el juego base esté estable
4. **Cuarto** → Fase 6 (Amigos) — después de que el matchmaking esté maduro
