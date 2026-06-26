# Auditoría de Optimización y Calidad de Código

---

## Resumen de Tamaño

| Área | Archivos | Líneas | Proporción |
|------|----------|--------|------------|
| shared/game | 40 | ~3.516 | 31% |
| client | 38 | ~5.272 | 46% |
| server | 4 | 302 | 3% |
| tests | 9 | 2.177 | 19% |
| **Total** | **91** | **~11.354** | 100% |

---

## 1. Código Duplicado

### 1.1 Patrón "other player" (card.ts)
`const other = playerId === 'p1' ? 'p2' : 'p1'` aparece en **5 líneas** (185, 189, 193, 197, 204) — cada case de `applyCardEffect()` para DEBUFFs.

**Sugerencia**: Extraer a `getOpponent(playerId: string): string`.

### 1.2 Guard `if (!targetId) return state;` (card.ts)
Aparece en 3 lugares (líneas 146, 158, 198) — mismos cases `ataque_extra`, `precision`, `confusion`.

### 1.3 State spread para mano (card.ts)
```typescript
{ ...state, players: { ...state.players, [action.playerId]: { ...player, cardsInHand: newHand } } }
```
Este patrón de 3 niveles de spread aparece **10+ veces** (líneas 264, 273, 293, 305, 312, 113, 126, 150, 162, 177, 216, 279, 318, 343).

**Sugerencia**: Crear `updatePlayerHand(state, playerId, newHand)`.

### 1.4 Tailwind CSS repetido en client/prep/
Clases idénticas en múltiples componentes:
- `"bg-zinc-800 border border-zinc-600 rounded-lg"` — 5+ componentes
- `"bg-blue-600 hover:bg-blue-500 transition text-white px-8 py-3 rounded-lg text-lg font-semibold cursor-pointer"` — 3 componentes
- `"text-zinc-400 text-sm"` — 4 componentes
- Patrón `🛡️ + nombre identidad` — 5 componentes

**Sugerencia**: Extraer a componentes comunes (Button, Card, Panel) para reducir CSS duplicado.

### 1.5 Action handler guards (actions/*.ts)
Cada handler empieza con:
```typescript
if (action.type !== 'SOME_TYPE') return state;
if (state.gamePhase !== 'GAME') return state;
```

**Sugerencia**: Mover validaciones comunes al reducer central.

---

## 2. Problemas de Arquitectura

### 2.1 HexBoard.tsx: 1.165 líneas
El componente más grande del proyecto. Mezcla lógica de:
- Generación SVG del tablero
- Interacción (click, hover)
- Zoom/pan
- Selección de unidades
- Destacado de hexágonos

**Sugerencia**: Dividir en `HexBoard.tsx` (coordinador) + `HexGrid.tsx` (grid SVG) + `HexInteraction.tsx` (eventos) + `HexHighlights.tsx` (overlays).

### 2.2 ability.ts: 537 líneas
25% del total de `shared/game/actions/`. Maneja 8 habilidades activas + identidades en un solo archivo.

**Sugerencia**: Dividir por tipo: `ability-caballeria.ts`, `ability-infanteria.ts`, etc. O mejor: estructura data-driven con handlers registrables (como ya se hace con `ABILITY_EFFECTS` para combate).

### 2.3 State completo en cada acción (server)
El servidor envía el estado completo del juego tras cada acción. Para partidas largas con muchos `attackResults`, esto crece.

**Sugerencia**: Enviar solo el parche (acción aplicada) y permitir que el cliente la replayee, o enviar solo campos modificados.

### 2.4 Dependencia de índice de array (init.ts)
`effectDeck.slice(0, 2)` y `identityDeck.slice(0, 3)` asumen orden del shuffle. Si se cambia la semilla o el algoritmo, el reparto cambia. No es un bug, pero hace los tests frágiles.

---

## 3. Bugs Conocidos (de docs/análisis.md y observación)

| Archivo | Problema | Impacto |
|---------|----------|---------|
| `movementRange.ts` | Referencia `unit.movement` que no existe; el tipo tiene `movementCost` | ❌ No funciona |
| `HexBoard.tsx` | `myPlayerId = 'p1'` hardcodeado | ❌ Jugador 2 no puede interactuar |
| `reducer.ts` | Dificultad de ataque usa `target.difficulty` entero, pero arqueros deberían ser `6 + distancia` | ⚠️ Dificultad incorrecta para arqueros |

---

## 4. Rendimiento

### 4.1 Cálculos O(n) en cada ataque
`applyDamageAbilities()` y `applyDefenseAbilities()` iteran sobre todas las habilidades del atacante y defensor en cada ataque. Para arrays de ~5 habilidades, es aceptable, pero el patrón se repite 4 veces por ataque (difficulty, damage, defense, postHit).

### 4.2 Búsqueda de unidades O(n²) en ability-effects
```typescript
Object.values(ctx.state.units).some(u => u.owner === ctx.defender.owner ...)
```
Esto aparece en Cazadores (Acechar) y Espartano (Muro espartano). Para 26 unidades es irrelevante, pero es mejor usar un lookup por owner.

### 4.3 getModifierSum itera activeModifiers
`getModifierSum()` recorre el array de modificadores activos. Sin índices, es O(n) por llamada — y se llama 4-5 veces por ataque.

---

## 5. Tipado

### 5.1 `PlayerId` es `string` (state.ts)
```typescript
export type PlayerId = string;
```
Debería ser un literal union: `'p1' | 'p2'`. Esto causó el patrón repetitivo `playerId === 'p1' ? 'p2' : 'p1'` en lugar de una función tipada.

### 5.2 `UnitClass` no se usa en state.ts
Aunque `stats.ts` define `UnitClass`, `state.ts` define la unión inline: `class: 'archer' | 'infantry' | 'lancer' | 'cavalry' | 'general'`. Son dos definiciones del mismo tipo.

### 5.3 `Card.effect` definido pero no usado
```typescript
export type Card = {
    ...
    effect: (state: GameState, playerId: PlayerId) => GameState;
}
```
Este tipo está definido en `state.ts:199-207` pero las cartas no se representan como tipo `Card` — se manejan como `CardId` strings y templates en `card.ts`.

---

## 6. Tests

| Problema | Detalle |
|----------|---------|
| Sin framework | Usa `tsx src/test/main.ts` ad-hoc, sin Jest/Vitest |
| 56 tests fallan | 20.5% de tasa de fallo |
| Sin CI | No hay script de CI configurado |
| Sin cobertura | No hay medición de code coverage |

---

## Recomendaciones Prioritarias

1. 🔴 **Fix bugs conocidos**: movementRange, HexBoard hardcode, archer difficulty
2. 🔴 **Extraer `getOpponent(playerId)`** — elimina duplicación en card.ts
3. 🟡 **Extraer `updatePlayerHand()`** — elimina 10+ spreads en card.ts
4. 🟡 **Dividir HexBoard.tsx** (1.165 líneas → 3-4 componentes)
5. 🟡 **Dividir ability.ts** (537 líneas → archivos por tipo)
6. 🟡 **Instalar Vitest y migrar tests**
7. 🟢 **Centralizar estilos Tailwind** en componentes comunes
8. 🟢 **Tipar PlayerId como literal union**
