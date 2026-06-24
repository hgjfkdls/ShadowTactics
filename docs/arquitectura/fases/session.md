[docs](../../docs.md) > [arquitectura](../docs.md) > [fases](./docs.md) > session

# Sesión de trabajo — 22 Jun 2026

## Objetivo
Revisión y corrección de consistencia en los 15 documentos de fase, código y tests del sistema de cartas, modificadores y flujo COUNTER.

---

## 1. Análisis inicial de consistencia

Revisión de los 15 documentos de fase (`01-identidad` → `10-fin-del-juego`) generando `analisis.md` con ~71 elementos chequeados. Se encontraron 9+ inconsistencias entre docs, código y tests.

---

## 2. Correcciones fase por fase

### 04-3-counter.md — Restricción Panacea
- **Problema**: La doc permitía Panacea durante COUNTER para ambos jugadores, pero el código bloqueaba al activo.
- **Cambio**: Sección "Restricciones" actualizada: `Solo el rival puede responder con COUNTER cards. Panacea elimina debuffs del jugador que la juega.`
- **Tests**: Añadido test #15 (activo bloqueado en COUNTER) y #16 (rival juega Panacea desde COUNTER).

### 05-movimiento.md — Remanente ACTION
- **Problema**: Documento mencionaba `'ACTION'` como posible `turnPhase`, pero ese valor no existe en `turnPhase` type (solo `'DRAW' | 'MAIN' | 'COUNTER'`).
- **Cambio**: Eliminadas referencias a `'ACTION'` en el documento (secciones de acciones y handlers). `'ACTION'` era código muerto equivalente a `MAIN`.

### 08-habilidades.md — Remanente ACTION
- **Problema**: Misma inconsistencia que 05-movimiento.md.
- **Cambio**: Eliminadas referencias a `'ACTION'`.

### 09-modificadores.md — Comentarios y descripción
- **Problema 1**: Línea 18 decía `// -1 = indefinido` pero `remainingTurns` con 0 significa "no expira por turnos". Cambiado a `// 0 = no expira por turnos`.
- **Problema 2**: Línea 81, `removePlayerDebuffs` descrito como "elimina debuffs del `targetPlayerId`" pero la semántica real es "conserva los que NO afectan al playerId". Clarificado.

### state.ts — Tipo turnPhase
- **Problema**: El comentario del type `turnPhase` incluía `'ACTION'` como valor posible.
- **Cambio**: Type corregido a `'DRAW' | 'MAIN' | 'COUNTER'`.

### turn.ts — Documentación y tipos
- **Problema**: `applyTurnStart` comentado como si `'ACTION'` existiera.
- **Cambio**: Comentarios alineados con los valores reales.

### card.ts — Panacea y Espejo
- **Problema**: Panacea no validaba que `lastCardAction` existiera (podía jugarse sin carta pendiente). Espejo tenía validación correcta.
- **Cambio**: Ninguno necesario para Panacea en ese momento (validación añadida después con restricción BUFF/DEBUFF).

### game-cards.test.ts — Tests 15 y 16
- Añadidos tests para activo bloqueado en COUNTER y Panacea del rival.

---

## 3. Diagramas Mermaid — 4 issues sintácticos

Revisados 26 bloques mermaid en 13 archivos. Corregidos:

| Archivo | Línea | Problema | Fix |
|---------|-------|----------|-----|
| `04-1-draw.md` | 19 | `&gt;` HTML entity en label | `>` |
| `05-movimiento.md` | 47-48 | Nodo `D` definido como rectángulo implícito y luego como diamante | Nodo intermedio `D0` |
| `07-cartas.md` | 57 | `N{Panacea, Ladrón o Espejo?}` — comas dentro de llaves sin quotes | `N{"..."}` |
| `07-cartas.md` | 53 | `J{Rival pasa (PASS_COUNTER)?}` — paréntesis dentro de llaves sin quotes | `J{"..."}` |
| `07-cartas.md` | 61-63 | Ruta COUNTER terminaba en dead-end (R) sin volver a MAIN | `R → M` |

---

## 4. Flujo COUNTER — restricción BUFF/DEBUFF

El usuario clarificó el diseño real:

> En la práctica:
> - El jugador juega **BUFF** o **DEBUFF** en su turno (no COUNTER)
> - Si es **BUFF**: el rival solo puede jugar **Ladrón**
> - Si es **DEBUFF**: el rival puede jugar **Ladrón**, **Espejo** o **Panacea**

