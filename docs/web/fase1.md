[docs](../docs.md) > [web](./docs.md) > fase1

# Fase 1 — Landing + Cómo jugar

## Objetivo

Implementar las páginas estáticas de la web oficial: Landing (hero, características, CTA)
y Cómo jugar (documentación completa del juego orientada al jugador).

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `web/package.json` | Dependencias: Next.js 15, Tailwind 4, TypeScript |
| `web/tsconfig.json` | TypeScript config con path alias `@/*` |
| `web/next.config.ts` | Config base de Next.js |
| `web/postcss.config.mjs` | PostCSS con `@tailwindcss/postcss` |
| `web/app/globals.css` | Tema oscuro, colores brand, Tailwind v4 |
| `web/app/layout.tsx` | Root layout con metadata SEO |
| `web/app/page.tsx` | Landing: hero, características, clases de unidad, CTA |
| `web/app/como-jugar/page.tsx` | Guía completa del juego (8 secciones) |
| `web/components/Navbar.tsx` | Navbar responsive con menú móvil |
| `web/components/Footer.tsx` | Footer con enlaces y próx. funcionalidades |

## Decisiones técnicas

- **Tailwind v4** con `@tailwindcss/postcss` para seguir la misma versión del cliente de juego.
- **Tema oscuro** (`bg-bg-dark: #0a0a1a`) alineado con la estética del juego.
- **Colores brand** violeta (`#3b28cc` → `#5752ff`) para acentos y CTAs.
- **Sin CSS modules** — Tailwind utility-first + theme tokens en `globals.css`.
- **Sin MDX** por ahora — el contenido de "Cómo jugar" está inline en TypeScript.

## Componentes compartidos (Fase 2+)

| Componente | Ruta | Estado |
|------------|------|--------|
| Navbar | `components/Navbar.tsx` | ✅ Listo |
| Footer | `components/Footer.tsx` | ✅ Listo |
| Button | — | Pendiente para Fase 2 |
| Input | — | Pendiente para Fase 2 |
| Modal | — | Pendiente para Fase 2 |

## Próximos pasos (Fase 2)

- Configurar Prisma + PostgreSQL
- Registro de usuarios (email + username + password)
- Login con JWT (NextAuth.js)
- Página de perfil con estadísticas básicas
- Navbar con menú de usuario autenticado
