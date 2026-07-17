# Auditoría de Consistencia: Documentación vs Implementación

docs/game/ vs src/shared/game/

---

## 1. Cartas de Identidad

| Aspecto | Documentación | Código | Estado |
|---------|--------------|--------|--------|
| Total identidades | 15 | 15 en `IDENTITY_KEYS` (card.ts:8-24) | ✅ |
| Reparto 3, elegir 1 | ✅ | init.ts:17-19, identity.ts | ✅ |
| Revelación simultánea | Ambos revealedIdentity = true | identity.ts | ✅ |
| applyIdentityEffects | Tras selección | identity-apply.ts (95 líneas) | ✅ |

### Robin Hood (Arquero)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Class override** | General se considera arquero | `IDENTITY_EFFECTS`: `unitClassOverride: 'archer'`, `copyStats: true` (identities.ts:11-14) | ✅ |
| **Global: arqueros move=1** | coste movimiento 1, pierden acción evasiva | `identity-apply.ts:50-55`: todos los arqueros+general `movementCost: 1` y filtran `accion_evasiva` | ✅ |
| **Especial: En la mira** | 1 dmg gratis/turno a no-general | `identity.ts:5-30`: `handleIdentityAbility` inflige 1 dmg, validado en reducer.ts:105-107 | ✅ |
| **Global: Robar a los ricos** | 1er arquero que acierta recupera 1HP | `attack.ts:92-115`: si `robin_hood` y arquero/general acierta y no full HP → `hp + 1`. Flag `identityHealedThisTurn` controla 1 curación/turno. | ✅ |

### Francotirador del Bosque (Arquero)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Class override** | General se considera arquero | `IDENTITY_EFFECTS`: `unitClassOverride: 'archer'`, `copyStats: true` | ✅ |
| **Especial: +1 rango habilidades** | General tiene +1 rango habilidades arquero | `ability.ts:18-23`: `getAbilityRange()` añade +1 si `francotirador` y `class === 'general'` | ✅ |
| **Especial: -2 dificultad** | -2 si objetivo no se movió | `ability-effects.ts:36-43`: `blanco_facil` da -2 en vez de -1 | ✅ |
| **Global: +1 rango ataques básicos** | Arqueros tienen +1 rango ataque básico | `attack.ts:42`: `basicRangeBonus = (attackerIdentity === 'francotirador' ? 1 : 0)` | ✅ |

### Dios del Trueno (Infantería)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Class override** | General gana Resistencia + Presión + Rayo celestial | `abilitiesOverride: ['resistencia', 'presion', 'rayo_celestial']` | ✅ |
| **Rayo celestial** | +3/+2/+1 daño a aliado, coste 1 | `ability.ts:617-637`: handler con decremento, consumido en resolver.ts:119-121 | ✅ |
| **Inicialización** | Bonus empieza en 3 | `identity-apply.ts:74-82`: `celestialRayBonus: 3` | ✅ |
| **Furia berserker** | +1 daño si HP ≤ 50% | `ability-effects.ts:149-158` | ✅ |

### Capitán de la Guardia (Infantería)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Class override** | General gana Resistencia + Presión | `abilitiesOverride: ['resistencia', 'presion']` | ✅ |
| **Contraataque** | 1/turno enemigo, +1 dmg melee | `resolver.ts:11-17` (detección), `resolver.ts:75-78` (+3 dmg miss), `resolver.ts:140-144` (+1 dmg hit) | ✅ |
| **Liderar a las tropas** | Presión global al matar unidad | `turn.ts:182-190`: `nextTurnGlobalPresion → globalPresionActive`. `ability-effects.ts:171-177`: +1 daño infantería+general | ✅ |

### Caballos de Guerra (Caballería)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Class override** | General se considera caballería | `IDENTITY_EFFECTS`: `unitClassOverride: 'cavalry'`, `copyStats: true`, `statsToCopy: ['range', 'movementCost']` | ✅ |
| **Cabalgar 2** | Caballería obtiene cabalgar_2 | `identity-apply.ts:59-63`: `cabalgar` → `cabalgar_2` | ✅ |
| **A la carga** | Cabalgar 3 hex, coste progresivo +0/+1/+2 | `ability.ts:575-591`: `handleALaCarga`. `ability.ts:402-440`: `handleCabalgar2` con path length 3 y extraCost progresivo (max 2) | ✅ |
| **Maniobras acrobáticas** | Cabalgar sin línea recta | `ability.ts:370-373`: solo si `isCaballos` se salta validación línea recta | ✅ |

