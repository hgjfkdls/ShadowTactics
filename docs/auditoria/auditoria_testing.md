# Auditoría de Testing

---

## Resumen de Tests

```
=== Resultados: 217/273 passed, 56 failed ===
```

| Suite | Tests | Pass | Fail | % Pass |
|-------|-------|------|------|--------|
| Hex Math | 23 | 23 | 0 | 100% |
| Game State Init | 24 | 24 | 0 | 100% |
| Preparation Phase | 53 | 51 | 2 | 96% |
| Game Actions | 49 | 40 | 9 | 82% |
| Abilities | 23 | 19 | 4 | 83% |
| Card Effects | 101 | 60 | 41 | 59% |
| **Total** | **273** | **217** | **56** | **79.5%** |

---

## Estructura de Tests

### Archivos

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `src/test/main.ts` | 22 | Entry point, orquesta suites |
| `src/test/shared.ts` | 32 | Funciones auxiliares compartidas |
| `src/test/test.ts` | 9 | Test básico de estado inicial |
| `src/test/hex.test.ts` | 40 | Coordenadas hexagonales |
| `src/test/game-state.test.ts` | 33 | Estado inicial |
| `src/test/game-preparation.test.ts` | 459 | Preparación (identidad, roll, deployment) |
| `src/test/game-actions.test.ts` | 568 | Acciones de juego (move, attack, end turn) |
| `src/test/game-abilities.test.ts` | 586 | Habilidades de unidad |
| `src/test/game-cards.test.ts` | 428 | Cartas de efecto |
| **Total** | **2.177** | |

### Metodología
- Sin framework de testing (no Jest, Vitest, Mocha)
- Baterías de `assert()` con try/catch para conteo
- Se ejecuta con `npx tsx src/test/main.ts`

---

## Fallos Detallados

### 1. Preparation Phase (2 fallos)

| Test | Fallo | Causa probable |
|------|-------|----------------|
| DEPLOY_UNIT class mismatch | Pool class vs placed unit class | `deployment.ts` valida clase del pool |
| Card draw count | Número de cartas robadas inicial | init.ts da 2 cartas, test espera 1 |

### 2. Game Actions (9 fallos)

| Test | Fallo | Causa probable |
|------|-------|----------------|
| END_TURN sequencing (3) | turn increment, activePlayer swap, carryOver | Lógica de transición entre turnos |
| END_TURN turn increment carry-over | carryOver calculation | Cálculo de `floor(PA/2)` |
| PASS_COUNTER discard cleanup (2) | Descarte de carta pendiente | card.ts:355-364 |
| PASS_COUNTER counter cleanup (2) | Limpieza de lastCardAction | card.ts |

### 3. Abilities (4 fallos)

| Test | Fallo | Causa probable |
|------|-------|----------------|
| Carga PA count | Coste de Carga | ability.ts: handleCarga |
| Avance occupation position (1) | Posición de ocupación tras kill | deployment/relocation |
| Doble ataque execution (1) | Flujo de doble ataque | ability.ts |
| Doble ataque PA (1) | Coste de doble ataque | ability.ts |
| Doble ataque flag (1) | Flag usedDobleAtaque no se limpia | ability.ts |

### 4. Card Effects (41 fallos — el bloque más grande)

| Grupo | Fallos | Causa |
|-------|--------|-------|
| Movilidad BUFF modifier | ~5 | Modificador no aplica como espera test |
| Ataque extra BUFF modifier | ~5 | Usa `ataqueExtraCharges`, no modifier |
| Precisión BUFF modifier | ~4 | Usa `precisionCharges`, no modifier |
| Flechas de fuego BUFF | ~4 | `dotOnHit` + `passiveDamage` |
| Inspiración de tropa BUFF | ~3 | No valida condición "general no atacado" |
| Bajar moral DEBUFF | ~3 | Modifier `ap -1` no se aplica correctamente |
| Pantano DEBUFF | ~2 | Modifier `movementCost MUL 2` |
| Mantenimiento DEBUFF | ~2 | Modifier `damage -1` |
| Confusión DEBUFF | ~2 | Usa `bloqueo` vs `blocked` |
| Miedo DEBUFF | ~3 | Modifier `attackCost +1` |
| Ladrón COUNTER | ~4 | Flujo de robo + descarte |
| Panacea COUNTER | ~3 | Eliminación de debuffs |
| Espejo COUNTER | ~4 | Reflejo al emisor |

---

## Análisis de Fallos de Cartas

### Causa raíz: Implementación alternativa a modifiers
Varias cartas BUFF (`ataque_extra`, `precision`) no usan `ModifierInstance` como describe el doc de modificadores, sino campos ad-hoc en `Unit` (`ataqueExtraCharges`, `precisionCharges`). Los tests probablemente esperan modifiers en `activeModifiers` y no los encuentran.

### Confusión usa `bloqueo` vs `blocked`
El doc de modifiers (09-modificadores.md) especifica la stat `blocked`, pero el código en `card.ts:201` usa `'bloqueo'` (español). Los tests buscan `blocked`.

---

## Cobertura de Código (estimada)

| Área | Cobertura estimada |
|------|--------------------|
| Hex math | ~90% |
| Game state init | ~80% |
| Identity selection | ~70% |
| Dice roll | ~90% |
| Deployment | ~60% |
| Movement | ~50% |
| Attack resolution | ~60% |
| Unit abilities (pasivas) | ~50% |
| Unit abilities (activas) | ~40% |
| Card effects | ~60% |
| Counter phase | ~50% |
| Modifier engine | ~50% |
| Game over | ~30% |
| **Global** | **~55%** |

---

## Problemas de Infraestructura

1. **Sin framework de testing** → No hay assertions estructuradas, mocking, spies, code coverage.
2. **Sin CI** → No se ejecutan tests automáticamente.
3. **Tests no aislados** → Comparten estado global, orden de ejecución importa.
4. **Seed fija** → Los tests usan seed 42. Si la lógica de shuffle cambia, los tests se rompen aunque la funcionalidad sea correcta.
5. **Sin tests de frontend** → 0 tests para componentes React (no hay React Testing Library).
6. **Sin tests de servidor** → 0 tests para GameRoom, Socket.IO handlers.
7. **Sin tests de regresión** → No hay tests para bugs conocidos (movementRange, HexBoard).

---

## Recomendaciones

1. 🔴 **Migrar a Vitest** — instalar `vitest`, migrar asserts a `expect()`, añadir `--coverage`.
2. 🔴 **Arreglar los 41 tests de cartas** — unificar la implementación de cartas para usar modifiers o cambiar los tests para reflejar el uso de `ataqueExtraCharges`/`precisionCharges`. Decidir cuál es el enfoque correcto.
3. 🔴 **Corregir `bloqueo` → `blocked`** en card.ts para alinear con el doc de modifiers.
4. 🟡 **Añadir tests para identidades** — cada identidad debería tener tests específicos para su Global y Especial.
5. 🟡 **Añadir test de game over** — verificar que al matar general se dispara GAME_OVER.
6. 🟡 **CI pipeline** — añadir script de CI (GitHub Actions) que ejecute `npm test`.
7. 🟢 **Tests de frontend** — añadir React Testing Library para componentes críticos (HexBoard, IdentitySelection).
8. 🟢 **Tests de servidor** — añadir tests de integración para GameRoom con Socket.IO.
