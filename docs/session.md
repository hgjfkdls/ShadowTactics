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

# Sesión de trabajo — 24 Jun 2026

## Objetivo
Refactorización de Avance a pasiva, correcciones en pasivas de infantería, indicadores visuales para habilidades pasivas en el hover.

---

## 1. Avance — de activa a pasiva

### Cambio de diseño
- **Antes**: Habilidad activa con coste 1 PA, atacaba al objetivo y ocupaba su posición si moría.
- **Ahora**: Pasiva que se activa automáticamente cuando un ataque básico de infantería elimina a un enemigo. Aparece un diálogo preguntando si ocupar la posición.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/shared/game/data/abilities.ts` | `avance` cambia de `type: 'active'` a `type: 'passive'`, sin coste ni `requiresTarget` |
| `src/shared/game/state.ts` | Nuevo campo `pendingOccupation?: { unitId; position }` en `GameState` |
| `src/shared/game/action-types.ts` | Nueva acción `OCCUPY_POSITION { playerId; accept: boolean }` |
| `src/shared/game/actions/attack.ts` | Tras kill con `avance`, setea `pendingOccupation` |
| `src/shared/game/actions/ability.ts` | Eliminado `case 'avance'` del switch y función `handleAvance` |
| `src/shared/game/reducer.ts` | Nuevo case `OCCUPY_POSITION`: si `accept` mueve la unidad y limpia pending |
| `src/shared/game/phases/turn.ts` | Eliminado `usedAvance` de `resetUnitTracking` |
| `src/client/game/board/UnitsLayer.tsx` | Eliminado `avance` de habilidades activas y su condición disabled |
| `src/client/game/layout/PendingOccupationPanel.tsx` | **Creado**: diálogo "¿Ocupar posición?" con botones Aceptar/Rechazar |
| `src/client/game/board/HexBoard.tsx` | Integrado `PendingOccupationPanel` |
| `src/test/game-abilities.test.ts` | Test actualizado: ataque básico → verificar pendingOccupation → aceptar → verificar posición |

---

## 2. Correcciones en pasivas de infantería

### Resistencia + Línea defensiva — no acumulación
- `resistencia.onDefense`: si la unidad también tiene `linea_defensiva` y cumple su condición (`didMovePreviousTurn === false`), Resistencia no aplica (solo Línea defensiva).
- Ambos handlers ahora requieren `ctx.abilitySide === 'defender'` (antes se activaban desde el atacante, reduciendo erróneamente el daño de la propia infantería al atacar).

### Resistencia — solo se consume en acierto
- `onPostHit` de `resistencia` y `linea_defensiva`: ahora solo incrementan `timesDamagedThisTurn` si `hit === true`. Si falla, la pasiva sigue activa para el siguiente ataque.

### Línea defensiva — condición `didMovePreviousTurn === false`
- Los tests verifican que ambos funcionan correctamente tanto del lado del atacante como del defensor.

---

## 3. Indicadores visuales de pasivas (hover panel)

### Convención de posiciones
- **Esquina superior izquierda** (`-14, -14`): indicadores **defensivos** (escudo para Resistencia/ Línea defensiva)
- **Esquina superior derecha** (`14, -14`): indicadores **del atacante** (diana para Blanco fácil, diana azul para Presión)

### Indicadores implementados
| Indicador | ¿Cuándo se muestra? |
|-----------|-------------------|
| 🔵 Escudo (mitad azul/celeste) | Enemigo infantry con Resistencia (no consumida) o Línea defensiva (no se movió), cuando el jugador ataca o selecciona habilidad ofensiva |
| 🎯 Diana amarilla | Enemigo con Blanco fácil activo (atacante arquero, defensor no se movió) |
| 🎯 Diana azul | Enemigo con Presión activa (infantería seleccionada con Presión, mismo target que turno anterior) |

### Tooltip de pasivas
Sección "⚡ Pasivas que afectan" en el hover panel con las habilidades relevantes:
- `Blanco fácil (-1 dificultad)`
- `Presión (+1 daño)`
- `Línea defensiva (-1 daño)` — solo si aplica (no se movió)
- `Resistencia (-1 daño)` — solo si no consumida (no ha recibido daño este turno)

---

## Pendientes para próxima sesión

- Implementar cartas de efecto (BUFF/DEBUFF/COUNTER) desde la UI
- Sistema de fin de turno y contador de rondas
- Condición de victoria (muerte del general) y pantalla de Game Over
- Balance general de stats y costos

- Implementar habilidades de infantería y lancero (restantes)
- Implementar cartas de efecto (BUFF/DEBUFF/COUNTER) desde la UI
- Sistema de fin de turno y contador de rondas
- Condición de victoria (muerte del general) y pantalla de Game Over
- Balance general de stats y costos

---

# Sesión de trabajo — 24 Jun 2026 (tarde)

## Objetivo
Finalizar UI de selección de unidades, implementar teclas de acceso rápido configurables, migrar panel de acciones a HTML fijo, mejorar paneles de información, y añadir temporizadores de partida y turno.

---

## 1. Selección de unidades — pulido

### Click en misma unidad deselecciona
- `onSelectUnit` en `HexBoard.tsx`: si `selectedUnitId === unitId` → limpia selección y targeting.

### Click en hex vacío deselecciona
- En `onHexClick`, el `else` final llama a `setSelectedUnitId(null)` y limpia targeting.

### Teclas rápidas — primera versión (remapeada varias veces)
- Mapa final: **Q** ataque, **SPACE** movimiento, **W/E/R** habilidades 1-3, **D** deseleccionar, **ESC** end turn.
- Validaciones: solo si hay PA suficiente, habilidad disponible, unidad no ha atacado, etc.
- Alertas cuando no se cumple condición ("No tienes PA suficientes", "Ya has atacado este turno", "Habilidad no disponible en este momento").

---

## 2. Sistema de key bindings configurables

### `src/client/game/KeyBindingsContext.tsx`
- Context + Provider + hook `useKeyBindings()`
- Persistencia en `localStorage` con versionado (`_version: 2`) para migrar defaults futuros.
- Defaults: `DESELECT: 'd'`, `BASIC_ATTACK: 'q'`, `MOVE: ' '`, `ABILITY_1: 'w'`, `ABILITY_2: 'e'`, `ABILITY_3: 'r'`, `END_TURN: 'escape'`
- `updateBinding` y `resetBindings` expuestos.

### `src/client/game/layout/KeyBindingsModal.tsx`
- Modal con lista de 7 acciones.
- Click en acción → modo "recording" → presionar tecla para asignar.
- Detección de conflictos (misma tecla para dos acciones).
- Botón "Restaurar valores por defecto".
- Escape cancela recording (no cierra modal).

### `src/client/game/layout/HamburgerMenu.tsx`
- Botón ☰ en esquina superior derecha (dentro del header de App).
- Dropdown: "Configurar teclas" (abre modal) y "Leave game".
- Cierra al clickear fuera.

### `src/client/App.tsx`
- Reemplazado botón "Leave Game" por `HamburgerMenu`.
- Envuelto con `KeyBindingsProvider`.
- `EndTurnBtn` componente separado para acceder a `useKeyBindings` (muestra `[ESC]` en el botón).

### `src/client/game/board/HexBoard.tsx`
- `useKeyBindings()` en el handler de teclado reemplaza valores hardcodeados.

---

## 3. Panel de acciones migrado a HTML fijo

### `src/client/game/layout/ActionPanel.tsx`
- Nuevo componente HTML posicionado `absolute bottom-4 right-4`.
- Tamaño fijo `w-[250px] h-[230px]` — no cambia con cantidad de botones.
- Muestra "No hay selección de aliado" cuando no hay unidad seleccionada.
- Botones: ataque, movimiento, habilidades con tecla asignada `[Q]`, `[SPACE]`, `[W]`, etc.
- Alertas PA insuficiente, ya atacó, habilidad no disponible.
- Ya no depende de SVG overlay — no bloquea hexágonos del tablero.

### `src/client/game/board/UnitsLayer.tsx`
- `UnitTooltip` simplificado a modo compacto (solo clase, HP, estados, pasivas, info de ataque).
- Eliminada toda la lógica de acciones SVG (botones).
- `getMaxHp` y `getUnitStatus` se mantienen como utilidades locales.

---

## 4. Panel de información de habilidades

### `src/client/game/layout/RightPanel.tsx`
- `AbilityList` rediseñada: siempre muestra descripción completa (sin collapse).
- Cada habilidad en un bloque con borde, nombre, descripción, restricciones, tipo y coste.
- Eliminado `useState` de `expandedAbility` y prop `onToggle`.

---

## 5. Panel lateral de jugadores

### `src/client/game/layout/PlayerSidebar.tsx`
- Nueva sección "Turno X" + "Tiempo" (total desde despliegue) arriba de los dos jugadores.
- "Jugador 1" / "Jugador 2" reemplaza "Tú" / "Oponente".
- Badge "EN TURNO" / "DESPLEGANDO" fuera de la carta de identidad, junto al nombre.
- Más separación entre nombre y carta (`pb-2` + `mb-2`).
- Stats PA y Unidades en fila con borde (`border-2 border-zinc-700`), labels blancos `font-bold uppercase`, valores amarillos `text-yellow-400 font-bold`.

---

## 6. Temporizadores

### Timer total de partida (en PlayerSidebar)
- Comienza a contar desde despliegue (`gamePhase !== 'PREPARATION'`).
- Formato `M:SS`, se actualiza cada segundo.

### `src/client/game/layout/TurnTimer.tsx`
- Nuevo componente centrado arriba del tablero.
- Cuenta regresiva de 60s por turno.
- Se reinicia al cambiar `activePlayer` o `turnPhase`.
- ≤ 10s: fondo rojo, texto rojo (urgencia).
- `onTimeUp` callback listo para auto-end-turn (no implementado).
- Timer se pausa durante fase DRAW (descarte) y COUNTER (contra-respuesta).

### `src/client/App.tsx`
- `TurnTimer` renderizado en main area durante GAME/GAME_OVER.

---

## 7. Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `src/client/game/KeyBindingsContext.tsx` | Context + hook para key bindings persistentes |
| `src/client/game/layout/KeyBindingsModal.tsx` | Modal de configuración de teclas |
| `src/client/game/layout/HamburgerMenu.tsx` | Menú hamburguesa con leave game + key config |
| `src/client/game/layout/ActionPanel.tsx` | Panel de acciones HTML fijo abajo-derecha |
| `src/client/game/layout/TurnTimer.tsx` | Countdown de 60s por turno |

## 8. Archivos modificados

| Archivo | Cambio principal |
|---------|------------------|
| `src/client/App.tsx` | HamburgerMenu, KeyBindingsProvider, EndTurnBtn, TurnTimer |
| `src/client/game/board/HexBoard.tsx` | Key bindings dinámicos, ActionPanel, alerts en teclas |
| `src/client/game/board/UnitsLayer.tsx` | UnitTooltip compacto, key labels en botones |
| `src/client/game/layout/PlayerSidebar.tsx` | Game info, Jugador 1/2, EN TURNO fuera, stats destacados |
| `src/client/game/layout/RightPanel.tsx` | AbilityList siempre expandido |

---

## Pendientes para próxima sesión

- Implementar cartas de efecto (BUFF/DEBUFF/COUNTER) desde la UI
- End turn automático al expirar timer (conectar `onTimeUp` a `sendAction`)
- Condición de victoria (muerte del general) y pantalla de Game Over
- Balance general de stats y costos

---

# Sesión de trabajo — 25 Jun 2026

## Objetivo
Implementar cartas de identidad: Robin Hood y Francotirador del Bosque como generales testeables, con sus habilidades de clase (arquero), habilidades especiales y globales, y sistema de targeting.

---

## 1. Generales forzados en simulación

### `src/shared/game/phases/simulate.ts`
- `simulatePreparation` asigna directamente `robin_hood_1` a P1 y `francotirador_1` a P2, sin pasar por `handleIdentity`.
- Eliminada función `pickIdentityCard` y su import `handleIdentity`.

---

## 2. Aplicación de identidad al desplegar

### `src/shared/game/data/identities.ts`
- Nuevo: `IDENTITY_EFFECTS` (mapea identidad → `unitClassOverride`) + `getIdentityKey()` exportada.

### `src/shared/game/phases/identity-apply.ts`
- `applyIdentityEffects()` se ejecuta al completar despliegue (desde `deployment.ts`).
- **Paso 1**: el general del jugador recibe las habilidades y stats de la clase override (arquero: `range:4`, `movementCost:2`, `difficulty:6`; HP y attack se mantienen).
- **Paso 2**: efectos globales de la identidad sobre todos los arqueros + general:
  - **Robin Hood**: `movementCost:1`, elimina `accion_evasiva`
  - **Francotirador**: sin cambio estático de rango (manejado dinámicamente en ataque/habilidades)

---

## 3. Robin Hood — Habilidades globales

### Movimiento 1 PA y sin acción evasiva
- `identity-apply.ts`: todos los arqueros (+ general) → `movementCost: 1`, filtran `accion_evasiva` de `abilities`.

### Robar a los ricos — curación al primer acierto
- `state.ts`: nuevo flag `identityHealedThisTurn` en `PlayerResources`.
- `attack.ts`: tras acierto, si el atacante pertenece a Robin Hood y es arquero/general, cura 1 HP (si no está full). Marca `identityHealedThisTurn`.
- `turn.ts`: flag se resetea a `false` al iniciar turno.
- `App.tsx`: alerta `🩹 Jugador X: Robar a los ricos — un arquero recupera 1 HP` al ocurrir la curación.
- `state.ts`: campo `lastIdentityHeal?: { unitId }` para comunicación al cliente.

---

## 4. Francotirador del Bosque — Habilidades globales

### +1 rango ataques básicos
- `attack.ts`: si el atacante pertenece a Francotirador, `basicRangeBonus = 1` para el check de alcance.
- `HexBoard.tsx` + `UnitsLayer.tsx`: helpers `getBasicAttackRange()` y `getAbilityRange()` para que el cliente refleje el rango extra (destacado de hexágonos, detección de targets).

### +1 rango en fuego_cobertura (solo general)
- `ability.ts`: nuevo helper `getAbilityRange()` que añade +1 si la unidad es `general` y pertenece a Francotirador. Usado en `handleFuegoCobertura`.

### Blanco fácil mejorado (-2 dificultad)
- `combat/ability-effects.ts`: `blanco_facil.onDifficulty` reduce -2 en vez de -1 si el atacante pertenece a Francotirador.
- `UnitsLayer.tsx:92` + `RightPanel.tsx:307`: tooltips y descripciones muestran -2 dinámicamente.

### Fórmula de dificultad de arquero para generales
- `combat/hit.ts`: `getDifficulty` usa `5 + distance` si la unidad tiene `blanco_facil` (incluye generales con identidad arquero).

---

## 5. Panel de información del general

### Habilidades de identidad visibles
- `RightPanel.tsx`: `UnitDetail` muestra `descVerbose` de la identidad (Especial + Global) en tarjetas con borde amarillo, icono 👑, debajo de las habilidades de clase.

### Habilidades heredadas colapsables
- `RightPanel.tsx`: `AbilityList` recibe prop `startCollapsed`. Para generales, las habilidades de clase empiezan colapsadas. Las habilidades de identidad (Especial/Global) se muestran expandidas siempre.

---

## 6. En la mira — Robin Hood (daño gratis por turno)

### Estado y acción
- `state.ts`: `pendingIdentityTarget?: boolean` en `PlayerResources`.
- `action-types.ts`: nueva acción `IDENTITY_ABILITY { playerId, targetId }`.
- `actions/identity.ts`: handler que valida objetivo enemigo (no general), inflige 1 daño, limpia flag.

### Flujo de turno
- `turn.ts`: al pasar a MAIN, si el jugador tiene Robin Hood y hay enemigos válidos, marca `pendingIdentityTarget: true`. Si no hay objetivos, se salta.

### Bloqueo de acciones
- `reducer.ts`: bloquea toda acción excepto `IDENTITY_ABILITY` mientras el flag esté activo.

### UI de targeting
- `HexBoard.tsx`: banner púrpura fijo 🎯 "Robin Hood — En la mira: selecciona un enemigo (excepto general)".
- `HexTile.tsx`: hexágonos válidos con relleno púrpura (`#5b1280`), borde `#a855f7`, overlay `rgba(168, 85, 247, 0.25)`.
- `UnitsLayer.tsx`: nuevo prop `onIdentityTargetSelect` — click en token de enemigo válido abre panel de confirmación.
- Panel de confirmación centrado con clase del objetivo, HP, botones **Atacar** / **Cancelar**.

