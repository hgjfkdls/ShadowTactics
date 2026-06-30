[docs](../docs.md) > [tienda](./docs.md) > modelos

# Modelos de datos — Tienda de cosméticos

## Modelos nuevos en Prisma

```prisma
enum CosmeticType {
    SKIN
    WEAPON
    BOARD
    HEX_VARIANT
    CLIMATE
    LIGHTING
    PROFILE_FRAME
    AVATAR
    PROFILE_BACKGROUND
    TITLE
    EMOTE
    QUICK_MESSAGE
    REACTION
    LOADING_SCREEN
    CURSOR
    UI_THEME
    MENU_BACKGROUND
    ANIMATION_MOVEMENT
    ANIMATION_ELIMINATION
    ANIMATION_SUMMON
    PET
    COMPANION
    BANNER
}

enum Rarity {
    COMMON
    RARE
    EPIC
    LEGENDARY
}

enum TransactionType {
    EARN
    SPEND
}
```

```prisma
model Cosmetic {
    id             String        @id @default(uuid())
    name           String
    description    String
    type           CosmeticType
    rarity         Rarity        @default(COMMON)
    imageUrl       String
    price          Int
    discountPercent Int          @default(0)     // 0 = sin descuento, 1-100 = % de descuento
    discountEndsAt DateTime?                      // null = sin fecha límite; si pasó la fecha, el descuento expira
    attributes     Json          @default("{}")
    createdAt      DateTime      @default(now())
    users          UserCosmetic[]
}

model UserCosmetic {
    userId     String
    cosmeticId String
    equipped   Boolean   @default(false)
    equippedAt DateTime?

    user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    cosmetic Cosmetic @relation(fields: [cosmeticId], references: [id], onDelete: Cascade)

    @@id([userId, cosmeticId])
}

model Transaction {
    id        String          @id @default(uuid())
    userId    String
    amount    Int             // Positivo = ganancia, Negativo = gasto
    type      TransactionType
    concept   String          // "Partida completada:{gameId}", "Compra: Tablero Nocturno"
    createdAt DateTime        @default(now())
    user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Modificación al modelo `User`

```prisma
model User {
    // ... campos existentes ...
    coins        Int            @default(0)
    cosmetics    UserCosmetic[]
    transactions Transaction[]
}
```

## Campos `attributes` por tipo — ejemplos

| CosmeticType | Ejemplo `attributes` |
|---|---|
| `SKIN` | `{ "unitClass": "ARCHER", "unitSlot": "skin_1" }` |
| `WEAPON` | `{ "unitClass": "ARCHER", "weaponSlot": "bow" }` |
| `BOARD` | `{ "boardTheme": "ENCHANTED_FOREST", "hexStyle": "STONE" }` |
| `HEX_VARIANT` | `{ "hexStyle": "MARBLE", "hexMaterial": "stone" }` |
| `CLIMATE` | `{ "precipitation": "SNOW", "intensity": 0.5 }` |
| `LIGHTING` | `{ "timeOfDay": "NIGHT", "lightColor": "#1a1a2e" }` |
| `PROFILE_FRAME` | `{ "frameStyle": "ANIMATED", "particles": true }` |
| `AVATAR` | `{ "character": "ARCHER", "variant": "GOLDEN" }` |
| `PROFILE_BACKGROUND` | `{ "scene": "CASTLE", "parallax": false }` |
| `TITLE` | `{ "displayText": "Arquero Maestro" }` |
| `EMOTE` | `{ "animation": "WAVE", "sound": "greeting.wav" }` |
| `QUICK_MESSAGE` | `{ "message": "Buena jugada", "sound": "goodplay.wav" }` |
| `REACTION` | `{ "effect": "EXPLOSION", "duration": 2.0 }` |
| `LOADING_SCREEN` | `{ "artwork": "concept_1", "animated": false }` |
| `CURSOR` | `{ "cursorType": "SWORD", "hotspotX": 16, "hotspotY": 16 }` |
| `UI_THEME` | `{ "themeName": "MEDIEVAL", "primaryColor": "#8b4513" }` |
| `MENU_BACKGROUND` | `{ "scene": "CAMP", "ambientSound": "campfire.wav" }` |
| `ANIMATION_MOVEMENT` | `{ "effect": "TELEPORT", "particles": "magic" }` |
| `ANIMATION_ELIMINATION` | `{ "effect": "EXPLOSION_MAGIC", "sound": "explosion.wav" }` |
| `ANIMATION_SUMMON` | `{ "effect": "PORTAL", "particles": "celestial" }` |
| `PET` | `{ "model": "DRAGON", "scale": 0.5, "animations": ["idle", "fly"] }` |
| `COMPANION` | `{ "model": "FOX", "scale": 1.0, "hover": true }` |
| `BANNER` | `{ "bannerStyle": "REALM", "flagShape": "triangular" }` |

## Reglas de equipamiento

- Solo un cosmético de cada `CosmeticType` puede estar equipado a la vez.
- Al equipar uno nuevo del mismo tipo, el anterior se desequipa automáticamente.
- La excepción son `SKIN` y `WEAPON`, que se equipan por unidad (`unitClass`). Se puede tener una skin diferente para cada clase, y un arma diferente para cada clase.

## Consideraciones adicionales

- Los modelos se añaden a `prisma/schema.prisma`.
- Generar migración con `npx prisma migrate dev --name add_cosmetics`.
- El campo `attributes` permite añadir nuevos tipos de cosméticos sin migraciones estructurales.
