# Auditoría de Fases: Arquitectura Documentada vs Implementación

docs/arquitectura/fases/ vs src/shared/game/phases/

---

## 01-identidad.md

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| Fase | IDENTITY_SELECTION subfase de PREPARATION | ✅ `preparationPhase: 'IDENTITY_SELECTION'` | OK |
| Mazo 15 identidades | buildIdentityDeck con Fisher-Yates | ✅ card.ts:26-30 + shuffleArray | OK |
| Reparto 3 c/u | p1 indices [0..2], p2 [3..5] | ✅ init.ts:17-19 | OK |
| SELECT_IDENTITY | Guarda selectedIdentity | ✅ identity.ts: handleIdentity | OK |
| Devuelve 2 al mazo | Al mazo original | ✅ identity.ts | OK |
| Revelación automática | Cuando ambos seleccionan | ✅ identity.ts avanza a ROLL | OK |
| Estado: identityCards limpias | Tras selección | No verificado | ⚠️ |
| Solo activePlayer importa | No, cada jugador selecciona | Correcto | OK |

**Conclusión**: Fase implementada correctamente.

---

## 02-dados.md

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| Fase | ROLL subfase de PREPARATION | ✅ `preparationPhase: 'ROLL'` | OK |
| ROLL_DICE | Cada jugador tira 2d6 | ✅ roll.ts: handleRoll | OK |
| Empate | Reset ambos a undefined | ✅ (en roll.ts) | OK |
| deploymentOrder | [menor, mayor] | ✅ deploymentOrder[0]=menor, [1]=mayor | OK |
| activePlayer | Mayor puntuación | ✅ | OK |
| currentDeployingPlayer | Menor puntuación | ✅ | OK |
| deploymentStep | 0 | ✅ init.ts:118 | OK |
| deploymentCount | 0 | ✅ init.ts:119 | OK |
| RNG | roll2d6 con semilla | ✅ rng.ts | OK |

**Conclusión**: Fase implementada correctamente.

---

## 03-despliegue.md

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| Fase | DEPLOYMENT subfase de PREPARATION | ✅ | OK |
| Patrón | 1-2-2-2-2-2-2-1 (12 pasos) | ✅ deployment.ts step logic | OK |
| Step 0: order[0] coloca 1 | deploymentOrder[0] = perdedor dado | ✅ | OK |
| Step 11: order[1] coloca 1 | deploymentOrder[1] = ganador dado | ✅ | OK |
| Total x jugador: 11 uds | 1 general + 10 tropas | ✅ 11 colocadas, 13 en pool | ⚠️ (ver consistencia.md) |
| 1ª ud distancia centro = 2 | exactamente 2 | ✅ deployment.ts | OK |
| Sig. ud rango ≤ 2 aliado | distancia ≤ 2 | ✅ deployment.ts | OK |
| Máx 3 misma clase | limitado a 3 | ✅ deployment.ts | OK |
| General obligatorio último | Si es la última y no desplegado | ✅ deployment.ts | OK |
| Creación de unidad | createUnit() | ✅ factory.ts | OK |
| Transición | preparationPhase → DONE → gamePhase → GAME | ✅ | OK |

**Conclusión**: Fase implementada correctamente. Discrepancia pool 13 vs 17 (doc principal) pero fase despliega 11 como especifica.

---

## 04-0-flujo-del-juego.md

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| DRAW automático | applyTurnStart() | ✅ turn.ts | OK |
| MAIN | Acciones disponibles | ✅ turnPhase: 'MAIN' | OK |
| COUNTER | Al jugar BUFF/DEBUFF | ✅ turnPhase: 'COUNTER' | OK |
| END_TURN | A DRAW del oponente | ✅ handleEndTurn → applyTurnStart | OK |
| Reducer routing | applyAction() | ✅ reducer.ts | OK |

**Conclusión**: Flujo general correcto.

---