### Notificaciones
- `App.tsx`: alerta success `🩹 Jugador X: Robar a los ricos — un arquero recupera 1 HP`.

---

## 7. Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `src/shared/game/data/identities.ts` | Efectos mecánicos de identidad + `getIdentityKey` |
| `src/shared/game/phases/identity-apply.ts` | Aplica clase override + efectos globales al desplegar |
| `src/shared/game/actions/identity.ts` | Handler `IDENTITY_ABILITY` (En la mira) |

## 8. Archivos modificados

| Archivo | Cambio principal |
|---------|------------------|
| `src/shared/game/state.ts` | `identityHealedThisTurn`, `pendingIdentityTarget`, `lastIdentityHeal` |
| `src/shared/game/action-types.ts` | `IDENTITY_ABILITY` action |
| `src/shared/game/reducer.ts` | Bloqueo de acciones + `IDENTITY_ABILITY` handler |
| `src/shared/game/phases/simulate.ts` | Identidades forzadas Robin Hood / Francotirador |
| `src/shared/game/phases/turn.ts` | `pendingIdentityTarget` set/reset |
| `src/shared/game/phases/deployment.ts` | Llama `applyIdentityEffects` al completar despliegue |
| `src/shared/game/actions/index.ts` | Export `handleIdentityAbility` |
| `src/shared/game/actions/attack.ts` | Francotirador +1 range básico; Robin Hood heal on hit |
| `src/shared/game/actions/ability.ts` | `getAbilityRange` para Francotirador general |
| `src/shared/game/combat/ability-effects.ts` | Blanco fácil -2 para Francotirador |
| `src/shared/game/combat/hit.ts` | `getDifficulty` usa `blanco_facil` como proxy arquero |
| `src/client/App.tsx` | Alerta heal Robin Hood |
| `src/client/game/board/HexBoard.tsx` | Identity target mode, banner, confirmación, helpers rango |
| `src/client/game/board/HexTile.tsx` | `identityTarget` prop con highlight púrpura |
| `src/client/game/board/UnitsLayer.tsx` | `onIdentityTargetSelect`, rango bonus, -2 tooltip |
| `src/client/game/layout/RightPanel.tsx` | Identidad visible en general, habilidades colapsables, -2 visual |

