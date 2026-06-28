[docs](../docs.md) > [web](./docs.md) > fase2

# Fase 2 — Autenticación, registro y perfil

## Objetivo

Implementar registro de usuarios, inicio de sesión con JWT y página de perfil con estadísticas básicas, utilizando NextAuth.js v5 + Prisma + PostgreSQL.

## Stack específico

| Tecnología | Uso |
|------------|-----|
| NextAuth.js v5 beta | Autenticación con Credentials provider |
| bcryptjs | Hashing de contraseñas |
| Zod | Validación de datos de registro |
| Prisma + PostgreSQL | Persistencia de usuarios y partidas |
| JWT (estrat. token) | Sesión stateless |

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `prisma/schema.prisma` | Modelos `User` (id, email, username, password, elo, wins, losses) y `Game` (id, players, winner) |
| `prisma/migrations/` | Migraciones SQL generadas |
| `lib/prisma.ts` | Singleton de PrismaClient con adapter-pg |
| `lib/auth.ts` | Configuración de NextAuth.js (Credentials provider, JWT callbacks, páginas) |
| `types/next-auth.d.ts` | Tipos extendidos de sesión (id, username) |
| `middleware.ts` | Middleware Edge Runtime que protege `/perfil` con `getToken` |
| `components/Provider.tsx` | SessionProvider wrapper para el root layout |
| `components/AuthButton.tsx` | Botón login/logoregistro contextual en navbar |
| `app/api/register/route.ts` | `POST /api/register` — Crear usuario con validación |
| `app/login/page.tsx` | Página de inicio de sesión |
| `app/login/LoginForm.tsx` | Formulario de login (client component) |
| `app/registro/page.tsx` | Página de registro |
| `app/registro/RegisterForm.tsx` | Formulario de registro con auto-login |
| `app/perfil/page.tsx` | Página de perfil protegida (server component) |

## Modelo de datos

```prisma
model User {
    id             String              @id @default(uuid())
    email          String              @unique
    username       String              @unique
    password       String
    elo            Int                 @default(1000)
    wins           Int                 @default(0)
    losses         Int                 @default(0)
    coins          Int                 @default(0)
    createdAt      DateTime            @default(now())
    gamesAsP1      Game[]              @relation("Player1")
    gamesAsP2      Game[]              @relation("Player2")
    gamesWon       Game[]              @relation("Winner")
    classStats     GameClassStats[]
    identityStats  GameIdentityStats[]
}

model Game {
    id            String              @id
    player1Id     String
    player2Id     String
    winnerId      String?
    type          String              @default("quickplay")
    duration      Int?
    totalTurns    Int?
    createdAt     DateTime            @default(now())
    player1       User                @relation("Player1", fields: [player1Id], references: [id])
    player2       User                @relation("Player2", fields: [player2Id], references: [id])
    winner        User?               @relation("Winner", fields: [winnerId], references: [id])
    replay        GameReplay?
    classStats    GameClassStats[]
    identityStats GameIdentityStats[]
}
```

> **Nota:** Los modelos `GameReplay`, `GameClassStats` y `GameIdentityStats` se añadieron en [Fase 3](./fase3.md). Véase ese documento para el schema completo.

## Flujo de registro

1. Usuario completa formulario en `/registro` (email, username, password).
2. `RegisterForm` envía `POST /api/register` con validación Zod.
3. Servidor valida que email y username no existan (409 si duplicados).
4. Servidor hashea la password con bcrypt (10 rondas) y crea el usuario.
5. Frontend auto-inicia sesión con `signIn('credentials')`.
6. Redirige a `/perfil`.

## Flujo de login

1. Usuario completa formulario en `/login` (email, password).
2. `LoginForm` llama a `signIn('credentials', ...)` de next-auth.
3. NextAuth busca el email en DB y compara password con bcrypt.
4. Si ok: genera JWT con `{ id, username, email }`.
5. Redirige a `/perfil`.

## Configuración de NextAuth.js

- **Provider**: Credentials (email + password).
- **Estrategia de sesión**: JWT (stateless, no database session).
- **Página de login**: `/login`.
- **Callbacks**:
  - `jwt`: Añade `id` y `username` al token.
  - `session`: Propaga `id` y `username` a `session.user`.

## Middleware de protección

El middleware (`middleware.ts`) usa `getToken` de `next-auth/jwt` (compatible con Edge Runtime) para proteger `/perfil`. No usa el helper `auth` de `lib/auth.ts` porque ese importa Prisma (incompatible con Edge).

```typescript
// middleware.ts — solo protege /perfil
export const config = {
    matcher: ['/perfil'],
};
```

## Perfil de usuario (`/perfil`)

- Server component que lee la sesión y consulta estadísticas en DB.
- Muestra: avatar (inicial), username, email, fecha de registro.
- Estadísticas: ELO, victorias, derrotas, winrate (%).
- Si no hay partidas jugadas: muestra mensaje informativo.

## Componentes compartidos actualizados

| Componente | Cambio |
|------------|--------|
| `Navbar.tsx` | Integra `AuthButton` y enlace "Jugar" |
| `Provider.tsx` | Nuevo — SessionProvider para next-auth |
| `AuthButton.tsx` | Nuevo — muestra username + cerrar sesión, o enlaces login/registro |

## Decisiones técnicas

- **Credentials provider** en vez de OAuth (el juego no necesita redes sociales).
- **JWT** en vez de database sessions (evita consultas extra a DB en cada request).
- **Edge middleware** con `getToken` directo en vez de `auth()` por limitaciones de Edge Runtime.
- **bcryptjs** en vez de bcrypt (evita dependencias nativas problemáticas en Vercel).
- **Zod** para validación del lado servidor en registro.
- **Auto-login post-registro** para mejor UX (un solo paso).

## Pendiente

- Recuperación de contraseña (password reset).
- Verificación de email.
- 2FA (no planificado por ahora).
