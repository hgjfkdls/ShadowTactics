[docs](../docs.md) > [tienda](./docs.md) > orden

# Orden de implementación — Tienda de cosméticos (completado ✅)

Toda la tienda de cosméticos y moneda virtual está implementada.

## Dependencias

- Fase 2 (usuarios en DB) ✅ Completada
- Fase 3 (reporte post-partida) ✅ Completada

## Pasos ejecutados

```
 1. ✅ Schema + migración               (modelos Cosmetic, UserCosmetic, Transaction, enums + coins en User)
 2. ✅ Seed de cosméticos                (prisma/seed.ts con 40 cosméticos)
 3. ✅ POST /api/coins/award             (premiar monedas tras partida)
 4. ✅ GET /api/coins/balance            (consultar saldo)
 5. ✅ GET /api/shop/items               (listar tienda con estado owned/equipped)
 6. ✅ POST /api/shop/buy                (comprar cosmético)
 7. ✅ POST /api/shop/equip              (equipar/desequipar)
 8. ✅ Frontend: ShopCard + RarityBadge  (componentes base)
 9. ✅ Frontend: ShopContent + filtros   (grid, categorías, rareza)
10. ✅ Frontend: /tienda + BuyModal      (página completa)
11. ✅ GET /api/transactions             (historial de monedas)
12. ✅ Frontend: InventorySection        (inventario en /perfil)
13. ✅ Integrar award en /api/games/report (auto-premiar al reportar partida)
14. ✅ Enlace "Tienda" en Navbar
```

## Detalle por paso (implementado)

### 1. Schema + migración ✅

**Archivos:** `web/prisma/schema.prisma`

Se añadieron:
- Enum `CosmeticType` (23 valores)
- Enum `Rarity` (4 valores)
- Enum `TransactionType` (EARN, SPEND)
- Modelo `Cosmetic`
- Modelo `UserCosmetic`
- Modelo `Transaction`
- Campo `coins` en `User`
- Relaciones `cosmetics` y `transactions` en `User`

### 2. Seed ✅

**Archivos:** `web/prisma/seed.ts`

- 40 cosméticos insertados con `upsert`.
- Script `prisma.seed` en `package.json`.
- Ejecutado con `npx prisma db seed`.

### 3. POST /api/coins/award ✅

**Archivos:** `web/app/api/coins/award/route.ts`

- Protegido con API key (misma que `POST /api/games/report`).
- Consulta racha de victorias del ganador.
- Consulta si es primera partida del día.
- Calcula monedas según fórmula (ver [moneda.md](./moneda.md)).
- Crea `Transaction` para cada jugador.
- Incrementa `User.coins`.
- Todo en una transacción de Prisma.

### 4. GET /api/coins/balance ✅

**Archivos:** `web/app/api/coins/balance/route.ts`

- Protegido con sesión de usuario.
- Retorna `{ coins }` del usuario autenticado.

### 5. GET /api/shop/items ✅

**Archivos:** `web/app/api/shop/items/route.ts`

- Protegido con sesión de usuario.
- Retorna todos los `Cosmetic` con campos `owned` y `equipped` calculados del usuario.
- Soporta filtros `type`, `rarity` y `onsale`.
- Incluye saldo actual.

### 6. POST /api/shop/buy ✅

**Archivos:** `web/app/api/shop/buy/route.ts`

- Protegido con sesión de usuario.
- Valida saldo suficiente.
- Valida que no esté ya comprado.
- Crea `UserCosmetic` + `Transaction` + descuenta monedas.
- Todo en una transacción de Prisma.

### 7. POST /api/shop/equip ✅

**Archivos:** `web/app/api/shop/equip/route.ts`

- Protegido con sesión de usuario.
- Valida que el usuario posea el cosmético.
- Aplica reglas de exclusividad por tipo (`unitClass` para SKIN/WEAPON).
- Todo en una transacción de Prisma.

### 8-10. Frontend tienda ✅

**Archivos:** `web/components/tienda/ShopCard.tsx`, `RarityBadge.tsx`, `ShopContent.tsx`, `BuyModal.tsx`, `web/app/tienda/page.tsx`

- ShopCard con estados: comprar, bloqueado, equipado, descuento.
- RarityBadge con colores por rareza.
- ShopContent con filtros por categoría, rareza y ofertas.
- BuyModal con confirmación y descuento.
- Página `/tienda` con server component + redirect si no autenticado.

### 11. GET /api/transactions ✅

**Archivos:** `web/app/api/transactions/route.ts`

- Protegido con sesión de usuario.
- Paginado, filtrable por tipo (`EARN`/`SPEND`).
- Ordenado por fecha descendente.

### 12. Frontend inventario ✅

**Archivos:** `web/app/perfil/page.tsx`, `web/components/perfil/InventorySection.tsx`, `InventoryCard.tsx`

- Sección de inventario en `/perfil` debajo del historial.
- Filtros por categoría y pestaña "Equipados".
- Acciones de equipar/desequipar.
- Mensaje vacío con enlace a la tienda.

### 13. Integrar award en reporte ✅

**Archivos:** `web/app/api/games/report/route.ts`

- Después de crear el `Game` y procesar ELO, se llama a `computeCoins` importada de `lib/pricing.ts` dentro de la misma transacción.

### 14. Navbar ✅

**Archivos:** `web/components/Navbar.tsx`

- Enlace `'/tienda'` añadido al array `links`.

## Diagrama de dependencias

```
Schema ──> Seed ──> Buy ──> Equip
              │               │
              ▼               ▼
         Shop Items ──── Frontend Tienda
              │
              ├──> Balance
              │
              ▼
         Award ──> Integrar en Reporte
              │
              ▼
         Transactions ──> Frontend Inventario
```

## Tiempo invertido (referencia)

| Paso | Estimación original |
|---|---|
| 1-2 (Schema + Seed) | ~1h |
| 3-7 (APIs core) | ~3h |
| 8-10 (Frontend tienda) | ~3h |
| 11-12 (Transactions + Inventario) | ~2h |
| 13-14 (Integración + Navbar) | ~1h |
| **Total estimado** | **~10h** |

## Siguiente: Stripe — Pagos reales 🚧

El sistema de recarga de ShadowCoins con dinero real está planificado. Ver [stripe.md](./stripe.md) para el detalle completo.

### Pasos pendientes (Stripe)

```
 1. 🔲 Crear modelo Purchase + migración
 2. 🔲 Definir SC_PACKAGES en lib/pricing.ts
 3. 🔲 lib/stripe.ts (inicializar Stripe cliente)
 4. 🔲 GET /api/stripe/packages
 5. 🔲 POST /api/stripe/create-payment
 6. 🔲 POST /api/webhooks/stripe
 7. 🔲 Frontend: PackageCard + StripeCheckout
 8. 🔲 Frontend: /tienda/recargar
 9. 🔲 GET /api/stripe/history (opcional)
10. 🔲 Saldo clickeable + banner en ShopContent
11. 🔲 Enlace "Recargar" en Navbar
```

| Paso | Estimación |
|---|---|
| 1-3 (Modelo + configuración) | ~1h |
| 4-6 (APIs Stripe + Webhook) | ~3h |
| 7-9 (Frontend recarga) | ~2h |
| 10-11 (Integración tienda + Navbar) | ~1h |
| **Total** | **~7h** |

> Tiempo estimado total: ~7h. Ver [stripe.md](./stripe.md) para documentación completa.
