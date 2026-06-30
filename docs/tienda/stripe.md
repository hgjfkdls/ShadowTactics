[docs](../docs.md) > [tienda](./docs.md) > stripe

# Stripe — Pagos reales con tarjeta

**Estado:** 🔜 En progreso (siguiente funcionalidad)
**Prioridad:** Alta (después de tienda cosméticos)

## Objetivo

Permitir a los jugadores comprar **ShadowCoins [SC]** con dinero real mediante tarjeta de crédito/débito, Apple Pay y Google Pay.

## Principios de diseño

- **Sin pay-to-win**: solo se compran SC, no cosméticos exclusivos de pago. Cualquier cosmético se puede obtener jugando.
- **Paquetes de SC**: montos fijos, sin montos personalizados.
- **Stripe como único procesador**: cubre EEUU (USD) y LATAM (MXN, BRL, etc.) con un solo dashboard.
- **Confirmación por webhook**: el saldo SC se acredita cuando Stripe confirma el pago, no cuando el usuario cierra el modal.

---

## 1. Stack técnico

| Capa | Paquete / Tecnología |
|---|---|
| Frontend (UI) | `@stripe/react-stripe-js` + `@stripe/stripe-js` |
| Backend (API) | `stripe` SDK server-side |
| Webhook | `POST /api/webhooks/stripe` (App Router) |
| DB | Modelo `Purchase` + modificar `User` |

## 2. Instalación

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js stripe
```

## 3. Variables de entorno

```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 4. Modelo de datos

### Nuevo modelo `Purchase` en Prisma

```prisma
model Purchase {
    id                String   @id @default(uuid())
    userId            String
    amountSC          Int                     // Cantidad de SC comprados
    amountUSD         Int                     // Monto en centavos (USD cents)
    currency          String   @default("usd")
    stripePiId        String   @unique         // PaymentIntent ID de Stripe
    status            String   @default("pending") // pending | succeeded | failed
    createdAt         DateTime @default(now())
    succeededAt       DateTime?
    user              User     @relation(fields: [userId], references: [id])
}
```

### Modificación a `User`

Ninguna adicional (el campo `coins` ya existe).

---

## 5. Paquetes de ShadowCoins

### Precios

Definidos en centavos de USD para evitar errores de redondeo.

| Paquete | SC | Precio USD | stripePriceId |
|---|---|---|---|
| Paquete Pequeño | 100 | $1.99 | `price_xxx_small` |
| Paquete Mediano | 600 | $9.99 | `price_xxx_medium` |
| Paquete Grande | 1500 | $19.99 | `price_xxx_large` |
| Paquete Legendario | 5000 | $49.99 | `price_xxx_legendary` |

Los `stripePriceId` se crean desde el dashboard de Stripe (Products > Add product) o vía API.

### Archivo de configuración

`lib/pricing.ts` — añadir catálogo:

```typescript
export const SC_PACKAGES = [
    { id: 'small',  name: 'Paquete Pequeño',   sc: 100,  usd: 199,  stripePriceId: 'price_xxx_small' },
    { id: 'medium', name: 'Paquete Mediano',    sc: 600,  usd: 999,  stripePriceId: 'price_xxx_medium' },
    { id: 'large',  name: 'Paquete Grande',     sc: 1500, usd: 1999, stripePriceId: 'price_xxx_large' },
    { id: 'legend', name: 'Paquete Legendario', sc: 5000, usd: 4999, stripePriceId: 'price_xxx_legendary' },
] as const;
```

---

## 6. API endpoints

### POST /api/stripe/create-payment

Crea un `PaymentIntent` en Stripe y lo asocia al usuario.

**Request:**
```json
{ "packageId": "medium" }
```

**Response (200):**
```json
{ "clientSecret": "pi_xxx_secret_xxx" }
```

**Response (400):**
```json
{ "error": "Paquete inválido" }
```

### POST /api/webhooks/stripe

Webhook que Stripe llama para notificar eventos de pago. Sin autenticación de sesión, validado con `stripe-webhook-signature`.

**Eventos a escuchar:**

| Evento | Acción |
|---|---|
| `payment_intent.succeeded` | Acreditar SC en `User.coins`, crear `Purchase` con status `succeeded` |
| `payment_intent.payment_failed` | Marcar `Purchase` como `failed` (sin acreditar SC) |

### GET /api/stripe/packages

Lista los paquetes disponibles sin exponer `stripePriceId`.

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

---

## 7. Frontend

### Integración con la tienda principal

Desde la tienda de cosméticos (`/tienda`) se accede a la recarga mediante:

1. **Saldo clickeable** — el indicador `{coins} SC` en `ShopContent.tsx` se convierte en un `<Link href="/tienda/recargar">`.
2. **Banner de recarga** — línea separadora al final del grid: "💰 ¿Necesitas más ShadowCoins? [Recargar SC →]".
3. **Navbar** — enlace "Recargar" junto al botón de usuario (o en el menú de navegación).

### Página `/tienda/recargar`

