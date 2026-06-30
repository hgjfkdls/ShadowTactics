[docs](../docs.md) > [tienda](./docs.md) > api

# API — Tienda de cosméticos y moneda virtual

## Resumen de endpoints

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| POST | `/api/coins/award` | API Key | Premiar monedas al finalizar partida |
| GET | `/api/coins/balance` | Sesión | Saldo del usuario autenticado |
| GET | `/api/transactions` | Sesión | Historial de transacciones |
| GET | `/api/shop/items` | Sesión | Listar cosméticos disponibles |
| POST | `/api/shop/buy` | Sesión | Comprar un cosmético |
| POST | `/api/shop/equip` | Sesión | Equipar/desequipar un cosmético |

---

## POST /api/coins/award

Premia monedas al finalizar una partida. Llamado por el servidor de juego (o integrado en `POST /api/games/report`).

**Autenticación:** API key compartida (header `X-Api-Key`).
**Content-Type:** `application/json`

### Request

```json
{
    "gameId": "a1b2c3d4",
    "winnerId": "uuid-del-ganador",
    "loserId": "uuid-del-perdedor",
    "isRanked": true,
    "winnerScore": 85,
    "loserScore": 50
}
```

`winnerScore` y `loserScore` son opcionales (default 50). Corresponden al campo `GamePlayerPerformance.score` (0–100).

### Response (200)

```json
{
    "status": "ok",
    "coins": {
        "winner": { "earned": 18, "total": 250 },
        "loser": { "earned": 10, "total": 180 }
    }
}
```

### Response (400)

```json
{ "error": "Partida ya recompensada" }
```

### Notas

- El endpoint consulta la racha de victorias del ganador y si es su primera partida del día.
- La transacción se registra con concepto: `"Partida completada:{gameId}"` (incluye el ID de la partida para permitir detección de duplicados).
- Se integra dentro de la transacción de `POST /api/games/report` para evitar inconsistencias.

---

## GET /api/coins/balance

Retorna el saldo del usuario autenticado.

**Autenticación:** Sesión de usuario (requiere login).

### Response

```json
{ "coins": 250 }
```

---

## GET /api/transactions

Retorna historial de transacciones del usuario autenticado.

**Autenticación:** Sesión de usuario.

### Query params

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | 1 | Número de página |
| `limit` | number | 20 | Transacciones por página |
| `type` | string | — | Filtrar por `EARN` o `SPEND` (opcional) |

### Response

```json
{
    "transactions": [
        {
            "id": "uuid",
            "amount": 10,
            "type": "EARN",
            "concept": "Partida completada",
            "createdAt": "2026-06-28T12:00:00Z"
        },
        {
            "id": "uuid",
            "amount": -50,
            "type": "SPEND",
            "concept": "Compra: Tablero Nocturno",
            "createdAt": "2026-06-27T10:30:00Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 42
    }
}
```

---

## GET /api/shop/items

Lista todos los cosméticos disponibles con el estado de propiedad del usuario autenticado.

**Autenticación:** Sesión de usuario.

### Query params

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `type` | string | — | Filtrar por CosmeticType (ej: `BOARD`, `SKIN`) |
| `rarity` | string | — | Filtrar por Rarity (`COMMON`, `RARE`, `EPIC`, `LEGENDARY`) |
| `onsale` | boolean | — | `true` = solo cosméticos con descuento activo |

### Response