### Cazadores (Caballería)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Class override** | General se considera caballería | `IDENTITY_EFFECTS`: `unitClassOverride: 'cavalry'` | ✅ |
| **Acechar** | +2 daño a aislados (+1 vs general) | `ability-effects.ts:161-169` | ✅ |
| **Hostigar** | -1 dificultad si ≤ 50% HP | `ability-effects.ts:128-137` | ✅ |

### Punta de Lanza (Lancero)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Class override** | General se considera lancero | `abilitiesOverride: ['anti_caballeria', 'formacion_defensiva', 'ventaja_alcance', 'torbellino']` | ✅ |
| **Torbellino** | 2 dmg área, coste 3 | `ability.ts:524-571`: `handleTorbellino` | ✅ |
| **Proyección activación** | 1 vez/turno, daño detrás | `turn.ts:160-168`: activa `proyeccionActive` en lanceros al iniciar turno | ✅ |
| **Proyección ejecución** | Daño a 2 casillas detrás | `attack.ts:137-163`: si `proyeccionActive` y acierta, calcula las 2 casillas detrás del objetivo y aplica 1 de daño. Limpia flag al usarse. | ✅ |

### Espartano (Lancero)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Class override** | General se considera lancero | `abilitiesOverride: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque']` | ✅ |
| **Lanza y escudo** | Elegir rango+1 o defensa-1 cada turno | `turn.ts:171-179`: `pendingEspartanoChoice`. `reducer.ts:138-151`: `ESPARTANO_CHOICE` aplica el flag. `ability-effects.ts:199-202`: defensa. `ability.ts:481`: rangeBonus en doble_ataque | ✅ |
| **Muro espartano** | Lanceros adyacentes -1 daño | `ability-effects.ts:205-213` | ✅ |

### Monje Shaolin (General)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Class override** | General (meditación) | `abilitiesOverride: ['meditacion']` | ✅ |
| **Meditación** | Curar 3HP por 2PA | `ability.ts:163-175`: `handleMeditacion` | ✅ |
| **Resistencia condicional** | Si no actuó turno anterior, -1 daño | `turn.ts:71-76`: al END_TURN si `!generalActedThisTurn` → `addModifier damage -1` | ✅ |
| **Karma** | 2 de daño al asesino | `helpers.ts:56-66`: en `killUnit()`, si `monje_shaolin` → `dealDamage(killerId, 2)` | ✅ |
| **Tracking** | performedActionThisTurn | `identity-apply.ts:64-70`, reseteado en resetUnitTracking (turn.ts:97) | ✅ |

### Corazón de Estratega (General)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Posición estratégica** | Movimiento gratis 1/turno a adyacente aliado | `ability.ts:116-136`: `handlePosicionEstrategica` | ✅ |
| **Formaciones tácticas** | Línea (-1 daño), Triángulo (+1 ataque) | `formations.ts:88-139`: `applyFormationModifiers`. `turn.ts:193-195`: evaluado al iniciar turno. `reducer.ts:74-76`: refrescado tras cada acción en MAIN | ✅ |

### Comandante Supremo (General)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **IDENTITY_EFFECTS** | General con habilidades | ✅ Añadido: `unitClassOverride: 'general'` (identities.ts:51-53). Efectos funcionan por comprobación directa de `selectedIdentity`. | ✅ |
| **Voz de mando** | Mover aliado 1 casilla gratis (tras mover general) | `move.ts:46-96`: costo 0, doble bono Plan de batalla | ✅ |
| **Plan de batalla** | Elegir Avanzar (+1 ataque) o Reagruparse (-1 daño) | `turn.ts:269-288`: `pendingPlanBatalla` al iniciar turno. `reducer.ts:124-137`: `COMANDANTE_CHOICE` aplica modifiers a todas las unidades | ✅ |

### Inspiración Real (General)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **En nombre del rey** | Ataque 5 + escudo 3HP a aliado, coste 2 | `ability.ts:140-159`: `handleEnNombreDelRey` | ✅ |
| **Guardia real activo** | +1 ataque a adyacentes | `turn.ts:229-245`: al iniciar turno, addModifier attack +1 a unidades adyacentes al general | ✅ |
| **Guardia real oponente** | -1 daño a adyacentes del general rival | `turn.ts:248-266`: al iniciar turno, addModifier damage -1 a unidades adyacentes al general rival | ✅ |
| **Limpieza** | Restaurar HP y ataque | `turn.ts:204-226`: limpia escudos y restaura ataque base | ✅ |

