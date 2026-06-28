[docs](../docs.md) > [web](./docs.md) > fase5

# Fase 5 — Tienda de cosméticos y moneda virtual

**Estado:** ⏳ Pendiente
**Prioridad:** Baja

## Objetivo

Implementar un sistema de personalización visual con moneda virtual que los jugadores ganan al jugar partidas y pueden gastar en cosméticos (tableros, fichas, efectos, etc.).

## Dependencias

- Fase 2 (usuarios en DB) ✅ Completada
- Fase 3 (reporte post-partida + estadísticas) — para premiar monedas al finalizar partida

```
Partida ──> POST /api/games/report ──> + monedas
                                             │
                                             ▼
                                       /tienda ──> comprar cosmético
                                             │
                                             ▼
                                       /perfil ──> equipar cosmético
```

---

## 5.1 Modelo de datos

### Nuevos modelos Prisma

```prisma
model Cosmetic {
    id          String   @id @default(uuid())
    name        String                     // "Tablero nocturno"
    description String                     // "Un tablero oscuro con efectos de luna"
    type        CosmeticType               // BOARD | PIECE | EFFECT | BANNER
    imageUrl    String                     // URL del thumbnail
    price       Int                        // Costo en monedas
    createdAt   DateTime @default(now())
    users       UserCosmetic[]
}

model UserCosmetic {
    userId     String
    cosmeticId String
    equipped   Boolean  @default(false)
    purchasedAt DateTime @default(now())
    user       User     @relation(fields: [userId], references: [id])
    cosmetic   Cosmetic @relation(fields: [cosmeticId], references: [id])

    @@id([userId, cosmeticId])
}

model Transaction {
    id        String       @id @default(uuid())
    userId    String
    amount    Int                         // Positivo = ganancia, Negativo = gasto
    type      TransactionType             // EARN | SPEND
    concept   String                      // "Partida completada", "Compra: Tablero nocturno"
    createdAt DateTime     @default(now())
    user      User         @relation(fields: [userId], references: [id])
}

enum CosmeticType {
    BOARD
    PIECE
    EFFECT
    BANNER
}

enum TransactionType {
    EARN
    SPEND
}
```

### Modificación al modelo `User`

```prisma
model User {
    // ... campos existentes ...
    coins      Int            @default(0)
    cosmetics  UserCosmetic[]
    transactions Transaction[]
}
```

### Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| — | (los modelos van en `prisma/schema.prisma`) |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Añadir modelos `Cosmetic`, `UserCosmetic`, `Transaction` + enums |
| `prisma/schema.prisma` | Añadir campo `coins` a `User` |
| — | Generar migración (`npx prisma migrate dev`) |

---

## 5.2 Moneda virtual

### Ganancias por partida

| Concepto | Monedas |
|----------|---------|
| Partida completada (cualquier resultado) | 10 |
| Bonus por victoria | +5 |
| Bonus por racha de 3+ victorias | +3 adicionales |

### API endpoints

#### `POST /api/coins/award`

Llamado por el servidor de juego al reportar partida (o integrado en `POST /api/games/report`).

**Body:**
```json
{
    "gameId": "a1b2c3d4",
    "winnerId": "uuid",
    "loserId": "uuid",
    "winnerStreak": 3
}
```

**Response:**
```json
{
    "status": "ok",
    "coins": {
        "winner": { "earned": 18, "total": 250 },
        "loser": { "earned": 10, "total": 180 }
    }
}
```

#### `GET /api/coins/balance`

Retorna el saldo del usuario autenticado.

**Response:**
```json
{ "coins": 250 }
```

#### `GET /api/transactions`

Retorna historial de transacciones del usuario autenticado (para mostrar en perfil).

**Response:**
```json
{
    "transactions": [
        { "amount": 10, "type": "EARN", "concept": "Partida completada", "date": "..." },
        { "amount": -50, "type": "SPEND", "concept": "Compra: Tablero nocturno", "date": "..." }
    ]
}
```

### Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `app/api/coins/award/route.ts` | POST — premiar monedas (protegido con API key) |
| `app/api/coins/balance/route.ts` | GET — saldo del usuario |
| `app/api/transactions/route.ts` | GET — historial de transacciones |

---

## 5.3 Tienda (`/tienda`)

### UI

```
┌──────────────────────────────────────────────────────┐
│  🛒 Tienda                                           │
│                                                      │
│  Monedas: 250  [Categorías: Todos | Tableros | ...]  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 🖼️       │  │ 🖼️       │  │ 🖼️       │           │
│  │ Tablero  │  │ Fichas   │  │ Efecto   │           │
│  │ Nocturno │  │ Doradas  │  │ Lluvia   │           │
│  │ 50 mon.  │  │ 30 mon.  │  │ 80 mon.  │           │
│  │ [Comprar]│  │ [Comprar]│  │ 🔒       │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└──────────────────────────────────────────────────────┘
```

