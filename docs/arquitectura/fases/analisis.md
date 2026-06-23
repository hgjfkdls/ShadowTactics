[docs](../../docs.md) > [arquitectura](../docs.md) > [fases](./docs.md) > analisis

[volver](./docs.md) | [prev](./simulacion_mov.md)

# Análisis de consistencia: fases/

Evaluación de cada documento en `docs/arquitectura/fases/` contra `docs/game/`, `src/shared/game/` y `src/test/`.

---

## Resumen

| Documento | Elementos | ✅ Consistentes | ⚠️ Inconsistencias menores | 🔴 Inconsistencias |
|-----------|-----------|----------------|---------------------------|-------------------|
| 01-identidad.md | 4 | 4 | — | — |
| 02-dados.md | 4 | 4 | — | — |
| 03-despliegue.md | 5 | 5 | — | — |
| 04-0-flujo-del-juego.md | 4 | 4 | — | — |
| 04-1-draw.md | 5 | 4 | 1 | — |
| 04-2-main.md | 3 | 3 | — | — |
| 04-3-counter.md | 4 | 4 | — | — |
| 05-movimiento.md | 6 | 6 | — | — |
| 06-combate.md | 8 | 8 | — | — |
| 07-cartas.md | 6 | 6 | — | — |
| 08-habilidades.md | 6 | 6 | — | — |
| 09-modificadores.md | 5 | 5 | — | — |
| 10-fin-del-juego.md | 3 | 3 | — | — |
| simulacion.md | 6 | 6 | — | — |
| simulacion_mov.md | 8 | 8 | — | — |

> 07-cartas.md fue analizado y corregido en una iteración previa; está alineado.

---

## 01-identidad.md — Fase IDENTITY_SELECTION

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Lista de 15 cartas de identidad | ✅ Consistente | — | — |
| Construcción del mazo (`buildIdentityDeck`) | ✅ Consistente | — | — |
| Flujo SELECT_IDENTITY (reparto, selección, revelación) | ✅ Consistente | — | — |
| Referencias a handlers (`identity.ts`, `card.ts`, `init.ts`) | ✅ Consistente | — | — |

---

## 02-dados.md — Fase ROLL

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Tirada 2d6 (rango 2–12) | ✅ Consistente | — | — |
| Flujo con empate → reset | ✅ Consistente | — | — |
| deploymentOrder / activePlayer según puntuación | ✅ Consistente | — | — |
| Referencia a `roll.ts`, `rng.ts` | ✅ Consistente | — | — |

---

## 03-despliegue.md — Fase DEPLOYMENT

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Patrón 1-2-2-2-2-2-2-1 (12 pasos, 11 unidades c/u) | ✅ Consistente | — | — |
| Reglas de colocación (distancia centro, cerca aliado, clase ≤ 3, general) | ✅ Consistente | — | — |
| Validaciones (hex ocupado, fuera mapa, turno) | ✅ Consistente | — | — |
| Transición a GAME con `applyTurnStart` | ✅ Consistente | — | — |
| Referencias a `deployment.ts`, `factory.ts`, `stats.ts` | ✅ Consistente | — | — |

---

## 04-0-flujo-del-juego.md — Flujo general

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| DRAW → (DISCARD si mano > 3) → MAIN → COUNTER → MAIN | ✅ Consistente | — | — |
| USE_CARD desencadena COUNTER | ✅ Consistente | — | — |
| END_TURN → DRAW del siguiente | ✅ Consistente | — | — |
| Referencias a sub-docs y handlers | ✅ Consistente | — | — |

---

## 04-1-draw.md — Subfase DRAW

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| `applyTurnStart()`: PA, robo, modificadores | ✅ Consistente | — | — |
| Límite de mano 3 → pool de 4 → DISCARD_CARD manual | ✅ Consistente | — | — |
| `resetUnitTracking()` (flags listados) | ✅ Consistente | — | — |
| Cálculo de PA = min(5 + carryOver, 8) | ✅ Consistente | — | — |
| Solo DISCARD_CARD permitido mientras mano > 3 | ✅ Consistente | — | — |
| `resetUnitTracking()` incluye `didMovePreviousTurn` ? | ⚠️ | Doc lista `didMovePreviousTurn: false` (line 49) pero `resetUnitTracking()` en código no lo incluye (se preserva entre turnos). | Baja: limpiar doc o añadir nota aclaratoria |