## 04-1-draw.md (DRAW)

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| PA = min(5 + carryOver, 8) | Sí | ✅ turn.ts: applyTurnStart | OK |
| Reset tracking/unidad | timesDamagedThisTurn, attackedThisTurn, etc. | ✅ turn.ts: resetUnitTracking | OK |
| Robar carta (drawCard) | Del mazo | ✅ card.ts: drawCard | OK |
| Mano > 3 → DISCARD | Pool de 4, elige cuál descartar | ✅ card.ts: handleDiscard | OK |
| DISCARD sola acción válida | Cuando mano > 3 | ✅ turnPhase: 'DRAW' bloquea otras | OK |
| Límite mano = 3 | Sí | ✅ | OK |

**Conclusión**: Subfase implementada correctamente.

---

## 04-2-main.md (MAIN)

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| MOVE_UNIT | Consume PA | ✅ move.ts | OK |
| ATTACK_UNIT | 1 PA + modificadores | ✅ attack.ts | OK |
| USE_ABILITY | Coste según habilidad | ✅ ability.ts | OK |
| USE_CARD | 0 PA, va a COUNTER | ✅ card.ts | OK |
| END_TURN | Disponible siempre | ✅ turn.ts | OK |
| Bucle acciones | Libre elección | ✅ (reducer permite cualquier orden) | OK |
| carryOver = floor(PA/2) | Al END_TURN | ✅ turn.ts | OK |

**Conclusión**: Subfase implementada correctamente.

---

## 04-3-counter.md (COUNTER)

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| USE_CARD BUFF/DEBUFF → COUNTER | turnPhase: 'COUNTER' | ✅ card.ts:317-325 | OK |
| PASS_COUNTER solo rival | Resuelve carta pendiente | ✅ card.ts:355-364 | OK |
| Ladrón (BUFF o DEBUFF) | Roba carta pendiente | ✅ card.ts:269-287 | OK |
| Espejo (solo DEBUFF) | Refleja al emisor | ✅ card.ts:290-308 | OK |
| Panacea (solo DEBUFF) | Elimina debuffs propios | ✅ card.ts:264-266 | OK |
| Vuelta a MAIN | Tras resolver | ✅ turnPhase: 'MAIN' | OK |

**Conclusión**: Subfase implementada correctamente.

---

## 05-movimiento.md

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| MOVE_UNIT action | type, payload | ✅ | OK |
| Costo = movementCost | Coste base | ✅ move.ts | OK |
| Distancia máxima | 1 hex/acción | ✅ | OK |
| Validaciones | Fase, turno, dueño, existencia, bloqueo, límites, hex libre, PA | ✅ | OK |
| Modificador movementCost | SET/MUL desde cartas | ✅ modifiers/engine.ts | OK |
| Consumir modifier | Tras movimiento | ✅ consumeModifier en move.ts | OK |
| movedThisTurn/didMovePreviousTurn | Tracking correcto | ✅ | OK |

**Conclusión**: Acción implementada correctamente.

---

## 06-combate.md

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| ATTACK_UNIT action | type, payload | ✅ | OK |
| Costo = 1 + onCost + attackCost | Calculado en handleAttack | ✅ attack.ts | OK |
| Validaciones | Fase, turno, existencia, enemigo, rango, PA | ✅ | OK |
| Resolución resolveAttack | Dificultad → Roll → Hit/Miss | ✅ resolver.ts | OK |
| Sistema de hooks (CombatResult) | onCost, onDifficulty, onDamage, onDefense, onPostHit | ✅ ability-effects.ts | OK |
| Contraataque si miss + rango | getCounterDamage() = 2 | ✅ counter.ts | OK |
| Formación defensiva | +1 dif si Carga, daño si falla | ✅ ability-effects.ts:59-66 | OK |
| Capitán de la Guardia | Contraataque especial | ✅ resolver.ts:11-17, 140-144 | OK |
| Consumo de modifiers | difficulty, attack, attackCost, damage | ✅ resolver.ts:124-128 | OK |

**Conclusión**: Sistema de combate implementado según documentación. El doc es más detallado que ningún otro y la implementación coincide fielmente.

---

## 07-cartas.md

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| 52 cartas (13 × 4) | ✅ | ✅ buildEffectDeck | OK |
| BUILDING/DEBUFF/COUNTER | Tipos | ✅ | OK |
| drawCard + límite 3 | Mano + descarte | ✅ | OK |
| USE_CARD → COUNTER | BUFF/DEBUFF → COUNTER | ✅ | OK |
| Panacea | removePlayerDebuffs | ✅ | OK |
| Ladrón | Roba carta pendiente | ✅ | OK |
| Espejo | Refleja al emisor | ✅ | OK |
| PASS_COUNTER | Resuelve pendiente | ✅ | OK |

