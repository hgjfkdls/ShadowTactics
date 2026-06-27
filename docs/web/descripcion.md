[docs](../docs.md) > [web](./docs.md) > descripcion

# Web oficial — Shadow Tactics

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript 5.7 |
| Estilos | Tailwind CSS 4 |
| Despliegue | Vercel / Railway |

## Arquitectura

```
web/
├── app/                    # App Router (Next.js 15)
│   ├── layout.tsx          # Root layout + metadata
│   ├── globals.css         # Tailwind v4 + theme tokens
│   ├── page.tsx            # Landing / Home
│   ├── como-jugar/         # Tutoriales y reglas
│   ├── registro/           # Registro + Login     (Fase 2)
│   ├── rankings/           # Clasificación        (Fase 3)
│   ├── tienda/             # Cosméticos           (Fase 5)
│   └── perfil/             # Perfil de usuario    (Fase 2)
├── components/             # UI components compartidos
│   ├── Navbar.tsx          # Barra de navegación
│   └── Footer.tsx          # Pie de página
├── lib/                    # Utilidades, db, auth (próximas fases)
├── public/                 # Assets estáticos
├── package.json
├── tsconfig.json
├── next.config.ts
└── postcss.config.mjs
```

La web oficial es un proyecto **independiente** del cliente de juego (Vite + React).
Ambos coexisten en el mismo repositorio pero con builds separados.

## Relación con el cliente de juego

```
Web oficial (localhost:3001)       Cliente juego (localhost:5173)
┌──────────────────────┐          ┌──────────────────────┐
│  Landing             │          │  Lobby / HexBoard    │
│  Cómo jugar          │          │  Socket.IO cliente   │
│  Registro/Login      │  enlace  │                      │
│  Rankings            │ ──────>  │  Game ID manual      │
│  Tienda              │          │  Matchmaking (Fase 4)│
└──────────────────────┘          └──────────────────────┘
```

La web redirige al cliente de juego con un `gameId`. No embebe el cliente.

## Fases de implementación

| Fase | Componentes | Estado |
|------|------------|--------|
| 1 | Landing + Cómo jugar (páginas estáticas) | ✅ Completada |
| 2 | Registro/Login + Perfil + DB (Prisma/PostgreSQL) | ❎ Pendiente |
| 3 | Rankings + Historial de partidas | ❎ Pendiente |
| 4 | Matchmaking (cola + generación Game ID) | ❎ Pendiente |
| 5 | Tienda de cosméticos + moneda virtual | ❎ Pendiente |

## Cómo ejecutar

```bash
# Desde la raíz del proyecto
cd web
npm install
npm run dev          # → http://localhost:3001
```