### Especificación

**URL:** `/tienda`
**API:** `GET /api/shop/items`

**Response:**
```json
{
    "items": [
        {
            "id": "uuid",
            "name": "Tablero Nocturno",
            "description": "Un tablero oscuro con efectos de luna",
            "type": "BOARD",
            "imageUrl": "/cosmetics/board-night.png",
            "price": 50,
            "owned": false,
            "equipped": false
        }
    ],
    "coins": 250
}
```

**API:** `POST /api/shop/buy`

**Body:**
```json
{ "cosmeticId": "uuid" }
```

**Response (200):**
```json
{ "status": "ok", "coinsRemaining": 200 }
```

**Response (400):**
```json
{ "error": "Monedas insuficientes" }
```

### Funcionalidad

- Grid de cosméticos agrupados por categoría.
- Filtro por tipo (Todos, Tableros, Fichas, Efectos, Banners).
- Cada tarjeta muestra: imagen, nombre, precio.
- Si ya lo posee: mostrar "✔️ Adquirido".
- Si lo tiene equipado: mostrar "✅ Equipado".
- Si no tiene suficientes monedas: botón deshabilitado.
- Compra inmediata con confirmación visual.
- Sin carrito ni checkout — compra de un clic.

### Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `app/tienda/page.tsx` | Página de tienda con grid y filtros |
| `app/api/shop/items/route.ts` | GET — listar cosméticos disponibles |
| `app/api/shop/buy/route.ts` | POST — comprar cosmético |

---

## 5.4 Inventario y equipamiento

Sección en `/perfil` para gestionar los cosméticos adquiridos.

### UI

```
┌──────────────────────────────────────────┐
│  Inventario                              │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │ 🖼️       │  │ 🖼️       │             │
│  │ Tablero  │  │ Fichas   │             │
│  │ Nocturno │  │ Doradas  │             │
│  │ ✅       │  │ [Equipar]│             │
│  └──────────┘  └──────────┘             │
└──────────────────────────────────────────┘
```

### API

**POST /api/shop/equip**

**Body:**
```json
{ "cosmeticId": "uuid" }
```

Al equipar un cosmético de un tipo, se desequipa automáticamente el anterior del mismo tipo (solo un board, un piece, etc. activos a la vez).

**Response:**
```json
{ "status": "ok", "equipped": true }
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/perfil/page.tsx` | Añadir sección de inventario después del historial |
| `app/api/shop/equip/route.ts` | POST — equipar/desequipar cosmético |

---

## 5.5 Seed de cosméticos

Para desarrollo, crear un script de seed con cosméticos iniciales.

### Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `prisma/seed.ts` | Seed con 10-15 cosméticos de ejemplo |

**package.json** — añadir script:
```json
"prisma": {
    "seed": "tsx prisma/seed.ts"
}
```

### Cosméticos sugeridos

| Nombre | Tipo | Precio |
|--------|------|--------|
| Tablero Clásico | BOARD | Gratis (por defecto) |
| Tablero Nocturno | BOARD | 50 |
| Tablero Arena | BOARD | 80 |
| Tablero Hielo | BOARD | 120 |
| Fichas Doradas | PIECE | 30 |
| Fichas Esmeralda | PIECE | 60 |
| Fichas Rubí | PIECE | 100 |
| Efecto Lluvia | EFFECT | 80 |
| Efecto Nieve | EFFECT | 100 |
| Efecto Lava | EFFECT | 150 |
| Banner Simple | BANNER | Gratis |
| Banner Escudo | BANNER | 40 |
| Banner Corona | BANNER | 70 |

---

## Orden de implementación

```
1. Actualizar schema.prisma + migración     (modelos nuevos)
2. Seed de cosméticos                        (datos de prueba)
3. POST /api/coins/award                     (premiar monedas)
4. GET /api/coins/balance                    (consultar saldo)
5. GET /api/shop/items                       (listar tienda)
6. POST /api/shop/buy                        (comprar)
7. POST /api/shop/equip                      (equipar)
8. Frontend /tienda                           (página tienda)
9. Frontend inventario en /perfil             (sección perfil)
10. GET /api/transactions                     (historial monedas)
11. Integrar award en POST /api/games/report  (auto-premiar)
```

---

## Próximos pasos tras Fase 5

- Paquetes de cosméticos (lotes con descuento).
- Cosméticos exclusivos por logros o temporada.
- Regalo de cosméticos entre jugadores.
- Tienda con ofertas rotativas.