### Samurái (General)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Desenvainado veloz** | -1 dificultad, inmoviliza si acierta | `ability.ts:179-220`: usa `resolveAttack` con `extraDifficulty: -1`, aplica `inmovil` modifier | ✅ |
| **Camino del guerrero** | +1 PA por kill melee a rango 1 | `helpers.ts:69-89`: en `killUnit()`, si `samurai` y distancia 1 y no usado → +1 PA | ✅ |

### Furia del Tirano (General)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Sacrificar** | 2 dmg a aliado, cura 3 (5 si muere) | `ability.ts:224-247`: `handleSacrificar` | ✅ |
| **Terror** | Enemigos adyacentes +1 dificultad | `helpers.ts:92-105`: en `killUnit()`, aplica `difficulty +1` a enemigos adyacentes al asesino u objetivo | ✅ |

### Escudo del Comandante (General)

| Efecto | Documentación | Implementación | Estado |
|--------|--------------|----------------|--------|
| **Ángel Guardián** | Escudo 2HP a todos los aliados | `ability.ts:251-265`: `handleAngelGuardian` | ✅ |
| **Proteger** | -1 daño a un aliado (o general por defecto) | `ability.ts:269-296`: `handleProteger`. `turn.ts:305-310`: si no se usó, va al general automáticamente | ✅ |
| **Limpieza escudos** | Al iniciar turno | `turn.ts:291-318`: restaura HP de escudos vencidos | ✅ |

---

## 2. Cartas de Efecto (cartas_efecto.md)

| Carta | Documentación | Código | Estado |
|-------|--------------|--------|--------|
| Movilidad | +1 mov sin coste próximo turno | `movementCost SET 0` (card.ts:144) | ✅ |
| Ataque extra | +1 ataque, reinicia ataque, cargas en unidad | `ataqueExtraCharges` via charges (card.ts:146-155) | ✅ |
| Precisión | -2 dificultad, cargas en unidad | `precisionCharges` via charges (card.ts:158-167) | ✅ |
| Flechas de fuego | +1 daño + DoT 2 turnos | `damage +1` + `dotOnHit` → `passiveDamage` (card.ts:170-172) | ✅ |
| Inspiración de tropa | +1 PA si general no atacado | Valida `generalWasAttackedLastTurn` (card.ts:240-246). +1 PA si condición cumple (card.ts:175-181) | ✅ |
| Bajar moral | -1 PA al oponente | `ap -1` modifier (card.ts:185-186) | ✅ |
| Pantano | 1er mov cuesta doble | `movementCost MUL 2` (card.ts:189-190) | ✅ |
| Mantenimiento | 1er ataque -1 daño | `damage -1` (card.ts:193-194) | ✅ |
| Confusión | No puede mover ni atacar, por unidad | `bloqueo SET 1` (card.ts:200-201) | ✅ |
| Miedo | 1er ataque +1 PA | `attackCost +1` (card.ts:204-205) | ✅ |
| Panacea | Elimina debuffs | removePlayerDebuffs (card.ts:264-266) | ✅ |
| Ladrón | Roba carta pendiente | Añade a mano (card.ts:269-287) | ✅ |
| Espejo | Refleja debuff | applyCardEffect al emisor (card.ts:290-308) | ✅ |

---

## 3. Reglas del Juego (juego.md)

| Regla | Documentación | Código | Estado |
|-------|--------------|--------|--------|
| Tablero radio 5 | Radio 5 | `map: { radius: 5 }` | ✅ |
| **Unidades por jugador** | 1 general, 3 de cada clase = **13 uds**, despliega 11 | 1 general, 3 de cada clase = 13 uds (init.ts:61-75). Despliega 11, sobran 2 | ✅ |
| Límite mano | 3 cartas | Enforced > 3 → DISCARD | ✅ |
| PA base | 5 + carryOver = floor(PA/2), máx 8 | ✅ | |
| Patrón despliegue | 1-2-2-2-2-2-2-1 | ✅ deployment.ts | |
| Distancia centro = 2 | 1ª unidad | ✅ | |
| Rango ≤ 2 de aliado | Siguientes | ✅ | |
| Máx 3 misma clase | Sí | ✅ | |
| Ataque básico 1 PA | Sí | ✅ | |
| Contraataque 2 dmg al fallar | Sí | ✅ | |
| Crítico (≥ 11) +2 dmg | Sí | ✅ | |
| Victoria = eliminar General | gamePhase → GAME_OVER | ✅ | |

---

## Resumen de Inconsistencias

| Gravedad | Hallazgo |
|----------|----------|
| 🟢 Leve | Ataque extra y Precisión usan `charges` en unidad en vez de `ModifierInstance`. Posible refactor si se quiere unificar el sistema de modifiers. |

