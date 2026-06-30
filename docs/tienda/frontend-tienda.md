[docs](../docs.md) > [tienda](./docs.md) > frontend-tienda

# Frontend — Tienda (`/tienda`)

## URL

`/tienda`

## Layout

```
┌────────────────────────────────────────────────────────────────┐
│  🛒 Tienda                                   SC: 250  💰 │
│                                                                 │
│  [Todos] [🔥 Ofertas] [Tableros] [Unidades] [Perfil] [Social] [Colección]    │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 🖼️       │  │ 🖼️       │  │ 🖼️       │  │ 🖼️       │      │
│  │ Tablero  │  │ Fichas   │  │ Efecto   │  │ Arquero  │      │
│  │ Nocturno │  │ Doradas  │  │ Lluvia   │  │ Fantasma │      │
│  │ 🟣 RARE  │  │ 🟢 COMÚN │  │ 🔵 ÉPICO │  │ 🟠 LEG.  │      │
│  │ 80 💰    │  │ 30 💰    │  │ 180 💰   │  │ 600 💰   │      │
│  │ [Comprar]│  │ [Comprar]│  │ [Comprar]│  │ 🔒        │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
│  ┌──────────┐  ┌──────────┐                                     │
│  │ ...      │  │ ...      │                                     │
│  └──────────┘  └──────────┘                                     │
└────────────────────────────────────────────────────────────────┘
```

## Componentes

### ShopPage (`app/tienda/page.tsx`)

- **Server component** que lee la sesión.
- Si no está autenticado: redirige a `/login`.
- Renderiza `Navbar`, `Footer` y el contenido principal.

### ShopContent (client component)

- Llama a `GET /api/shop/items` al montar.
- Muestra el saldo de monedas en el header.
- Filtros por categoría (agrupación lógica):

| Grupo | Tipos incluidos |
|---|---|
| Todos | — |
| Tableros | BOARD, HEX_VARIANT, CLIMATE, LIGHTING |
| Unidades | SKIN, WEAPON, ANIMATION_MOVEMENT, ANIMATION_ELIMINATION, ANIMATION_SUMMON |
| Perfil | PROFILE_FRAME, AVATAR, PROFILE_BACKGROUND, TITLE |
| Social | EMOTE, QUICK_MESSAGE, REACTION, BANNER, PET, COMPANION |
| Colección | LOADING_SCREEN, CURSOR, UI_THEME, MENU_BACKGROUND |

- Filtro adicional por rareza (botones COMMON/RARE/EPIC/LEGENDARY).

### ShopCard (componente individual de cosmético)

#### Sin descuento

```
┌─────────────────┐
│      🖼️        │
│                 │
│  Tablero        │
│  Nocturno       │
│  🟣 RARE        │
│  80 SC          │
│ [Comprar]       │
└─────────────────┘
```

#### Con descuento activo

```
┌─────────────────┐  ← borde amarillo/anaranjado
│   🖼️      🔥-25%│  ← badge descuento (esquina sup. derecha)
│                 │
│  Tablero        │
│  Volcán         │
│  🟣 ÉPICA       │
│  150 SC  ~~200~~│  ← precio efectivo + tachado original
│ [Comprar -25%]  │  ← botón rojo
└─────────────────┘
```

**Estados del botón:**

| Estado | Botón | Comportamiento |
|---|---|---|
| No comprado, saldo suficiente | `[Comprar]` | Verde, llama a `POST /api/shop/buy` |
| No comprado, saldo insuficiente | `🔒 80 💰` | Gris deshabilitado |
| Comprado, no equipado | `✔️ Adquirido [Equipar]` | Botón "Equipar" secundario |
| Comprado y equipado | `✅ Equipado` | Badge verde, botón "Desequipar" |

### Rareza — colores sugeridos

| Rareza | Color | Badge |
|---|---|---|
| COMMON | `text-zinc-400` bg-zinc-800 | 🟢 COMÚN |
| RARE | `text-blue-400` bg-blue-950 | 🔵 RARA |
| EPIC | `text-purple-400` bg-purple-950 | 🟣 ÉPICA |
| LEGENDARY | `text-amber-400` bg-amber-950 | 🟠 LEGENDARIA |

### Modal de confirmación de compra

- Al hacer clic en "Comprar", mostrar modal:

```
┌──────────────────────────────────┐
│  Confirmar compra                │
│                                  │
│  ¿Comprar "Tablero Volcán"       │
│  por 150 SC?  (25% descuento)    │  ← si aplica descuento
│                                  │
│       [Cancelar] [Comprar]       │
└──────────────────────────────────┘
```

- Feedback visual: toast de éxito/error tras la compra.
- Si hubo descuento, el toast incluye `("X% descuento aplicado")`.
- El toast de éxito muestra el nuevo saldo.

## Archivos a crear

| Archivo | Descripción |
|---|---|
| `app/tienda/page.tsx` | Página principal de la tienda (server component) |
| `components/tienda/ShopContent.tsx` | Cliente con grid, filtros, lógica de compra |
| `components/tienda/ShopCard.tsx` | Tarjeta individual de cosmético |
| `components/tienda/RarityBadge.tsx` | Badge de rareza con color |
| `components/tienda/BuyModal.tsx` | Modal de confirmación de compra |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `components/Navbar.tsx` | Añadir enlace "Tienda" en el menú |
