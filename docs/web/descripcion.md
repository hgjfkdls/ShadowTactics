[docs](../docs.md) > [web](./docs.md) > descripcion

# Web oficial — Shadow Tactics

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript 5.7 |
| Estilos | Tailwind CSS 4 |
| Base de datos | PostgreSQL + Prisma ORM (incluye columnas JSON para replays y estadísticas) |
| Autenticación | NextAuth.js v5 (Credentials provider + JWT) |
| Validación | Zod 4 |
| Contraseñas | bcryptjs |
| Despliegue | Vercel / Railway |

## Arquitectura

```
web/
├── app/                    # App Router (Next.js 15)
│   ├── layout.tsx          # Root layout + Provider (next-auth session)
│   ├── globals.css         # Tailwind v4 + theme tokens (oscuro)
│   ├── page.tsx            # Landing / Home (hero, características, clases, CTA)
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth.js API route
│   │   ├── register/            # POST /api/register
│   │   ├── games/
│   │   │   ├── route.ts           # GET — historial de partidas
│   │   │   ├── report/route.ts    # POST — reporte post-partida (API key)
│   │   │   └── replay/route.ts    # GET — datos de replay
│   │   ├── rankings/route.ts      # GET — clasificación global
│   │   └── matchmaking/           # 6 endpoints (join, leave, status, invite, invites, accept)
│   ├── como-jugar/         # Tutoriales y reglas del juego
│   ├── jugar/              # Selector de modo + cola + invitaciones
│   ├── login/              # Inicio de sesión (formulario + next-auth)
│   ├── perfil/             # Perfil del usuario (estadísticas + historial protected)
│   ├── rankings/           # Tabla de clasificación global (público)
│   └── registro/           # Registro de nuevo usuario
├── components/             # UI components compartidos
│   ├── Navbar.tsx          # Navbar responsive + AuthButton
│   ├── Footer.tsx          # Footer con enlaces
│   ├── AuthButton.tsx      # Botón login/logout contextual
│   └── Provider.tsx        # SessionProvider wrapper
├── lib/
│   ├── auth.ts             # Configuración de NextAuth.js
│   ├── prisma.ts           # Singleton de PrismaClient (adapter-pg)
│   └── matchmaking.ts      # Lógica de colas, matching e invitaciones
├── prisma/
│   ├── schema.prisma       # Modelos: User, Game, GameReplay, GameClassStats, GameIdentityStats (+ coins)
│   └── migrations/         # Migraciones SQL
├── types/
│   └── next-auth.d.ts      # Tipos extendidos de next-auth
├── middleware.ts           # Protege /perfil con JWT (Edge Runtime)
├── public/                 # Assets estáticos
├── next.config.ts
├── prisma.config.ts        # Config de Prisma para runtime Edge
├── postcss.config.mjs
├── package.json
└── tsconfig.json
```

La web oficial es un proyecto **independiente** del cliente de juego (Vite + React, puerto 5173).
Ambos coexisten en el mismo repositorio pero con builds separados.

## Relación con el cliente de juego

```
Web oficial (localhost:3001)       Cliente juego (localhost:5173)
┌──────────────────────┐          ┌──────────────────────┐
│  Landing             │          │  Lobby / HexBoard    │
│  Cómo jugar          │          │  Socket.IO cliente   │
│  Registro/Login      │  enlace  │                      │
│  Perfil              │ ──────>  │  /game/:id           │
│  Matchmaking         │          │  Auto-join           │
│  Rankings            │          │                      │
│  Tienda (próx.)      │          │                      │
└──────────────────────┘          └──────────────────────┘
```

La web redirige al cliente de juego con un `gameId`. No embebe el cliente.

## Estado por fases

| Fase | Componentes | Estado | Documento |
|------|------------|--------|-----------|
| 1 | Landing + Cómo jugar (páginas estáticas) | ✅ Completada | [fase1.md](./fase1.md) |
| 2 | Registro/Login + Perfil + DB (Prisma/PostgreSQL) | ✅ Completada | [fase2.md](./fase2.md) |
| 3 | Reporte + Estadísticas (clase, identidad) + Replays + Rankings | ✅ Completada | [fase3.md](./fase3.md) |
| 4 | Matchmaking (colas, invitaciones, modos de juego) | ✅ Completada | [fase4.md](./fase4.md) |
| 5 | Tienda de cosméticos + moneda virtual | ⏳ Pendiente | [fase5.md](./fase5.md) |
| 6 | Sistema de amigos | ⏳ Pendiente | [plan.md](./plan.md#fase-6--sistema-de-amigos) |

## Configuración clave

| Variable | Valor (desarrollo) |
|----------|-------------------|
| `AUTH_SECRET` | `BrP9TAY1Dd0/ZZhvv7y6M5z7x+OPCo6tW5kOMuWV68o=` |
| `DATABASE_URL` | `postgresql://postgres@localhost:5432/shadow_tactics` |
| Puerto web | `3001` |
| Puerto cliente juego | `5173` |
| Puerto servidor juego | `3000` |

## Cómo ejecutar

```bash
# Desde la raíz del proyecto
cd web
npm install
npm run dev          # → http://localhost:3001
```

## Próximos hitos

1. Sistema de amigos ([Fase 6](./plan.md#fase-6--sistema-de-amigos))
2. Tienda de cosméticos + moneda virtual ([Fase 5](./fase5.md))
3. Migrar colas de memoria a Redis ([plan.md](./plan.md#42-migrar-colas-a-redis))
4. Notificaciones WebSocket ([plan.md](./plan.md#43-notificaciones-websocket-sin-polling))
