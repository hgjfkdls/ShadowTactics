# Sistema de Cartas

## Propósito
Gestión completa del sistema de cartas: construcción de mazos, robo, uso de cartas (BUFF/DEBUFF/COUNTER), contraataque con cartas counter, y descarte.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `actions/card.ts` | `handleCard()`, `handlePassCounter()`, `handleDiscard()`, `drawCard()`, `buildEffectDeck()`, `buildIdentityDeck()` |
| `data/card-config/index.ts` | CARD_CONFIG: merged de todos los tipos de carta |
| `data/card-config/types.ts` | CardConfig, CardType, CardEffect |
| `data/card-config/buff.ts` | Cartas BUFF: movilidad, ataque_extra, precision, etc. |
| `data/card-config/debuff.ts` | Cartas DEBUFF: pantano, confusion, etc. |
| `data/card-config/counter.ts` | Cartas COUNTER: ladron, espejo, panacea |
| `data/card-config/handler.ts` | `applyCardEffects()`: aplicación de efectos de carta |

## Tipos de Carta
| Tipo | Descripción | Targeting |
|---|---|---|
| `BUFF` | Mejora unidades aliadas | Unidad aliada |
| `DEBUFF` | Debilita unidades enemigas | Unidad enemiga |
| `COUNTER` | Responde a una carta del oponente | Automático (sin target) |

## Flujo de Uso de Carta
```
USE_CARD → handleCard(state, action)
  │
  ├── Valida: jugador tiene la carta, fase correcta, target válido
  ├── applyCardEffects(state, cardConfig, targetId, playerId)
  │     └── Ejecuta efectos: modifierPush, stateChange, flagPush/Pop
  │         addModifier legacy, removeDebuffs, directAP, etc.
  ├── Si es COUNTER: consume la carta objetivo del oponente
  └── Descarta la carta usada
```

## Contraataque (Counter Phase)
```
Carta jugada por oponente
  │
  ▼
handleCard() detecta fase COUNTER
  │
  ▼
handlePassCounter(state, playerId)
  │  Si passa: carta del oponente se aplica
  │  Si juega counter: handleCard() con carta counter
  │  La carta counter anula/roba/refleja la carta objetivo
```

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state` | State |
| `action-types` | Acciones |
| `./utils/rng` | Utilidades |
| `./data/card-config` | Config de cartas |
| `./data/card-config/handler` | Efectos de cartas |
| `./modifiers/engine` | Modificadores |
| `@shared/i18n` | i18n |

## Acoplamiento
- **Medio**: depende de card-config, modifiers/engine, y utilidades
- `buildEffectDeck()` e `buildIdentityDeck()` son usados por init.ts para crear el estado inicial
- El handler de cartas (`data/card-config/handler.ts`) también depende de `effects/processEffects.ts`
- `card.ts` es grande (394 líneas) con múltiples responsabilidades
