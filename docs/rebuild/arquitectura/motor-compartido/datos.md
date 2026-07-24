# Sistema de Datos (Definiciones Estáticas)

## Propósito
Define los datos estáticos del juego: habilidades de clase, efectos de identidad, y metadatos de modificadores. Son configuraciones inmutables que definen el comportamiento del juego.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `data/abilities.ts` | ABILITIES (habilidades de clase), CLASS_ABILITIES (habilidades por clase) |
| `data/identities.ts` | IDENTITY_EFFECTS (15 identidades) |
| `data/modifier-config.ts` | MODIFIER_STATS (metadatos de stats de modificadores) |

### data/abilities.ts
```typescript
ABILITIES: Record<string, AbilityDef>
  // ~45 habilidades: blanco_facil, patada_acrobatica, fuego_cobertura,
  // romper_filas, cabalgar, carga, doble_ataque, meditacion, etc.
  // Cada una: id, name, type, cost, description, restrictions, requiresTarget

CLASS_ABILITIES: Record<UnitClass, string[]>
  // archer: ['blanco_facil', 'patada_acrobatica', 'fuego_cobertura']
  // cavalry: ['romper_filas', 'cabalgar', 'carga', 'doble_ataque']
  // infantry: ['puño_escudo', 'defensa_total', 'proteger']
  // lancer: ['barrido', 'defensa_ferrea', 'lanzar_red']
  // general: ['inspirar', 'orden_retirada']
```

### data/identities.ts
```typescript
IDENTITY_EFFECTS: Record<string, IdentityEffect>
  // 15 identidades: Robin Hood, Francotirador, Dios del Trueno,
  // Capitán de la Guardia, Caballos de Guerra, Cazadores,
  // Punta de Lanza, Espartano, Monje Shaolín, Comandante Supremo,
  // Corazón de Estratega, Inspiración Real, Samurái, Furia del Tirano,
  // Escudo del Comandante
  // Cada una: unitClassOverride?, abilitiesOverride?, copyStats?, statsToCopy?...
```

### data/modifier-config.ts
```typescript
MODIFIER_STATS: Record<string, ModifierStatInfo>
  // Metadatos: category (unit/player), scope (global/target),
  // allowedOperators, cleanup, description
  // Stats: attack, defense, difficulty, movementCost, attackCost,
  // actionCost, damage, dotOnHit, ap, passiveDamage, bloqueo, inmovil
```

## Dependencias
| Archivo | Dependencia | Tipo |
|---|---|---|
| `abilities.ts` | Ninguna | — |
| `identities.ts` | `./abilities` (tipo UnitClass) | Débil (solo tipo) |
| `modifier-config.ts` | Ninguna | — |

## Acoplamiento
- **Bajo**: son datos planos con dependencias mínimas
- `abilities.ts` es usado por: units/factory (CLASS_ABILITIES), phases/identity-apply, actions/ability
- `identities.ts` es usado por: phases/identity-apply
- `modifier-config.ts` es usado principalmente por la UI (no por el motor)
