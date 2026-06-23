[docs](../../docs.md) > [arquitectura](../docs.md) > [fases](./docs.md) > simulacion_mov

[volver](./docs.md) | [prev](./simulacion.md)

# Simulación de movimiento

Escenarios que recorren los caminos del validador y cálculo de coste de `MOVE_UNIT` según `05-movimiento.md`. Cada escenario parte del mismo setup base.

## Setup base

```
gamePhase: GAME
activePlayer: p1
turnPhase: MAIN
PA: 10
```

| Unidad | Dueño | Posición | movementCost | Clase |
|--------|-------|----------|-------------|-------|
| u1 | p1 | (0, 0) | 2 | archer |
| u2 | p1 | (2, 0) | 1 | cavalry |
| u3 | p2 | (4, 0) | 1 | infantry |
| u4 | p2 | (3, 1) | 1 | cavalry |

---

## Escenario 1 — Movimiento normal (coste = movementCost)

**Setup**: u1 (movementCost 2) en (0,0), PA = 10.

| Paso | Fase | Acción | PA antes | PA después | Estado |
|------|------|--------|----------|------------|--------|
| 1 | MAIN | `MOVE_UNIT` (u1 → {q:1,r:0}) | 10 | 8 | u1 en (1,0), movedThisTurn=true, didMovePreviousTurn=true |

**Coste**: movementCost(2) + sin modificadores = **2 PA**. ✅

---

## Escenario 2 — Movilidad (SET movementCost a 0)

**Setup**: u1 (movementCost 2) en (0,0), PA = 10. Modificador activo `{ stat: 'movementCost', value: 0, operator: 'SET', remainingUses: 1 }`.

| Paso | Fase | Acción | PA antes | PA después | Estado |
|------|------|--------|----------|------------|--------|
| 1 | MAIN | `MOVE_UNIT` (u1 → {q:1,r:0}) | 10 | 10 | u1 en (1,0), coste 0 PA |

**Coste**: movementCost(2) → SET 0 → **0 PA**. El modificador se consume tras el movimiento.

---

## Escenario 3 — Pantano (MUL movementCost × 2)

**Setup**: u1 (movementCost 2) en (0,0), PA = 10. Modificador activo `{ stat: 'movementCost', value: 2, operator: 'MUL', remainingUses: 1 }`.

| Paso | Fase | Acción | PA antes | PA después | Estado |
|------|------|--------|----------|------------|--------|
| 1 | MAIN | `MOVE_UNIT` (u1 → {q:1,r:0}) | 10 | 6 | u1 en (1,0) |

**Coste**: movementCost(2) → MUL 2 → **4 PA**. El modificador se consume tras el movimiento.

---

## Escenario 4 — Fuego de cobertura (hasMovementPenalty × 2)

**Setup**: u2 (movementCost 1) en (2,0), PA = 10. `hasMovementPenalty = true` (recibió Fuego de cobertura).

| Paso | Fase | Acción | PA antes | PA después | Estado |
|------|------|--------|----------|------------|--------|
| 1 | MAIN | `MOVE_UNIT` (u2 → {q:3,r:0}) | 10 | 8 | u2 en (3,0) |

**Coste**: movementCost(1) → hasMovementPenalty → ×2 → **2 PA**.

---

## Escenario 5 — Pantano + Fuego de cobertura (acumulados)

**Setup**: u2 (movementCost 1) en (2,0), PA = 10. `hasMovementPenalty = true`. Modificador `{ stat: 'movementCost', value: 2, operator: 'MUL', remainingUses: 1 }`.

| Paso | Fase | Acción | PA antes | PA después | Estado |
|------|------|--------|----------|------------|--------|
| 1 | MAIN | `MOVE_UNIT` (u2 → {q:3,r:0}) | 10 | 6 | u2 en (3,0) |

**Coste**: movementCost(1) → hasMovementPenalty(×2) → 2 → MUL 2 → **4 PA**.

---

## Escenario 6 — PA insuficiente

**Setup**: u1 (movementCost 2) en (0,0), PA = 1.

| Paso | Fase | Acción | PA antes | PA después | Estado |
|------|------|--------|----------|------------|--------|
| 1 | MAIN | `MOVE_UNIT` (u1 → {q:1,r:0}) | 1 | 1 | Rechazado, u1 sigue en (0,0) |

**Motivo**: `ap (1) < cost (2)`. ✅

---

## Escenario 7 — Hex destino ocupado

**Setup**: u1 (movementCost 2) en (0,0), u3 (p2) está en (1,0), PA = 10.

| Paso | Fase | Acción | PA antes | PA después | Estado |
|------|------|--------|----------|------------|--------|
| 1 | MAIN | `MOVE_UNIT` (u1 → {q:1,r:0}) | 10 | 10 | Rechazado, hex ocupado por u3 |

---

## Escenario 8 — Fuera del mapa

**Setup**: u1 (movementCost 2) en (0,0), PA = 10.

| Paso | Fase | Acción | PA antes | PA después | Estado |
|------|------|--------|----------|------------|--------|
| 1 | MAIN | `MOVE_UNIT` (u1 → {q:10,r:0}) | 10 | 10 | Rechazado, fuera de `isWithinBounds` |

---

## Resumen de costes

| Escenario | movementCost | Modificador | hasMovementPenalty | Coste final |
|-----------|-------------|-------------|-------------------|-------------|
| 1 — Normal | 2 | — | no | **2** |
| 2 — Movilidad | 2 | SET 0 | no | **0** |
| 3 — Pantano | 2 | MUL 2 | no | **4** |
| 4 — Fuego cob. | 1 | — | sí | **2** |
| 5 — Pantano + Fuego | 1 | MUL 2 | sí | **4** |

## Consistencia con código

Cada escenario se trazó contra `move.ts`:

| Escenario | Validación | Código | Línea |
|-----------|-----------|--------|-------|
| 1 | coste base | `getMovementCost(unit, to)` | `move.ts:28` |
| 2 | SET 0 → cost = 0 | `if (m.operator === 'SET') cost = m.value` | `move.ts:37` |
| 3 | MUL 2 → cost ×= 2 | `if (m.operator === 'MUL') cost *= m.value` | `move.ts:39` |
| 4 | hasMovementPenalty → ×2 | `cost *= 2` | `move.ts:29-31` |
| 5 | penalidad + MUL acumulados | se aplican en secuencia | `move.ts:29-39` |
| 6 | PA insuficiente | `if (ap < cost) return state` | `move.ts:41` |
| 7 | hex ocupado | `isHexOccupied(state, to, unit.id)` | `move.ts:25` |
| 8 | fuera del mapa | `isWithinBounds(to, state.map.radius)` | `move.ts:23` |