### Cambios en código (`src/shared/game/actions/card.ts`):
- En `handleCard()`, dentro del bloque COUNTER, validación nueva:
  - Si `pendingTemplate?.type === 'BUFF' && key !== 'ladron'` → `return state` (rechazar)
  - Si `pendingTemplate?.type === 'DEBUFF'` → cualquier COUNTER permitido

### Cambios en docs:
- `07-cartas.md`: Diagrama mermaid rediseñado 3 veces hasta quedar limpio (1 pregunta, converge, 4 opciones con etiquetas de validez). Sección "Fase COUNTER" actualizada con restricciones. Descripciones de cartas COUNTER indican contra qué son válidas.
- `04-3-counter.md`: Tabla "Acciones disponibles" con columna "Válida contra".

### Cambios en tests:
- Test 11: Antes probaba Panacea en MAIN (activo) → ahora prueba Panacea desde COUNTER (rival contra DEBUFF).
- Test 16: Antes probaba Panacea contra BUFF → ahora prueba Panacea contra DEBUFF (válido).
- Test 17 (nuevo): Espejo contra BUFF → rechazado.
- Test 18 (nuevo): Panacea contra BUFF → rechazado.

---

## 5. Inspiración de tropa — de no-op a efecto real

El usuario indicó que Inspiración de tropa debía ser el opuesto de Bajar moral:

> El efecto debiese ser el contrario de bajar la moral pero aplicado al jugador activo: `ap ADD +1`

### Cambios:
- `card.ts`: `inspiracion_tropa` cambia de `return state` a `addModifier(state, playerId, null, 'ap', 1, 'ADD', 1)`.
- `07-cartas.md`: Tabla actualizada de "Sin efecto (no-op)" a "`ap ADD +1` al jugador — 1 turno".
- `game-cards.test.ts`: Assert cambia de `activeModifiers.length === 0` a `mod.value === 1 && remainingTurns === 1`.

---

## 6. Flechas de fuego — rediseño completo

El usuario clarificó el diseño:

> La idea es que el siguiente ataque hace +1 de daño este turno, pero el target recibe 1 daño pasivo en los 2 turnos siguientes, para un total de +3 de daño extra.
> Luego: que sean 2 turnos siguientes pero solo turnos del jugador que lanza la carta.

### Diseño final:

| Momento | Daño extra | Mecanismo |
|---------|-----------|-----------|
| Próximo ataque del jugador | +1 | `damage ADD +1, 0 turns, 1 use` |
| Turno N+2 (próximo turno del jugador) | +1 al target | `passiveDamage ADD +1` procesado en `processModifiersAtTurnStart` |
| Turno N+4 (siguiente turno del jugador) | +1 al target | `passiveDamage ADD +1` se consume (2° uso) |
| **Total** | **+3** | |

### Cambios en código:

**`src/shared/game/actions/card.ts`:**
- `flechas_fuego` ahora añade dos modifiers:
  - `damage ADD +1, 0 turns, 1 use` (para el ataque)
  - `dotOnHit SET +1, 0 turns, 1 use` (marcador para aplicar DoT al golpear)

**`src/shared/game/combat/resolver.ts`:**
- Después del hit: consume `damage` modifier; si existe `dotOnHit` (y `sourcePlayerId === unit.owner`), consume el marcador y aplica `passiveDamage ADD +1` al target con `targetPlayerId = unit.owner` (el atacante), `targetUnitId = target.id`, `remainingUses = 2`.

**`src/shared/game/modifiers/engine.ts`:**
- `processModifiersAtTurnStart`: procesa `passiveDamage` donde `sourcePlayerId === playerId`, aplica `dealDamage` al target y consume un uso por tick.

### Cambios en docs:
- `07-cartas.md`: Tabla actualizada a "`damage ADD +1` (próximo ataque) + `passiveDamage ADD +1` al objetivo × 2 turnos del jugador — total +3".
- `09-modificadores.md`: Añadidas filas para `passiveDamage` y `dotOnHit`.

### Cambios en tests:
- Test 4 (Flechas de fuego): `remainingTurns === 2` → `remainingTurns === 0`, `remainingUses === undefined` → `remainingUses === 1`, añadido assert para `dotOnHit`.

---

## Resumen de archivos modificados

