[docs](../docs.md) > [arquitectura](./index.md) > servidor

# 5. Configuración

## Variables de entorno

El servidor de juego se configura mediante variables de entorno definidas en el archivo `.env` de la raíz del proyecto.

### Lista completa

| Variable | Obligatoria | Por defecto | Descripción |
|----------|-------------|-------------|-------------|
| `MODE` | ❌ No | `local` | Modo de conexión: `local` (localhost) u `online` (ngrok/dominio) |
| `LOCAL_URL` | ❌ No | `http://localhost` | URL base en modo local |
| `SERVER_PORT` | ❌ No | `3000` | Puerto del servidor de juego |
| `CLIENT_PORT` | ❌ No | `5173` | Puerto del cliente de juego |
| `CLIENT_URL` | Solo online | — | URL pública del cliente (ngrok/dominio) |
| `SERVER_URL` | Solo online | — | URL pública del servidor |
| `WEB_API_URL` | ❌ No | `http://localhost:3001` | URL de la web oficial (donde se envían reportes) |
| `AUTH_SECRET` | ✅ Sí | `dev-secret` | Secreto JWT compartido con la web oficial |
| `REPORT_API_KEY` | ❌ No | `dev-key-change-me` | API key para autenticar reportes contra la web |

### Valores de ejemplo

#### Modo local (desarrollo)

```ini
MODE=local
LOCAL_URL=http://localhost
SERVER_PORT=3000
WEB_API_URL=http://localhost:3001
AUTH_SECRET=BrP9TAY1Dd0/ZZhvv7y6M5z7x+OPCo6tW5kOMuWV68o=
```

#### Modo online (producción/ngrok)

```ini
MODE=online
SERVER_PORT=3000
CLIENT_URL=https://tu-dominio.ngrok.dev
SERVER_URL=https://tu-dominio.ngrok.dev
WEB_API_URL=https://tu-web.vercel.app
AUTH_SECRET=tu-secreto-jwt-seguro
REPORT_API_KEY=tu-api-key-segura
```

### Archivo de ejemplo completo

```ini
# ── Modo de conexión ──
MODE=local

# ── Local ──
LOCAL_URL=http://localhost
CLIENT_PORT=5173
SERVER_PORT=3000

# ── Online ──
CLIENT_URL=https://tu-dominio.ngrok.dev

# ── Web API ──
WEB_API_URL=http://localhost:3001

# ── Autenticación ──
AUTH_SECRET=BrP9TAY1Dd0/ZZhvv7y6M5z7x+OPCo6tW5kOMuWV68o=
```

## Variables críticas

### `AUTH_SECRET`

**Debe coincidir** entre el servidor de juego (`.env` raíz) y la web oficial (`web/.env`).

El servidor de juego usa `AUTH_SECRET` para:
1. Verificar JWT emitidos por NextAuth.js en las conexiones Socket.IO
2. Unir sockets autenticados a su room personal (para notificaciones específicas por usuario)

Si no coinciden, los JWT serán inválidos y los usuarios no recibirán notificaciones en tiempo real desde el matchmaking.

### `WEB_API_URL`

El servidor de juego envía los reportes post-partida a esta URL. Debe apuntar a la web oficial (`/api/games/report`).

Ejemplos:
- Desarrollo local: `http://localhost:3001`
- Producción: `https://tu-web.vercel.app`

## Configuración de TypeScript

El archivo `tsconfig.json` define los alias de importación:

```json
{
    "paths": {
        "@shared": ["./src/shared/index.ts"],
        "@shared/*": ["./src/shared/*"],
        "@server/*": ["./src/server/*"]
    }
}
```

- `@shared` → lógica de juego compartida (reducer, state, actions, phases)
- `@server` → código específico del servidor