---

## 04-2-main.md — Subfase MAIN

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Acciones disponibles (MOVE, ATTACK, ABILITY, CARD, END_TURN) | ✅ Consistente | — | — |
| Bucle de acciones con recursos | ✅ Consistente | — | — |
| Referencias a handlers | ✅ Consistente | — | — |

---

## 04-3-counter.md — Subfase COUNTER

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Flujo USE_CARD → COUNTER → PASS / Ladrón / Espejo / Panacea → MAIN | ✅ Consistente | — | — |
| Restricción: `PASS_COUNTER` solo para rival (`playerId !== activePlayer`) | ✅ Consistente | — | — |
| Panacea disponible solo para el rival durante COUNTER | ✅ Consistente | — | — |
| Ladrón/Espejo solo para el rival | ✅ Consistente | — | — |

---

## 05-movimiento.md — Acción MOVE_UNIT

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Validaciones (turno, unidad, bloqueo, distancia, hex ocupado, PA) | ✅ Consistente | — | — |
| Cálculo de coste (movementCost + penalidad + modificadores SET/ADD/MUL) | ✅ Consistente | — | — |
| Ciclo de flags `movedThisTurn` / `didMovePreviousTurn` | ✅ Consistente | — | — |
| Modificadores relevantes (Movilidad, Pantano, Confusión, Fuego cobertura) | ✅ Consistente | — | — |
| Referencia a `move.ts` | ✅ Consistente | — | — |
| Referencia a subfase `MAIN` (sin `ACTION`) | ✅ Consistente | — | — |

---

## 06-combate.md — Acción ATTACK_UNIT + Resolución

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Validaciones (turno, rango, PA, objetivo enemigo) | ✅ Consistente | — | — |
| Cálculo de dificultad (getDifficulty + hooks + modificadores) | ✅ Consistente | — | — |
| Cálculo de daño (base + crítico + carga + hooks + modificadores) | ✅ Consistente | — | — |
| Pasivas de defensa (Resistencia, Línea defensiva, Romper filas) | ✅ Consistente | — | — |
| Contraataque (2 de daño si falla y defensor en rango) | ✅ Consistente | — | — |
| Efectos post-daño (formación defensiva, presión, tracking) | ✅ Consistente | — | — |
| Cálculo de coste (getAttackCost + onCost hooks + attackCost modifiers) | ✅ Consistente | — | — |
| Sistema data-driven (CombatResult, hooks onCost/onDifficulty/onDamage/onDefense/onPostHit) | ✅ Consistente | — | — |

---

## 07-cartas.md — Sistema de cartas + Fase COUNTER

Analizado y corregido en iteración previa. Pendientes:

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| drawCard + DISCARD_CARD manual | ✅ Corregido | — | — |
| turnPhase post-COUNTER: MAIN (no ACTION) | ✅ Corregido | — | — |
| Restricción COUNTER: solo rival | ✅ Corregido | — | — |
| sourcePlayerId semántica aclarada | ✅ Corregido | — | — |
| Inspiración de tropa en tabla de tipos | ✅ Corregido | — | — |
| Ladrón: filtrado redundante eliminado | ✅ Corregido | — | — |

---

## 08-habilidades.md — Habilidades (USE_ABILITY)

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Arquitectura (ABILITIES, CLASS_ABILITIES, createUnit) | ✅ Consistente | — | — |
| Pasivas (7): tabla con hooks y efectos | ✅ Consistente | — | — |
| Activas (8): tabla con coste, requisitos, efecto | ✅ Consistente | — | — |
| Restricciones por flag y exclusión mutua | ✅ Consistente | — | — |
| Referencias a handlers y datos | ✅ Consistente | — | — |
| Referencia a subfase `MAIN` (sin `ACTION`) | ✅ Consistente | — | — |

---

