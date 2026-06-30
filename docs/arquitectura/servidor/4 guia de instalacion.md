[docs](../docs.md) > [arquitectura](./index.md) > servidor

# 4. Guía de instalación

## Requisitos previos

| Herramienta | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 18+ (recomendado 22+) | Runtime del servidor |
| npm | 9+ | Gestor de paquetes |
| PostgreSQL | 14+ | Base de datos (requerido por web oficial) |
| Git | — | Control de versiones |

## Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd shadow-tactics
```

### 2. Instalar dependencias del servidor de juego

```bash
# Desde la raíz del proyecto
npm install
```

### 3. Instalar dependencias de la web oficial

```bash
cd web
npm install
cd ..
```

### 4. Configurar variables de entorno

Crear o verificar el archivo `.env` en la raíz:

```bash
# Verificar que existe
cat .env

# Si no existe, copiar de ejemplo:
# MODE=local
# LOCAL_URL=http://localhost
# SERVER_PORT=3000
# WEB_API_URL=http://localhost:3001
# AUTH_SECRET=<mismo que en web/.env>
```

> **Importante**: `AUTH_SECRET` debe coincidir entre `web/.env` y `.env` para que los JWT funcionen correctamente.

### 5. Configurar la base de datos

La web oficial requiere PostgreSQL con el schema de Prisma:

```bash
cd web
npx prisma generate
npx prisma migrate deploy
cd ..
```

### 6. Iniciar el servidor de juego

```bash
# Desde la raíz
npm run server
```

Esto ejecuta:
```
nodemon --watch src --ext ts --exec "tsx src/server/index.ts"
```

El servidor se inicia en `http://localhost:3000`.

### 7. Iniciar la web oficial (requerido para reportes)

En otra terminal:

```bash
cd web
npm run dev
```

La web oficial se inicia en `http://localhost:3001`.

### 8. Iniciar el cliente de juego (opcional para pruebas)

```bash
# Desde la raíz
npm run dev
```

El cliente de juego se inicia en `http://localhost:5173`.

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run server` | Inicia servidor de juego con nodemon + tsx |
| `npm run test` | Ejecuta tests de lógica de juego |
| `npm run dev` | Inicia cliente de juego (Vite) |
| `npm run build` | Compila cliente de juego para producción |

## Verificar que funciona

```bash
# El servidor debería mostrar:
# Socket.IO server corriendo en http://localhost:3000

# Probar conexión básica:
curl http://localhost:3000
# Respuesta esperada: 404 (no hay ruta GET /)
```

## Solución de problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| `EADDRINUSE` | Puerto 3000 ocupado | `npx kill-port 3000` o cambiar `SERVER_PORT` en `.env` |
| Error JWT | `AUTH_SECRET` no coincide | Verificar que `.env` y `web/.env` tengan el mismo valor |
| Reportes no se guardan | Web API no disponible | Verificar que `npm run dev` en `web/` esté corriendo en puerto 3001 |
| `MODULE_NOT_FOUND` | Faltan dependencias | Ejecutar `npm install` |