```json
{
    "items": [
        {
            "id": "uuid",
            "name": "Tablero Nocturno",
            "description": "Un tablero oscuro con efectos de luna",
            "type": "BOARD",
            "rarity": "RARE",
            "imageUrl": "/cosmetics/board-night.png",
            "price": 80,
            "discountPercent": 0,
            "discountEndsAt": null,
            "effectivePrice": 80,
            "owned": false,
            "equipped": false,
            "attributes": { "boardTheme": "NIGHT", "hexStyle": "DARK_STONE" }
        },
        {
            "id": "uuid",
            "name": "Tablero Volcán",
            "description": "Lava ardiente y cenizas volcánicas",
            "type": "BOARD",
            "rarity": "EPIC",
            "imageUrl": "/cosmetics/board-volcano.png",
            "price": 200,
            "discountPercent": 25,
            "discountEndsAt": "2026-07-31T00:00:00Z",
            "effectivePrice": 150,
            "owned": false,
            "equipped": false,
            "attributes": { "boardTheme": "VOLCANO", "hexStyle": "LAVA" }
        }
    ],
    "coins": 250
}
```

---

## POST /api/shop/buy

Compra un cosmético. Descuenta las monedas y registra la transacción.

**Autenticación:** Sesión de usuario.
**Content-Type:** `application/json`

### Request

```json
{ "cosmeticId": "uuid" }
```

### Response (200)

```json
{ "status": "ok", "coinsRemaining": 200, "discountApplied": false }
```

### Response (400)

```json
{ "error": "Monedas insuficientes" }
```

```json
{ "error": "Ya posees este cosmético" }
```

### Lógica

1. Obtener el cosmético y calcular `effectivePrice` (considerando descuento activo).
2. Verificar que el usuario tenga saldo suficiente (`coins >= effectivePrice`).
3. Verificar que no posea ya el cosmético.
4. Crear `UserCosmetic` con `equipped: false`.
5. Crear `Transaction` con `type: SPEND` y `amount: -effectivePrice`.
   Si hay descuento, el concepto incluye `(X% descuento)`.
6. Decrementar `User.coins` en `effectivePrice`.
7. Todo en una transacción de Prisma.

---

## POST /api/shop/equip

Equipa o desequipa un cosmético del usuario.

**Autenticación:** Sesión de usuario.
**Content-Type:** `application/json`

### Equipar

```json
{ "cosmeticId": "uuid" }
```

### Response (200)

```json
{ "status": "ok", "equipped": true }
```

### Desequipar

```json
{ "cosmeticId": "uuid", "equip": false }
```

```json
{ "status": "ok", "equipped": false }
```

### Lógica de equipamiento

1. Verificar que el usuario posea el cosmético.
2. Si `equip: true` (default):
   - Buscar cualquier `UserCosmetic` del mismo `CosmeticType` (o mismo `unitClass` para SKIN/WEAPON) que tenga `equipped: true`.
   - Si existe, establecer `equipped: false`.
   - Establecer `equipped: true` en el nuevo cosmético.
3. Si `equip: false`: establecer `equipped: false`.
4. Todo en una transacción de Prisma.

### Reglas por tipo

| Tipo | Regla de exclusividad |
|---|---|
| SKIN | Una skin por `unitClass` (puedes tener skin diferente en cada clase) |
| WEAPON | Un arma por `unitClass` |
| BOARD | Solo un board activo |
| HEX_VARIANT | Solo un hex style activo |
| CLIMATE | Solo un clima activo |
| LIGHTING | Solo una iluminación activa |
| PROFILE_FRAME | Solo un marco activo |
| AVATAR | Solo un avatar activo |
| PROFILE_BACKGROUND | Solo un fondo activo |
| TITLE | Solo un título activo |
| EMOTE | Todos los emotes están disponibles (sin límite de equipamiento) |
| BANNER | Solo un banner activo |
| PET | Solo una mascota activa |
| COMPANION | Solo un compañero activo |
| CURSOR | Solo un cursor activo |
| UI_THEME | Solo un tema activo |
| MENU_BACKGROUND | Solo un fondo de menú activo |
| LOADING_SCREEN | Solo una pantalla de carga activa |
| REACTION | Múltiples reacciones disponibles |
| QUICK_MESSAGE | Múltiples mensajes disponibles |
| ANIMATION_MOVEMENT | Solo una animación activa |
| ANIMATION_ELIMINATION | Solo una animación activa |
| ANIMATION_SUMMON | Solo una animación activa |