| Archivo | Cambios |
|---------|---------|
| `src/shared/game/actions/card.ts` | Restricción BUFF/DEBUFF en COUNTER; inspiración_tropa `ap +1`; flechas_fuego con DoT |
| `src/shared/game/combat/resolver.ts` | Consume `damage` modifier; aplica `passiveDamage` si `dotOnHit` |
| `src/shared/game/modifiers/engine.ts` | `processModifiersAtTurnStart` procesa `passiveDamage` por `sourcePlayerId` |
| `src/shared/game/state.ts` | Type `turnPhase` sin `'ACTION'` |
| `src/shared/game/phases/turn.ts` | Comentarios alineados |
| `src/test/game-cards.test.ts` | Tests 11, 16 actualizados; tests 17, 18 nuevos; test 4 flechas actualizado |
| `docs/arquitectura/fases/analisis.md` | Creado (análisis de consistencia) |
| `docs/arquitectura/fases/04-1-draw.md` | `&gt;` → `>` en mermaid |
| `docs/arquitectura/fases/04-3-counter.md` | Tabla acciones con columna "Válida contra"; restricciones actualizadas |
| `docs/arquitectura/fases/05-movimiento.md` | Remanente ACTION eliminado; mermaid nodo D duplicado corregido |
| `docs/arquitectura/fases/07-cartas.md` | Mermaid rediseñado; restricciones BUFF/DEBUFF; inspiración + flechas actualizados |
| `docs/arquitectura/fases/08-habilidades.md` | Remanente ACTION eliminado |
| `docs/arquitectura/fases/09-modificadores.md` | Comentarios + `passiveDamage`/`dotOnHit` en tabla |
| `docs/arquitectura/fases/session.md` | Este archivo |

---

## Tests

Resultado final: **263/263 passed, 0 failed**

---

# Sesión de trabajo — 23 Jun 2026

## Objetivo
Implementar pantalla de preparación (selección de identidad + tirada de dados)
y crear documentación del frontend.

---

## 1. Documentación frontend

### `docs/frontend/descripcion.md`
- Creado con especificación de las 8 pantallas del juego
- Stack, arquitectura de estados, flujo de datos Socket.IO
- Pantallas: Lobby, Preparación, DRAW, MAIN, COUNTER, Game Over
- Componentes comunes: barra de cartas, panel de unidad, overlay de resultado
- Tabla de estado de implementación y próximos pasos

### `docs/frontend/weboficial.md`
- Especificación de la web oficial futura
- Secciones: landing, cómo jugar, registro, rankings, tienda
- Relación con el cliente de juego (salas privadas + matchmaking)
- Stack sugerido (Next.js / PostgreSQL / Prisma)

### `docs/frontend/pantalla-preparacion.md`
- Especificación de la pantalla de preparación
- Maneja IDENTITY_SELECTION y ROLL (despliegue va en HexBoard)
- Layout, elementos, flujo y datos necesarios para cada subfase

## 2. Actualización analisis.md

- Re-verificación completa de consistencia entre docs, código y tests
- Eliminado falso problema "d12" (arquitectura.md ya decía 2d6 correctamente)
- Agregados issues reales: `consistency.md` obsoleto, `04-1-draw.md` menciona `didMovePreviousTurn` en reset
- 04-1-draw.md pasa de 5✅ a 4✅ + 1⚠️

## 3. Implementación — Pantalla de preparación

### `src/server/index.ts`
- Al unirse el segundo jugador, emite `BOTH_PLAYERS_READY` a la sala

### `src/client/game/useGameState.ts`
- Nuevo estado `bothPlayersReady` + listener `BOTH_PLAYERS_READY`
- `sendAction` salta el guard de `activePlayer` durante PREPARATION
  (ambos jugadores deben poder enviar SELECT_IDENTITY y ROLL_DICE)

### `src/client/prep/PreparationScreen.tsx`
- Contenedor que rutea entre IDENTITY_SELECTION y ROLL según preparationPhase

### `src/client/prep/IdentitySelection.tsx`
- Espera a que ambos jugadores estén conectados (`bothPlayersReady`)
- Click en carta → destaca (borde azul) y muestra info en panel derecho
- Botón "Seleccionar carta" → envía `SELECT_IDENTITY`
- No se auto-selecciona al hacer click (solo preview)
- Panel derecho 288px con ilustración placeholder, nombre, clase, descripción

### `src/client/prep/DiceRoll.tsx`
- Botón "🎲 Tirar dados" → `ROLL_DICE`
- Dado visual con resultado numérico
- Manejo de empate (aviso amarillo)
- Resumen: quién es activo y quién despliega primero

### `src/client/App.tsx`
- Render condicional: PREPARATION → PreparationScreen, GAME → HexBoard