## 9. General testing

- **Robin Hood** ✅ — Arquero con movimiento 1 PA, sin acción evasiva. Cura 1 HP al primer acierto por turno. En la mira: 1 daño gratis a enemigo no general al inicio del turno.
- **Francotirador del Bosque** ✅ — Arquero con +1 rango en ataques básicos. General con +1 rango en fuego_cobertura. Blanco fácil -2 dificultad. Fórmula de dificultad 5+distancia.
- **Dios del Trueno** ✅ — Infantería: solo Resistencia + Presión. Stats de general. Rayo celestial (coste 1): bendice aliado rango 1 a ≤2 con +3/+2/+1 daño según usos. Furia berserker: +1 daño si HP ≤ 50%.
- **Capitán de la Guardia** ✅ — Infantería: solo Resistencia + Presión. Stats de general. Contraataque: 1 daño si aciertan, 3 si fallan (rango 1, 1 vez por turno enemigo). Liderar a las tropas: al eliminar, todas las infanterías + general tienen Presión global el siguiente turno.
- **Caballos de Guerra** ✅ — Caballería: romper_filas, cabalgar_2, carga, a_la_carga. Copia range y movementCost de caballería, mantiene difficulty 6. Cabalgar_2: movimiento en cualquier dirección (2-3 pasos con animación step-by-step). A la Carga: coste progresivo +0/+1/+2, extiende cabalgar a 3 pasos. Maniobras acrobáticas: caballería ignora línea recta al cabalgar. Carga: -1 dificultad.
- **Cazadores** ✅ — Caballería: romper_filas, cabalgar, carga, doble_ataque. Copia range y movementCost de caballería, mantiene difficulty 6. Acechar: +2 daño (+1 vs general) a enemigos aislados (sin aliados adyacentes). Hostigar: -1 dificultad al atacar enemigos con ≤ 50% HP. Indicadores diana amarilla estandarizados.
- **Punta de Lanza** ✅ — Lancero: anti_caballería, formacion_defensiva, ventaja_alcance, torbellino. Mantiene stats de general. Torbellino (coste 3, dificultad 7): acierto → 2 daño a enemigos; fallo → 1 daño a todos excepto general. Panel de resultado muestra enemigos/aliados dañados. Proyección: al inicio del turno todos los lanceros tienen activo; el primer ataque que acierta hace +1 daño a 2 hex detrás del objetivo; luego se desactiva hasta el próximo turno.
- **Espartano** ✅ — Lancero: anti_caballería, formacion_defensiva, doble_ataque. Mantiene stats de general. Lanza y escudo: al inicio del turno elige +1 rango (dura el turno, diana amarilla) o -1 daño (dura hasta próxima elección, escudo azul). Muro espartano: lanceros adyacentes reciben -1 daño. Indicadores: escudo azul en (-14,-14).

## Pendientes para próxima sesión

- Implementar el resto de cartas de identidad (13 pendientes)
- Implementar cartas de efecto (BUFF/DEBUFF/COUNTER) desde la UI
- Condición de victoria (muerte del general) y pantalla de Game Over
- Balance general de stats y costos