## 09-modificadores.md — Sistema ModifierInstance

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Estructura `ModifierInstance` | ✅ Consistente | — | — |
| Operadores ADD / MUL / SET | ✅ Consistente | — | — |
| Estadísticas modificables y ciclo de vida | ✅ Consistente | — | — |
| `remainingTurns` comentario (`0` = no expira por turnos) | ✅ Consistente | — | — |
| `removePlayerDebuffs` descripción precisa | ✅ Consistente | — | — |

---

## 10-fin-del-juego.md — Fase GAME_OVER

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Disparador: muerte del general en `killUnit()` | ✅ Consistente | — | — |
| Bloqueo de acciones en `applyAction()` | ✅ Consistente | — | — |
| Estado final (gamePhase, winner) | ✅ Consistente | — | — |

---

## simulacion.md — Simulación de flujo

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Esc. 1 — Solo acciones | ✅ Consistente | — | — |
| Esc. 2 — Carta BUFF + PASS_COUNTER | ✅ Consistente | — | — |
| Esc. 3 — Contrajuego con Ladrón | ✅ Consistente | — | — |
| Esc. 4 — Mano llena + DISCARD_CARD | ✅ Consistente | — | — |
| Esc. 5 — Dos cartas consecutivas | ✅ Consistente | — | — |
| Esc. 6 — Cartas intercaladas con acciones | ✅ Consistente | — | — |

---

## simulacion_mov.md — Simulación de movimiento

| Elemento | Nivel | Acción recomendada | Prioridad |
|----------|-------|-------------------|-----------|
| Esc. 1 — Movimiento normal | ✅ Consistente | — | — |
| Esc. 2 — Movilidad (SET 0) | ✅ Consistente | — | — |
| Esc. 3 — Pantano (MUL 2) | ✅ Consistente | — | — |
| Esc. 4 — Fuego cobertura (hasMovementPenalty) | ✅ Consistente | — | — |
| Esc. 5 — Pantano + Fuego acumulados | ✅ Consistente | — | — |
| Esc. 6 — PA insuficiente | ✅ Consistente | — | — |
| Esc. 7 — Hex ocupado | ✅ Consistente | — | — |
| Esc. 8 — Fuera del mapa | ✅ Consistente | — | — |

---

## Problemas cruzados (afectan varios docs)

| # | Problema | Docs afectados | Código | Acción |
|---|----------|---------------|--------|--------|
| 1 | `consistency.md` obsoleto: dice auto-descarte, cartas "no implementadas", y lista sistema de efecto como pendiente | `consistency.md:38,80-84,127` | Todo implementado en `card.ts`, `resolver.ts`, `engine.ts` | Actualizar consistency.md |
| 2 | `04-1-draw.md:49` lista `didMovePreviousTurn: false` en el bloque de reset, pero `resetUnitTracking()` en `turn.ts:48-63` no lo incluye (se preserva entre turnos vía `handleEndTurn`) | `04-1-draw.md` | `turn.ts:48-63` | Limpiar línea o añadir nota |

---

## Historial de cambios

| Fecha | Documento | Cambio |
|-------|-----------|--------|
| 2026-06-22 | `07-cartas.md` | drawCard: auto-descarte → manual DISCARD_CARD; turnPhase: ACTION → MAIN; restricción COUNTER solo rival; sourcePlayerId aclarado; Inspiración tropa añadida a tabla; Ladrón redundancia eliminada |
| 2026-06-22 | `state.ts` | Eliminado `'ACTION'` del tipo `turnPhase` |
| 2026-06-22 | `turn.ts` | Condición END_TURN simplificada a solo `'MAIN'` |
| 2026-06-22 | `card.ts` | Agregado bloqueo `action.playerId === state.activePlayer` durante COUNTER; eliminado filtro redundante en Ladrón |
| 2026-06-22 | `04-3-counter.md` | Panacea: "El rival o el activo" → "El rival" |
| 2026-06-22 | `game-cards.test.ts` | Tests #15 (activo bloqueado en COUNTER) y #16 (rival juega Panacea desde COUNTER) |
| 2026-06-23 | `analisis.md` | Re-verificación completa: código, docs y tests consistentes tras sesión 22-Jun. Detectados issues: `consistency.md` obsoleto, `04-1-draw.md` menciona `didMovePreviousTurn` en reset. |