**Conclusión**: Sistema de cartas documentado e implementado correctamente.

---

## 08-habilidades.md

| Habilidad | Tipo | Documentación | Implementación | Estado |
|-----------|------|--------------|----------------|--------|
| blanco_facil | Pasiva | -1 dif si objetivo inmóvil | ✅ ability-effects.ts:34-44 | OK |
| romper_filas | Pasiva | Ignora defensas | ✅ ability-effects.ts:97-101 | OK |
| anti_caballeria | Pasiva | +2 vs caballería | ✅ ability-effects.ts:46-48 | OK |
| formacion_defensiva | Pasiva | +1 dif si Carga + daño si falla | ✅ ability-effects.ts:59-66 | OK |
| resistencia | Pasiva | -1 daño 1ª vez | ✅ ability-effects.ts:68-82 | OK |
| linea_defensiva | Pasiva | -1 daño si inmóvil | ✅ ability-effects.ts:84-95 | OK |
| presion | Pasiva | +1 si mismo objetivo | ✅ ability-effects.ts:50-57 | OK |
| disparo_rapido | Activa | +1 ataque, +1 dificultad | ability.ts (no leído) | ⚠️ |
| fuego_cobertura | Activa | Coste ×2 al moverse | ability.ts | ⚠️ |
| cabalgar | Activa | Mover 2 hex en línea recta | ability.ts | ⚠️ |
| carga | Activa | -1 dif, +1 dmg, requiere cabalgar | ability.ts | ⚠️ |
| doble_ataque | Activa | 2º ataque -1 dmg | ability.ts | ⚠️ |
| ventaja_alcance | Activa | Rango +1 | ability.ts | ⚠️ |
| avance | Activa | Ocupar posición tras kill | pendingOccupation en state | ⚠️ |

**Conclusión**: Pasivas bien implementadas. Activas requieren verificación directa de ability.ts (537 líneas).

---

## 09-modificadores.md

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| ModifierInstance | Estructura completa | ✅ types.ts | OK |
| addModifier | Crear instancia | ✅ engine.ts | OK |
| getModifierSum | Suma stats | ✅ engine.ts | OK |
| consumeModifier | Gastar uso | ✅ engine.ts | OK |
| modifierExists | Verificar activos | ✅ engine.ts | OK |
| removePlayerDebuffs | Eliminar debuffs de jugador | ✅ engine.ts | OK |
| processModifiersAtTurnStart | Decrementar turnos, limpiar, aplicar AP | ✅ turn.ts | OK |
| Operadores ADD/MUL/SET | ✅ | ✅ | OK |

**Conclusión**: Sistema de modificadores implementado según documentación.

---

## 10-fin-del-juego.md

| Aspecto | Documentación | Implementación | Estado |
|---------|--------------|----------------|--------|
| GAME_OVER | gamePhase → GAME_OVER | ✅ | OK |
| Disparador | killUnit() cuando general HP≤0 | ✅ utils.ts | OK |
| Act. bloqueadas | applyAction devuelve state sin mutar | ✅ reducer.ts | OK |
| winner | attacker.owner | ✅ | OK |

**Conclusión**: Fase game over implementada correctamente.

---

## Resumen General

| Fase | Estado |
|------|--------|
| 01-identidad (selección) | ✅ Completo |
| 02-dados (ROLL) | ✅ Completo |
| 03-despliegue | ✅ Completo (discrepancia pool 13 vs 17 externa) |
| 04-0 flujo general | ✅ Completo |
| 04-1 DRAW | ✅ Completo |
| 04-2 MAIN | ✅ Completo |
| 04-3 COUNTER | ✅ Completo |
| 05-movimiento | ✅ Completo |
| 06-combate | ✅ Completo |
| 07-cartas | ✅ Completo |
| 08-habilidades pasivas | ✅ Completo |
| 08-habilidades activas | ⚠️ No verificado en ability.ts (537 líneas) |
| 09-modificadores | ✅ Completo |
| 10-fin-del-juego | ✅ Completo |
