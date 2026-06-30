[docs](../docs.md) > [tienda](./docs.md) > recarga-mock

# Recarga de ShadowCoins — Implementación simulada (mock)

## Objetivo

Implementar el flujo completo de compra de ShadowCoins (selección de paquete → confirmación → acreditación de SC) **sin integrar Stripe real**. Todo queda visible y funcional en la web; al migrar a Stripe real solo se reemplazan los mocks.

## Principio de diseño

Cada pieza se implementa con una capa mock que expone la misma interfaz que tendría Stripe real.

```
HOY (mock)                     →   MAÑANA (real)
────────────────────────────────────────────────────
lib/stripe.mock.ts             →   lib/stripe.ts
POST /stripe/create-payment    →   PaymentIntent real
StripeCheckout (mock)          →   Stripe Elements
Sin webhook                    →   POST /api/webhooks/stripe
```

El resto no cambia entre mock y real: `SC_PACKAGES`, `PackageCard`, `RecargarContent`, `/tienda/recargar`, navbar, banner.

## Contrato de endpoints (idéntico entre mock y real)

### GET /api/stripe/packages

Lista los paquetes disponibles sin exponer IDs internos.

**Response:**
```json
{
    "packages": [
        { "id": "small",  "name": "Paquete Pequeño",   "sc": 100,  "usd": 199  },
        { "id": "medium", "name": "Paquete Mediano",    "sc": 600,  "usd": 999  },
        { "id": "large",  "name": "Paquete Grande",     "sc": 1500, "usd": 1999 },
        { "id": "legend", "name": "Paquete Legendario", "sc": 5000, "usd": 4999 }
    ]
}
```

### POST /api/stripe/create-payment

Crea una compra y acredita SC. En mock: status directo `"succeeded"`. En real: crea `PaymentIntent` con status `"pending"` + webhook.

**Request:**
```json
{ "packageId": "medium" }
```

**Response (200) mock:**
```json
{ "status": "ok", "coinsRemaining": 850, "amountSC": 600, "purchaseId": "uuid" }
```

**Response (400):**
```json
{ "error": "Paquete inválido" }
```

### GET /api/stripe/history

Historial de compras del usuario autenticado.

**Response:**
```json
{
    "purchases": [
        { "amountSC": 600, "amountUSD": 999, "status": "succeeded", "createdAt": "..." }
    ]
}
```

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│  /tienda/recargar (server component)                     │
│  ├── RecargarContent (client component)                  │
│  │   ├── PackageCard (por cada paquete)                  │
│  │   └── StripeCheckout (mock → botón simular pago)      │
│  └── GET /api/stripe/packages                            │
│                                                          │
│  /tienda (existente)                                     │
│  ├── Saldo clickeable → /tienda/recargar                 │
│  └── Banner "¿Necesitas más SC?" → /tienda/recargar      │
│                                                          │
│  Navbar: enlace Recargar → /tienda/recargar              │
└─────────────────────────────────────────────────────────┘
```

API:
```
GET  /api/stripe/packages        → SC_PACKAGES
POST /api/stripe/create-payment  → crea Purchase + incrementa coins
GET  /api/stripe/history         → historial del usuario
```

## Flujo de usuario (simulado)

```
1. Usuario ve saldo clickeable o banner en /tienda → clic
2. Llega a /tienda/recargar → grid con PackageCard
3. Clic en "Comprar 600 SC por $9.99" → modal de confirmación
4. Confirma → se monta StripeCheckout (mock)
5. Botón "✅ Simular pago exitoso"
6. Clic → POST /api/stripe/create-payment
7. API crea Purchase + incrementa User.coins + responde { success, coinsRemaining }
8. Toast: "¡600 SC adquiridos! Saldo: X SC"
9. Botón "Volver a la tienda"
```

## Archivos

### Crear

| Archivo | Descripción |
|---|---|
| `web/lib/stripe.mock.ts` | Funciones mock con firma como Stripe SDK |
| `web/app/api/stripe/packages/route.ts` | GET — listar paquetes |
| `web/app/api/stripe/create-payment/route.ts` | POST — mock de compra |
| `web/app/api/stripe/history/route.ts` | GET — historial de compras |
| `web/components/tienda/PackageCard.tsx` | Card de paquete individual |
| `web/components/tienda/StripeCheckout.tsx` | Mock de formulario Stripe |
| `web/components/tienda/RecargarContent.tsx` | Grid + selección + lógica |
| `web/app/tienda/recargar/page.tsx` | Página de recarga |

### Modificar

| Archivo | Cambio |
|---|---|
| `web/prisma/schema.prisma` | Modelo `Purchase` |
| `web/lib/pricing.ts` | Constante `SC_PACKAGES` |
| `web/components/tienda/ShopContent.tsx` | Saldo clickeable + banner |
| `web/components/Navbar.tsx` | Enlace "Recargar" |

## Orden de implementación

```
 1. Modelo Purchase en schema
 2. SC_PACKAGES en pricing.ts
 3. lib/stripe.mock.ts
 4. GET /api/stripe/packages
 5. POST /api/stripe/create-payment
 6. GET /api/stripe/history
 7. PackageCard
 8. StripeCheckout (mock)
 9. RecargarContent
10. /tienda/recargar page
11. ShopContent: saldo clickeable + banner
12. Navbar: enlace Recargar
```

## Migración a Stripe real

| Paso | Acción |
|---|---|
| 1 | Reemplazar `lib/stripe.mock.ts` → `lib/stripe.ts` con publishable key |
| 2 | Instalar `@stripe/stripe-js` y `@stripe/react-stripe-js` |
| 3 | Añadir env vars (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`) |
| 4 | Actualizar `POST /api/stripe/create-payment` para crear PaymentIntent real (status `pending`) |
| 5 | Añadir `POST /api/webhooks/stripe` que escuche `payment_intent.succeeded` |
| 6 | Actualizar `StripeCheckout` para usar `PaymentElement` de Stripe en vez del botón mock |