## 4. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `docs/frontend/descripcion.md` | Creado + actualizado con cambios de UI |
| `docs/frontend/weboficial.md` | Creado |
| `docs/frontend/pantalla-preparacion.md` | Creado + actualizado con nuevo layout |
| `docs/arquitectura/fases/analisis.md` | Re-verificación, corrección de issues |
| `docs/arquitectura/fases/session.md` | Esta entrada |
| `src/client/prep/PreparationScreen.tsx` | Creado |
| `src/client/prep/IdentitySelection.tsx` | Creado |
| `src/client/prep/DiceRoll.tsx` | Creado |
| `src/client/App.tsx` | Render condicional PREPARATION vs GAME |
| `src/client/game/useGameState.ts` | bothPlayersReady, sendAction guard |
| `src/server/index.ts` | BOTH_PLAYERS_READY event |

---

# Sesión de trabajo — 23 Jun 2026 (tarde)

## Objetivo
Completar fase GAME: movimiento, ataque básico, habilidades de arquero y caballería, UI de targeting, sistema de alertas, indicadores de buff/debuff, y balance de combate.

---

## 1. UI y navegación

### Movimiento visual feedback
- `movingUnitId` separado de `selectedUnitId` en HexBoard
- Click en unidad selecciona; botón "Movimiento" activa modo movimiento
- Rango de movimiento se muestra en verde

### Cartas movidas a panel izquierdo
- RightPanel ya no tiene CardHand
- PlayerSidebar muestra cartas del jugador (nombre + hover "Usar"/"Descartar"/"Contrarrestar")
- Cartas del oponente como "?" placeholder
- Click en carta → detalle en RightPanel (`CardDetail`)
- Nuevo tipo `SelectedInfo: { type: 'card'; cardId: string }`

### Enemy tooltip
- Solo muestra clase, HP, buffs/debuffs para enemigos
- Acciones visibles pero deshabilitadas (gris) para unidades no propias / no es turno

### AlertPanel (`src/client/game/layout/AlertPanel.tsx`)
- Nuevo componente de notificaciones con auto-dismiss (4s)
- `useAlerts()` hook
- Posicionado `top-2 right-2` sobre el tablero
- Tipos: info, success, warning, error

### AttackResultPanel (`src/client/game/layout/AttackResultPanel.tsx`)
- Muestra resultado del ataque: dados (⚀⚁⚂⚃⚄⚅), suma, dificultad, acierto/fallo, daño
- Auto-dismiss a los 5s
- Previene duplicados con `prevKeyRef`

### Indicadores de jugador en panel izquierdo
- Dot de color en el escudo (verde P1, rojo P2) — grande con glow
- Active turn highlight según jugador (P1 verde, P2 rojo)
- Badge "EN TURNO"/"DESPLEGANDO" en ambas fases

### Selección de efecto en panel derecho
- Click en efecto de jugador → `EffectDetail` en RightPanel
- UnitDetail muestra efectos activos (buffs/debuffs)

---

## 2. Preparación y despliegue

### SIMULATE_PREPARATION
- Action type + handler `simulatePreparation`
- Recorre identidad → dados → despliegue completo
- Botón "⚡ Simular preparación y despliegue"

### RollResults centrado
- DiceBox `w-48` fijo, MiniIdentity `w-36` fijo, layout vertical

### General deployment alert
- Chequeo client-side ≥10 desplegadas sin general → alerta

---

## 3. Combate y ataque básico

### Flujo de ataque
- `attackingUnitId` → enemigos en rango destacados en rojo
- Click hex o token → `ATTACK_UNIT`

### 1 ataque por turno por unidad
- `attackedThisTurn` check en `handleAttack`
- Botón "⚔️ Ya atacó"

### Coste de ataque arreglado
- `onCost` de `doble_ataque`/`disparo_rapido` eliminados (sumaban +1 a todos los ataques)

### Dificultad de arqueros
- `5 + distancia` (antes `6 + distancia`)

### RNG — bug crítico
- `nextRandom` usaba bits bajos del LCG → distribución sesgada (95% pares, máx 11)
- Fix: `value: newSeed >>> 16` (bits altos)
- Distribución ahora correcta (verificada con 10,000 tiradas)

---

## 4. Sistema de targeting de habilidades

- `pendingAbility` state en HexBoard
- Habilidades con `def` → `onRequestAbilityTarget`
- `getAbilityTargets`: enemigos en rango según habilidad
- `getAbilityMoveTargets`: hexágonos destino (`accion_evasiva` dist 1, `cabalgar` dist 2 recta)
- Click en token de enemigo → `onUseAbilityOnUnit`
- Tooltip muestra distancia/dificultad via `isEnemyInAbilityRange`

