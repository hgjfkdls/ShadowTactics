[docs](../docs.md) > tienda

# Tienda de cosméticos — Shadow Tactics

Documentación completa del sistema de tienda, moneda virtual y personalización.

## Visión general

Sistema de monetización basado exclusivamente en **cosméticos y personalización visual**. Sin pay-to-win. Los jugadores ganan **ShadowCoins [SC]** al completar partidas y los gastan en personalizar su experiencia.

## Documentos

| Documento | Descripción |
|---|---|---|
| [generalidades.md](./generalidades.md) | Visión de producto: tipos de cosméticos, filosofía de monetización |
| [modelos.md](./modelos.md) | Schema Prisma: Cosmetic, UserCosmetic, Transaction, enums, attributes JSON |
| [moneda.md](./moneda.md) | Economía virtual: ganancias por partida, precios por rareza, rachas |
| [api.md](./api.md) | Endpoints: coins, shop, buy, equip, transactions |
| [frontend-tienda.md](./frontend-tienda.md) | UI de la tienda: grid, filtros, cards, compra 1 clic |
| [frontend-inventario.md](./frontend-inventario.md) | UI de inventario y equipamiento en perfil |
| [seed.md](./seed.md) | Catálogo inicial: 35 cosméticos con tipos, rarezas y precios |
| [orden.md](./orden.md) | Orden de implementación: 14 pasos, dependencias, estimación ~10h |
| [recarga-mock.md](./recarga-mock.md) | Recarga de SC simulada (mock): plan de implementación |
| [stripe.md](./stripe.md) | Stripe: pagos reales con tarjeta, paquetes de SC, webhooks |

## Resumen técnico

- **23 tipos** de cosmético (enum `CosmeticType`)
- **4 niveles** de rareza (COMMON, RARE, EPIC, LEGENDARY)
- **Atributos dinámicos** vía JSON (sin migraciones por nuevo tipo)
- **Descuentos**: sistema de promociones por tiempo limitado con badge visual, precio tachado y borde distintivo
- **Moneda única**: ShadowCoins [SC] (soft currency, no premium)
- **Compra 1 clic**: sin carrito, sin checkout
- **Equipamiento**: un cosmético activo por tipo (con reglas específicas para SKIN/WEAPON)
