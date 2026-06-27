[docs](../docs.md) > [web](./docs.md) > session

# Sesión de trabajo — 26 Jun 2026

## Objetivo
Crear proyecto Next.js para la web oficial e implementar Fase 1 (Landing + Cómo jugar).

## Archivos creados

### Configuración del proyecto (`web/`)
- `package.json` — Next.js 15 + Tailwind v4 + TypeScript
- `tsconfig.json` — Config con `@/*` alias
- `next.config.ts` — Config base
- `postcss.config.mjs` — PostCSS con `@tailwindcss/postcss`
- `app/globals.css` — Tema oscuro + colores brand

### Componentes
- `components/Navbar.tsx` — Navbar responsive con menú móvil
- `components/Footer.tsx` — Footer con enlaces y próximas features

### Páginas
- `app/layout.tsx` — Root layout con metadata SEO
- `app/page.tsx` — Landing (hero, características, clases de unidad, CTA)
- `app/como-jugar/page.tsx` — Guía completa del juego (8 secciones)

### Documentación
- `docs/web/descripcion.md` — Especificación general de la web oficial
- `docs/web/docs.md` — Índice de documentación web
- `docs/web/fase1.md` — Detalle de Fase 1
- `docs/web/session.md` — Esta entrada

## Pendientes para próximas sesiones

- [ ] Fase 2: Registro/Login + Perfil + Prisma/PostgreSQL
- [ ] Fase 3: Rankings + Historial
- [ ] Fase 4: Matchmaking
- [ ] Fase 5: Tienda