```
┌──────────────────────────────────────────────┐
│  Recargar ShadowCoins                        │
│                                              │
│  Selecciona un paquete:                      │
│                                              │
│  ┌──────────┐  ┌──────────┐                  │
│  │ 100 SC   │  │ 600 SC   │                  │
│  │ $1.99    │  │ $9.99    │                  │
│  │ [Comprar]│  │ [Comprar]│                  │
│  └──────────┘  └──────────┘                  │
│                                              │
│  ┌──────────┐  ┌──────────┐                  │
│  │ 1500 SC  │  │ 5000 SC  │                  │
│  │ $19.99   │  │ $49.99   │                  │
│  │ [Comprar]│  │ [Comprar]│                  │
│  └──────────┘  └──────────┘                  │
│                                              │
│  ┌────────────────────────────────┐          │
│  │  Elemento de pago de Stripe    │          │
│  │  ┌──────────────────────────┐  │          │
│  │  │ Número de tarjeta        │  │          │
│  │  ├──────────────────────────┤  │          │
│  │  │ MM/AA    CVC             │  │          │
│  │  └──────────────────────────┘  │          │
│  │  [Pagar $9.99]                │          │
│  └────────────────────────────────┘          │
└──────────────────────────────────────────────┘
```

### Flujo de compra

```
1. Usuario navega a /tienda/recargar (desde saldo clickeable, banner o navbar)
2. Selecciona un paquete → modal con resumen
3. Hace clic en "Pagar"
4. Frontend llama a POST /api/stripe/create-payment → obtiene clientSecret
5. Se monta Stripe Elements (PaymentElement) con el clientSecret
6. Usuario ingresa datos de tarjeta
7. Stripe procesa el pago
8. Éxito → Stripe llama al webhook → se acreditan SC
9. Frontend detecta el completion via stripePromise.retrievePaymentIntent
10. Toast + actualización del saldo
11. Botón "Volver a la tienda" → redirige a /tienda
```

### Archivos a crear

| Archivo | Descripción |
|---|---|
| `web/app/tienda/recargar/page.tsx` | Página de recarga con selección de paquetes |
| `web/components/tienda/StripeCheckout.tsx` | Client component con Stripe Elements + PaymentElement |
| `web/components/tienda/PackageCard.tsx` | Card de selección de paquete |
| `web/lib/stripe.ts` | Inicialización del cliente Stripe (publishable key) |
| `web/app/api/stripe/create-payment/route.ts` | POST — crear PaymentIntent |
| `web/app/api/webhooks/stripe/route.ts` | POST — webhook para confirmar pagos |
| `web/app/api/stripe/packages/route.ts` | GET — listar paquetes |
| `web/app/api/stripe/history/route.ts` | GET — historial de compras |

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `web/prisma/schema.prisma` | Modelo `Purchase` |
| `web/lib/pricing.ts` | Constante `SC_PACKAGES` con catálogo de paquetes |
| `web/components/Navbar.tsx` | Enlace "Recargar" o botón de SC en navbar |
| `web/components/tienda/ShopContent.tsx` | Saldo clickeable → enlace a `/tienda/recargar` + banner de recarga |
| `web/app/perfil/page.tsx` | Sección de historial de compras (opcional) |

---

## 8. Webhook de Stripe

Stripe envía eventos a `POST /api/webhooks/stripe`. El endpoint debe:

1. Validar la firma con `stripe.webhooks.constructEvent()` usando `STRIPE_WEBHOOK_SECRET`.
2. Procesar solo `payment_intent.succeeded` y `payment_intent.payment_failed`.
3. En `succeeded`:
   - Buscar `Purchase` por `stripePiId` (creado previamente en `create-payment`).
   - Actualizar `status` a `succeeded` y `succeededAt`.
   - Incrementar `User.coins` en `amountSC`.
4. En `payment_failed`:
   - Actualizar `Purchase.status` a `failed`.

### Pruebas en desarrollo

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

---

## 9. Seguridad

| Medida | Detalle |
|---|---|
| Stripe Elements | Los datos de tarjeta nunca tocan el servidor. Stripe los tokeniza directamente. |
| Webhook signature | Stripe firma cada evento con `STRIPE_WEBHOOK_SECRET`. Se valida con `constructEvent()`. |
| Idempotencia | Cada `Purchase` tiene `stripePiId @unique`. Si Stripe envía el mismo evento dos veces, la BD lo rechaza. |
| Precios en servidor | Los montos se definen en `lib/pricing.ts`, no se aceptan del cliente. |
| CORS | No aplica (mismo dominio). |

---

## 10. Orden de implementación

```
 1. Crear modelo Purchase + migración
 2. Definir SC_PACKAGES en lib/pricing.ts
 3. lib/stripe.ts (inicializar Stripe cliente)
 4. GET /api/stripe/packages
 5. POST /api/stripe/create-payment
 6. POST /api/webhooks/stripe (procesar succeeded + failed)
 7. Frontend: PackageCard + StripeCheckout
 8. Frontend: /tienda/recargar page
 9. GET /api/stripe/history (opcional)
10. Saldo clickeable + banner en ShopContent (enlace a /tienda/recargar)
11. Enlace "Recargar" en Navbar
```

## 11. Tiempo estimado

| Paso | Estimación |
|---|---|
| 1-3 (Modelo + configuración) | 1h |
| 4-6 (APIs Stripe + Webhook) | 3h |
| 7-8 (Frontend recarga) | 2h |
| 9-11 (Historial + Navbar + banner) | 1h |
| **Total** | **~7h** |
