[docs](./docs.md) > [web](./docs.md) > fase4.3

# 4.3 — Notificaciones WebSocket (sin polling)

## Objetivo

Reemplazar el polling de invitaciones entrantes (`GET /api/matchmaking/invites` cada 3s) por un canal de tiempo real vía WebSocket. El invitado recibe la notificación al instante en cuanto se crea la invitación, sin latencia de polling ni carga innecesaria al servidor.

## Stack

| Tecnología | Versión | Uso |
|------------|---------|-----|
| `socket.io` | ^4.8 | Servidor y cliente WebSocket |
| `jsonwebtoken` | ^9 | Verificar JWT de NextAuth en handshake |
| `concurrently` | ^9 | Ejecutar Next.js + Socket.IO server en `npm run dev` |

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    Servidor                          │
│                                                      │
│  ┌──────────────────┐    ┌──────────────────────┐   │
│  │  Next.js (3001)   │    │  Socket.IO (3002)    │   │
│  │  REST API         │    │  Eventos tiempo real │   │
│  │  matchmaking/*    │    │  - invite_received   │   │
│  │  friends/*        │◄──►│  - invite_cancelled  │   │
│  │  etc.             │    │  - friend_request    │   │
│  └──────────────────┘    └──────────────────────┘   │
│           │                       ▲                  │
└───────────┼───────────────────────┼──────────────────┘
            │ HTTP/REST             │ WebSocket
            ▼                       │
┌───────────────────────────────────┼────┐
│         Cliente (navegador)       │    │
│                                   ▼    │
│  ┌─────────────────┐  ┌────────────────┐ │
│  │  fetch() REST    │  │  socket.io     │ │
│  │  acciones:       │  │  eventos:      │ │
│  │  - join/leave    │  │  - invite      │ │
│  │  - invite/send   │  │  - online      │ │
│  │  - acceptInvite  │  │  - notif       │ │
│  └─────────────────┘  └────────────────┘ │
└──────────────────────────────────────────┘
```

**Principio:** Las **acciones** del usuario (buscar partida, cancelar, invitar, aceptar) siguen yendo por REST (`/api/matchmaking/*`). Las **notificaciones** (alguien te invitó, alguien aceptó, partida encontrada) llegan por WebSocket.

## Flujo con WebSocket

### Invitación a amigo (con WebSocket)

```
Invitador                          Web (3001)              Socket.IO (3002)            Invitado
    │                                  │                        │                        │
    │ POST /api/matchmaking/invite     │                        │                        │
    │ {"username":"amigo"}             │                        │                        │
    │─────────────────────────────────►│                        │                        │
    │                                  │                        │                        │
    │              [crea PendingInvite] │                        │                        │
    │                                  │  emit("invite_received",│                        │
    │                                  │    {inviterName,gameId})│                        │
    │                                  │───────────────────────►│                        │
    │                                  │                        │ socket.emit("invite")  │
    │                                  │                        │───────────────────────►│
    │◄────────────────────────────────│                        │                        │
    │ {"status":"invited","gameId"}   │                        │                        │
    │                                  │                        │                        │
```

### Matchmaking encontrado (con WebSocket — opcional)

El matchmaking también puede notificar por WebSocket en vez de polling. Pero el polling de status ya es cada 2s (baja frecuencia), no es prioritario. Sin embargo, podemos notificar el match encontrado también por WS para reducir latencia.

## Eventos

### Servidor → Cliente

| Evento | Payload | Disparo |
|--------|---------|---------|
| `invite` | `{ id, inviterName, gameId }` | Cuando alguien invita al usuario |
| `invite_cancelled` | `{ inviteId }` | Cuando la invitación expira o es cancelada |
| `invite_accepted` | `{ gameId, invitedName }` | Cuando el invitado acepta (notifica al invitador) |
| `match_found` | `{ gameId, opponent: { username, elo } }` | Cuando se encuentra partida (alternativa al polling) |
| `friend_request` | `{ fromUsername }` | Cuando alguien envía solicitud de amistad |
| `friend_request_accepted` | `{ username }` | Cuando aceptan tu solicitud |

### Cliente → Servidor

| Evento | Payload | Disparo |
|--------|---------|---------|
| (ninguno por ahora) | | El cliente es principalmente receptor. Las acciones van por REST. |

## Autenticación

El cliente envía el JWT de NextAuth al conectar:

```typescript
const socket = io('http://localhost:3002', {
    auth: { token: 'jwt_de_nextauth' },
    autoConnect: false,
});
```

El servidor Socket.IO verifica el token en un middleware:

```typescript
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No autenticado'));

    try {
        const decoded = jwt.verify(token, process.env.AUTH_SECRET!);
        socket.data.userId = decoded.id as string;
        socket.data.username = decoded.username as string;
        next();
    } catch {
        next(new Error('Token inválido'));
    }
});
```

Tras autenticar, el socket se une a una **room** con su `userId`:

```typescript
io.on('connection', (socket) => {
    socket.join(socket.data.userId);
});
```

Esto permite emitir eventos a un usuario específico sin iterar todos los sockets:

```typescript
io.to(userId).emit('invite', { id, inviterName, gameId });
```

## Integración con matchmaking existente

### `lib/matchmaking.ts`

Se modifica `createInvite` para emitir el evento `invite` al invitado:

```typescript
import { getIO } from './ws-server';

export async function createInvite(inviterId: string, invitedUsername: string) {
    // ... lógica existente ...

    const io = getIO();
    if (io) {
        io.to(invited.id).emit('invite', {
            id: invite.id,
            inviterName: inviter?.username ?? 'Desconocido',
            gameId,
        });
    }

    return { status: 'invited', gameId };
}
```

Al aceptar invitación, notificar al invitador:

```typescript
export function acceptInvite(inviteId, userId) {
    // ... lógica existente ...

    const io = getIO();
    if (io) {
        io.to(invite.inviterId).emit('invite_accepted', {
            gameId: invite.gameId,
            invitedName: username, // se obtiene de la sesión
        });
    }

    return { status: 'accepted', gameId: invite.gameId };
}
```

### `createInvite` también debe notificar en timeout

Cuando expira una invitación (30s), el timeout actualmente solo limpia la lista. Debe también emitir `invite_cancelled` al invitado (y opcionalmente al invitador).

### Servidor Socket.IO: `lib/ws-server.ts`

```typescript
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initWSServer(httpServer: ReturnType<typeof createServer>) {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: ['http://localhost:3001', 'http://localhost:5173'],
            credentials: true,
        },
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('No autenticado'));
        try {
            const decoded = jwt.verify(token, process.env.AUTH_SECRET!);
            socket.data.userId = decoded.id as string;
            next();
        } catch {
            next(new Error('Token inválido'));
        }
    });

    io.on('connection', (socket) => {
        socket.join(socket.data.userId);

        socket.on('disconnect', () => {
            // cleanup si es necesario
        });
    });

    return io;
}

export function getIO(): SocketIOServer | null {
    return io;
}
```

### Servidor unificado: `server.js` (raíz de `web/`)

Para development, se necesita un servidor que ejecute tanto Next.js como Socket.IO:

```javascript
// server.js — en la raíz de web/
const { createServer } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer(handle);
    const { initWSServer } = require('./lib/ws-server');

    initWSServer(server);

    const port = parseInt(process.env.PORT ?? '3001', 10);
    server.listen(port, () => {
        console.log(`> Next.js + Socket.IO ready on http://localhost:${port}`);
    });
});
```

### `package.json` — scripts actualizados

```json
{
    "scripts": {
        "dev": "node server.js",
        "dev:next": "next dev -p 3001",
        "server:ws": "tsx lib/ws-standalone.ts",
        "build": "next build",
        "start": "node server.js"
    }
}
```

> Nota: En desarrollo se puede optar por un server independiente (puerto 3002) usando `concurrently`. La opción del server unificado evita CORS y simplifica el deploy.

## Cliente — Hook `hooks/useSocket.ts`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

type EventHandlers = {
    onInvite?: (data: { id: string; inviterName: string; gameId: string }) => void;
    onInviteCancelled?: (data: { inviteId: string }) => void;
    onInviteAccepted?: (data: { gameId: string; invitedName: string }) => void;
    onMatchFound?: (data: { gameId: string; opponent: { username: string; elo: number } }) => void;
    onFriendRequest?: (data: { fromUsername: string }) => void;
};

export function useSocket(handlers: EventHandlers) {
    const { data: session } = useSession();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!session?.user?.id) return;

        const token = (session as any).token ?? '';
        const socket = io('http://localhost:3002', {
            auth: { token },
            reconnection: true,
            reconnectionDelay: 2000,
        });

        socket.on('connect', () => {
            console.log('[WS] Conectado');
        });

        socket.on('invite', handlers.onInvite ?? (() => {}));
        socket.on('invite_cancelled', handlers.onInviteCancelled ?? (() => {}));
        socket.on('invite_accepted', handlers.onInviteAccepted ?? (() => {}));
        socket.on('match_found', handlers.onMatchFound ?? (() => {}));
        socket.on('friend_request', handlers.onFriendRequest ?? (() => {}));

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [session?.user?.id]);

    return socketRef;
}
```

> El token se obtiene de la sesión de NextAuth. Necesitamos exponer el JWT en el cliente: se puede hacer añadiendo un campo `token` a la sesión en el callback `jwt`/`session` de `lib/auth.ts`, o usando `getToken()` del lado servidor y pasándolo al layout.

## Cliente — Integración en `/jugar`

Se reemplaza el polling de invitaciones por el hook:

```typescript
// app/jugar/page.tsx — antes
useEffect(() => {
    const check = () => {
        fetch('/api/matchmaking/invites')
            .then((r) => r.json())
            .then((data) => setPendingInvites(data.invites ?? []));
    };
    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
}, [session?.user?.id]);

// app/jugar/page.tsx — después
useSocket({
    onInvite: (data) => {
        setPendingInvites((prev) => [
            ...prev,
            { id: data.id, inviterName: data.inviterName, gameId: data.gameId },
        ]);
    },
    onInviteCancelled: (data) => {
        setPendingInvites((prev) => prev.filter((i) => i.id !== data.inviteId));
    },
});
```

## Cliente — Provider global `components/SocketProvider.tsx`

Para que el socket esté disponible en toda la app (no solo en `/jugar`), se crea un provider global:

```typescript
'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!session?.user?.id) return;

        const token = (session as any).token; // necesita exponerse en la sesión
        const socket = io('http://localhost:3002', {
            auth: { token },
            reconnection: true,
        });
        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [session?.user?.id]);

    return (
        <SocketContext.Provider value={socketRef.current}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocketIO(): Socket | null {
    return useContext(SocketContext);
}
```

### layout.tsx — envolver con SocketProvider

```typescript
<Provider>
    <SocketProvider>{children}</SocketProvider>
</Provider>
```

### Exponer el JWT en la sesión

En `lib/auth.ts`, callback `jwt` y `session`:

```typescript
callbacks: {
    jwt({ token, user }) {
        if (user) {
            token.id = user.id;
            token.username = user.username;
            token.token = token.jwt;  // el JWT generado por NextAuth
        }
        return token;
    },
    session({ session, token }) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        (session as any).token = token.jwt as string;  // expuesto al cliente
        return session;
    },
},
```

> **Seguridad:** El JWT se expone al cliente. Esto es aceptable porque NextAuth JWT ya es firmado y el cliente lo necesita para el WebSocket. Solo se usa para autenticar el socket, no para acciones de escritura (que requieren cookie HTTP-only via REST).

## Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `lib/ws-server.ts` | Inicialización y configuración del servidor Socket.IO |
| `lib/ws-standalone.ts` | Servidor Socket.IO independiente (para dev con concurrently) |
| `server.js` | Server unificado Next.js + Socket.IO (para dev y producción) |
| `hooks/useSocket.ts` | Hook cliente para conectar/dessionectar y recibir eventos |
| `components/SocketProvider.tsx` | Provider global del socket |
| `docs/web/fase4.3.md` | Este documento |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `package.json` | Añadir `socket.io`, `socket.io-client`, `jsonwebtoken`, `concurrently` |
| `lib/matchmaking.ts` | Emitir eventos `invite`, `invite_cancelled`, `invite_accepted` vía `getIO()` |
| `lib/auth.ts` | Exponer `token` (JWT) en la sesión de NextAuth |
| `app/layout.tsx` | Envolver con `SocketProvider` |
| `app/jugar/page.tsx` | Eliminar polling de invites; usar `useSocket` |
| `next.config.ts` | Configurar CORS si es necesario |

## Orden de implementación

```
1. Instalar dependencias (socket.io, socket.io-client, jsonwebtoken, concurrently)
2. Exponer JWT en la sesión de NextAuth (lib/auth.ts)
3. Crear lib/ws-server.ts (servidor Socket.IO)
4. Crear server.js (servidor unificado)
5. Actualizar scripts de package.json
6. Emitir eventos desde lib/matchmaking.ts
7. Crear hooks/useSocket.ts
8. Crear components/SocketProvider.tsx
9. Integrar en app/layout.tsx
10. Eliminar polling y conectar useSocket en app/jugar/page.tsx
11. Probar flujo completo de invitación
```

## Dependencias

- Fase 2 (autenticación NextAuth) ✅
- Fase 4 (matchmaking con invites) ✅

## Notas de debugging

- El servidor Socket.IO se autentica con el mismo `AUTH_SECRET` que NextAuth. Ambos deben compartir el mismo secreto.
- Si se usa server separado (puerto 3002), configurar CORS para permitir `localhost:3001` y `localhost:5173`.
- El cliente de juego (Vite, puerto 5173) no necesita Socket.IO por ahora; las invitaciones solo se gestionan desde la web oficial.
- En producción, el servidor unificado evita problemas de CORS y simplifica el deploy (un solo puerto).
- Para debuggear, abrir la pestaña "Network" del navegador y filtrar por "ws" para ver los mensajes WebSocket.