---

## 5. Habilidades de arquero

| Habilidad | Tipo | Costo | Estado |
|-----------|------|-------|--------|
| `blanco_facil` | Pasiva | — | ✅ (onDifficulty -1) |
| `disparo_rapido` | Activa | 1 | ✅ Targeting + `lastAttackResult` |
| `fuego_cobertura` | Activa | 2 | ✅ Rework: `fuegoCoberturaCharges:2` |
| `accion_evasiva` | Activa | 1 | ✅ Nueva: mover 1 hex si enemigo adyacente |

### fuego_cobertura rework
- **Antes**: `hasMovementPenalty` → solo duplicaba movimiento
- **Ahora**: `fuegoCoberturaCharges: 2` en la unidad objetivo
  - +1 PA a ataques, movimientos y habilidades
  - Se limpia al final del turno del afectado

---

## 6. Habilidades de caballería

| Habilidad | Tipo | Costo | Estado |
|-----------|------|-------|--------|
| `romper_filas` | Pasiva | — | ✅ Ignora defensas enemigas |
| `cabalgar` | Activa | 1 | ✅ Línea recta 6 ejes, no atraviesa unidades |
| `carga` | Activa | 1 | ✅ Requiere cabalgar, -1 dificultad +1 daño |
| `doble_ataque` | Activa | 1 | ✅ Segundo ataque -1 daño |

### cabalgar — bug fixes
- Línea recta: condición `dq !== 0 && dr !== 0 && dq !== -dr` (antes dejaba pasar dq=1,dr=1)
- No atraviesa unidades: check de hex intermedio en servidor y cliente

---

## 7. Movimiento sin restricciones

- Botón `disabled: false` — cualquier unidad puede moverse mientras tenga PA
- `movedThisTurn` se setea para tracking de habilidades pero no bloquea UI

---

## 8. DRAW phase — alerta de descarte

- `sendAction` chequea DRAW + mano > 3 + acción ≠ `DISCARD_CARD`
- `lastBlockedReason` expuesto desde `useGameState` → alerta en `App.tsx`

---

## 9. Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `src/client/game/layout/AlertPanel.tsx` | Notificaciones toast |
| `src/client/game/layout/AttackResultPanel.tsx` | Display de ataque |
| `src/shared/game/phases/simulate.ts` | Handler SIMULATE_PREPARATION |

## 10. Archivos modificados clave

| Archivo | Cambio principal |
|---------|------------------|
| `state.ts` | `lastAttackResult`, `fuegoCoberturaCharges`, removido `hasMovementPenalty` |
| `action-types.ts` | `SIMULATE_PREPARATION` |
| `reducer.ts` | `SIMULATE_PREPARATION` handler |
| `attack.ts` | 1 ataque/turno, surcharge, `lastAttackResult` |
| `move.ts` | Surcharge +1 en movimiento |
| `ability.ts` | `storeAttackResult`, `handleAccionEvasiva`, surcharge, cabalgar no atraviesa |
| `resolver.ts` | `AttackResult` con datos completos |
| `hit.ts` | Archer `5 + dist` |
| `ability-effects.ts` | `onCost` removidos |
| `rng.ts` | `>>> 16` (bits altos) |
| `turn.ts` | Limpia `fuegoCoberturaCharges` |
| `App.tsx` | DRAW alert, `lastBlockedReason` |
| `useGameState.ts` | `lastBlockedReason`, DRAW check |
| `HexBoard.tsx` | `attackingUnitId`, `pendingAbility`, targeting helpers |
| `UnitsLayer.tsx` | Targeting callbacks, disabled logic, tooltip refactor |
| `HexTile.tsx` | `attackable` red highlight |
| `PlayerSidebar.tsx` | Cartas, active highlight, effects, dot |
| `RightPanel.tsx` | `EffectDetail`, `UnitDetail` effects |
| `PreparationScreen.tsx` | Botón simular |
| `RollResults.tsx` | Fixed-width centrado |
| `DiceRoll.tsx` | MiniIdentity vertical |

---

## Tests

Todas las aserciones pasan

---

## Pendientes para próxima sesión

- Implementar habilidades de infantería y lancero (restantes)
- Implementar cartas de efecto (BUFF/DEBUFF/COUNTER) desde la UI
- Sistema de fin de turno y contador de rondas
- Condición de victoria (muerte del general) y pantalla de Game Over
- Balance general de stats y costos
