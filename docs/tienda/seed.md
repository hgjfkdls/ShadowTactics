[docs](../docs.md) > [tienda](./docs.md) > seed

# Seed de cosméticos

Script de seed para desarrollo con 40 cosméticos iniciales.

## Tableros

| Nombre | Tipo | Rareza | Precio | attributes |
|---|---|---|---|---|
| Tablero Clásico | BOARD | COMMON | 0 (gratis) | `{ boardTheme: "CLASSIC", hexStyle: "GRASS" }` |
| Tablero Bosque Encantado | BOARD | RARE | 80 | `{ boardTheme: "ENCHANTED_FOREST", hexStyle: "STONE" }` |
| Tablero Desierto | BOARD | RARE | 80 | `{ boardTheme: "DESERT", hexStyle: "SAND" }` |
| Tablero Volcán | BOARD | EPIC | 200 | `{ boardTheme: "VOLCANO", hexStyle: "LAVA" }` |
| Tablero Reino Helado | BOARD | EPIC | 200 | `{ boardTheme: "ICE", hexStyle: "ICE" }` |
| Tablero Ciudad Flotante | BOARD | LEGENDARY | 500 | `{ boardTheme: "FLOATING_CITY", hexStyle: "CLOUD" }` |
| Tablero Cementerio Maldito | BOARD | LEGENDARY | 500 | `{ boardTheme: "CEMETERY", hexStyle: "DARK_STONE" }` |

## Skins de unidad

| Nombre | Tipo | Rareza | Precio | attributes |
|---|---|---|---|---|
| Arquero Élfico | SKIN | COMMON | 25 | `{ unitClass: "ARCHER" }` |
| Arquero Oscuro | SKIN | RARE | 100 | `{ unitClass: "ARCHER" }` |
| Arquero Fantasma | SKIN | EPIC | 250 | `{ unitClass: "ARCHER" }` |
| Arquero Steampunk | SKIN | EPIC | 250 | `{ unitClass: "ARCHER" }` |
| Arquero Infernal | SKIN | LEGENDARY | 600 | `{ unitClass: "ARCHER" }` |
| Infante Imperial | SKIN | RARE | 100 | `{ unitClass: "INFANTRY" }` |
| Caballero Oscuro | SKIN | EPIC | 250 | `{ unitClass: "CAVALRY" }` |
| Lancero del Abismo | SKIN | EPIC | 250 | `{ unitClass: "LANCER" }` |
| General Celestial | SKIN | LEGENDARY | 600 | `{ unitClass: "GENERAL" }` |

## Armas

| Nombre | Tipo | Rareza | Precio | attributes |
|---|---|---|---|---|
| Arco de Cristal | WEAPON | RARE | 60 | `{ unitClass: "ARCHER" }` |
| Arco de Fuego | WEAPON | EPIC | 180 | `{ unitClass: "ARCHER" }` |
| Arco de Hueso | WEAPON | RARE | 60 | `{ unitClass: "ARCHER" }` |
| Arco de Energía | WEAPON | EPIC | 180 | `{ unitClass: "ARCHER" }` |
| Flechas Luminosas | WEAPON | COMMON | 20 | `{ unitClass: "ARCHER" }` |

## Clima

| Nombre | Tipo | Rareza | Precio | attributes |
|---|---|---|---|---|
| Lluvia | CLIMATE | RARE | 90 | `{ precipitation: "RAIN", intensity: 0.5 }` |
| Nieve | CLIMATE | EPIC | 200 | `{ precipitation: "SNOW", intensity: 0.5 }` |
| Hojas de Otoño | CLIMATE | COMMON | 30 | `{ precipitation: "LEAVES", intensity: 0.3 }` |
| Cenizas Volcánicas | CLIMATE | EPIC | 200 | `{ precipitation: "ASH", intensity: 0.4 }` |
| Aurora Boreal | CLIMATE | LEGENDARY | 450 | `{ precipitation: "AURORA", intensity: 1.0 }` |

## Perfil

| Nombre | Tipo | Rareza | Precio | attributes |
|---|---|---|---|---|
| Marco Bronce | PROFILE_FRAME | COMMON | 15 | `{ frameStyle: "STATIC" }` |
| Marco Plata | PROFILE_FRAME | COMMON | 20 | `{ frameStyle: "STATIC" }` |
| Marco Oro | PROFILE_FRAME | RARE | 70 | `{ frameStyle: "STATIC" }` |
| Marco Diamante | PROFILE_FRAME | EPIC | 200 | `{ frameStyle: "ANIMATED", particles: true }` |
| Marco Legendario | PROFILE_FRAME | LEGENDARY | 500 | `{ frameStyle: "ANIMATED", particles: true }` |
| Título Arquero Maestro | TITLE | RARE | 80 | `{ displayText: "Arquero Maestro" }` |
| Título General | TITLE | RARE | 80 | `{ displayText: "General" }` |
| Título Estratega Supremo | TITLE | EPIC | 200 | `{ displayText: "Estratega Supremo" }` |
| Título Guardián del Reino | TITLE | LEGENDARY | 350 | `{ displayText: "Guardián del Reino" }` |

## Social

| Nombre | Tipo | Rareza | Precio | attributes |
|---|---|---|---|---|
| Saludo | EMOTE | COMMON | 25 | `{ animation: "WAVE", sound: "greeting.wav" }` |
| Aplauso | EMOTE | COMMON | 25 | `{ animation: "CLAP", sound: "clap.wav" }` |
| Burla | EMOTE | RARE | 60 | `{ animation: "TAUNT", sound: "taunt.wav" }` |
| Dragón Pequeño | PET | EPIC | 220 | `{ model: "DRAGON", scale: 0.5 }` |
| Zorro Mágico | PET | EPIC | 220 | `{ model: "FOX", scale: 0.6 }` |

## Descuentos de ejemplo

Se añaden 4 cosméticos con descuento activo (vigentes hasta fin de mes):

| ID | % descuento |
|---|---|
| `board-volcano` | 25% |
| `skin-archer-infernal` | 30% |
| `climate-aurora` | 20% |
| `frame-gold` | 50% |

### Código

```typescript
const discounts = [
    { id: 'board-volcano', discountPercent: 25, discountEndsAt: endOfMonth },
    { id: 'skin-archer-infernal', discountPercent: 30, discountEndsAt: endOfMonth },
    { id: 'climate-aurora', discountPercent: 20, discountEndsAt: endOfMonth },
    { id: 'frame-gold', discountPercent: 50, discountEndsAt: endOfMonth },
];

for (const d of discounts) {
    await prisma.cosmetic.update({
        where: { id: d.id },
        data: { discountPercent: d.discountPercent, discountEndsAt: d.discountEndsAt },
    });
}
```
