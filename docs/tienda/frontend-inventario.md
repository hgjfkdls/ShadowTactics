[docs](../docs.md) > [tienda](./docs.md) > frontend-inventario

# Frontend — Inventario y equipamiento (en `/perfil`)

## Sección en perfil

Añadir una nueva sección en la página de perfil (`/perfil`) debajo de las estadísticas y el historial de partidas.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Inventario                                 [Mostrar todos] │
│                                                              │
│  [Equipados] [Tableros] [Unidades] [Perfil] [Social] [...]   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ 🖼️       │  │ 🖼️       │  │ 🖼️       │                   │
│  │ Tablero  │  │ Arquero  │  │ Marco    │                   │
│  │ Nocturno │  │ Fantasma │  │ Diamante │                   │
│  │ BOARD    │  │ SKIN     │  │ FRAME    │                   │
│  │ ✅       │  │ [Equipar]│  │ [Equipar]│                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                              │
│  ┌──────────┐  ┌──────────┐                                  │
│  │ ...      │  │ ...      │                                  │
│  └──────────┘  └──────────┘                                  │
└──────────────────────────────────────────────────────────────┘
```

## Componentes

### InventorySection (client component)

- Llama a `GET /api/shop/items` y filtra solo `owned: true`.
- Filtros por tipo (mismos grupos que la tienda).
- Pestaña "Equipados" que muestra solo los cosméticos con `equipped: true`.

### InventoryCard

Similar a `ShopCard` pero con acciones de equipar/desequipar:

| Estado | Acción |
|---|---|
| No equipado | Botón `[Equipar]` → llama a `POST /api/shop/equip` |
| Equipado | Badge `✅ Equipado` + botón `[Desequipar]` |

## API que consume

- `GET /api/shop/items` — para obtener los cosméticos del usuario con estado `owned` y `equipped`.
- `POST /api/shop/equip` — para equipar/desequipar.

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `app/perfil/page.tsx` | Añadir sección de inventario debajo del historial |
| `components/perfil/InventorySection.tsx` | Nuevo — grid de cosméticos del usuario |
| `components/perfil/InventoryCard.tsx` | Nuevo — tarjeta con acción equipar/desequipar |

## Notas

- Si el usuario no tiene cosméticos: mostrar mensaje "Aún no has adquirido cosméticos. Visita la [Tienda](/tienda)."
- El equipamiento de SKIN y WEAPON muestra la clase de unidad asociada (`Arquero`, `Infantería`, etc.).
