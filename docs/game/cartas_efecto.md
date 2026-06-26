[docs](../docs.md) > [game](./docs.md) > cartas_efecto

[volver](./docs.md) | [next](./cartas_identidad.md)

# Cartas de Efecto

52 cartas (13 tipos × 4 copias). Mazo barajado al inicio con Fisher-Yates.

---

## Buffs (5 cartas)

### Movilidad

| Campo | Valor |
|-------|-------|
| Tipo | BUFF |
| Aplicación | Acumulativa |
| Objetivo | El jugador (afecta a cualquier unidad al moverse) |
| Efecto | El primer movimiento de cualquier unidad cuesta 0 PA. Se consume al moverse. Expira al terminar el turno. |
| Implementación | `ModifierInstance`: `movementCost SET 0`, 1 turno, 1 uso |

### Ataque extra

| Campo | Valor |
|-------|-------|
| Tipo | BUFF |
| Aplicación | Cargas |
| Objetivo | Una unidad aliada |
| Efecto | La unidad puede atacar de nuevo aunque ya haya atacado. El ataque no cuesta PA, hace +1 de daño y tiene +2 de dificultad. Las cargas se consumen al atacar (acierte o no). Es acumulable (múltiples copias = múltiples ataques extra). |
| Implementación | Campo `ataqueExtraCharges` en la unidad. Se consume en `attack.ts:83`. |

### Precisión

| Campo | Valor |
|-------|-------|
| Tipo | BUFF |
| Aplicación | Cargas |
| Objetivo | Una unidad aliada |
| Efecto | -2 dificultad al siguiente ataque básico de la unidad. Las cargas se consumen al atacar (acierte o no). Es acumulable. |
| Implementación | Campo `precisionCharges` en la unidad. Se consume en `attack.ts:84`. |

### Flechas de fuego

| Campo | Valor |
|-------|-------|
| Tipo | BUFF |
| Aplicación | Acumulativa + Cargas |
| Objetivo | El jugador (prepara al atacante y marca al objetivo) |
| Efecto | El siguiente ataque del jugador hace +1 de daño (modificador `damage`, 1 uso). Si acierta, el objetivo recibe 1 de daño al inicio de cada uno de los 2 siguientes turnos del jugador (`passiveDamage`, 2 usos). |
| Implementación | `ModifierInstance`: `damage ADD +1` (1 uso) + `dotOnHit` (1 uso, se consume al acertar y aplica `passiveDamage` al objetivo). Daño pasivo procesado en `processModifiersAtTurnStart` (`engine.ts:151`). |

### Inspiración de tropa

| Campo | Valor |
|-------|-------|
| Tipo | BUFF |
| Aplicación | Instantánea |
| Objetivo | El jugador |
| Efecto | +1 PA inmediato. No deja modificadores persistentes. |
| Implementación | `actionPoints += 1` directo en `card.ts:175-181`. |
| Nota | Se valida que el general del jugador activo `generalWasAttackedLastTurn === false`. Si fue atacado, la carta se rechaza con el mensaje "No puedes usar esta carta si tu general fue atacado el turno anterior". La `lastCardRejectionReason` se limpia al siguiente intento. |

---

## Debuffs (5 cartas)

### Bajar la moral

| Campo | Valor |
|-------|-------|
| Tipo | DEBUFF |
| Aplicación | Acumulativa |
| Objetivo | El jugador rival |
| Efecto | -1 PA al oponente al inicio de su siguiente turno. |
| Implementación | `ModifierInstance`: `ap ADD -1`, 1 turno. Procesado en `processModifiersAtTurnStart`. |

### Pantano

| Campo | Valor |
|-------|-------|
| Tipo | DEBUFF |
| Aplicación | Acumulativa |
| Objetivo | El jugador rival (afecta al primer movimiento de cualquier unidad) |
| Efecto | El primer movimiento del oponente cuesta el doble de PA. Se consume al moverse. Expira al terminar el turno. |
| Implementación | `ModifierInstance`: `movementCost MUL 2`, 1 turno, 1 uso |

### Mantenimiento de equipo

| Campo | Valor |
|-------|-------|
| Tipo | DEBUFF |
| Aplicación | Acumulativa |
| Objetivo | El jugador rival (afecta al primer ataque de cualquier unidad) |
| Efecto | El primer ataque del oponente hace -1 de daño. Se consume al atacar (acierte o no). Expira al terminar el turno. |
| Implementación | `ModifierInstance`: `damage ADD -1`, 1 turno, 1 uso |

### Confusión en la retaguardia

| Campo | Valor |
|-------|-------|
| Tipo | DEBUFF |
| Aplicación | Acumulativa |
| Objetivo | Una unidad enemiga específica |
| Efecto | La unidad no puede moverse ni atacar en su próximo turno. La unidad objetivo no puede cambiarse. No se acumula (si ya tiene confusión activa, la nueva se rechaza). |
| Implementación | `ModifierInstance`: `bloqueo SET 1`, 1 turno. Validado en `move.ts:20` y `attack.ts:31`. |

### Miedo

| Campo | Valor |
|-------|-------|
| Tipo | DEBUFF |
| Aplicación | Acumulativa |
| Objetivo | El jugador rival (afecta al coste del primer ataque) |
| Efecto | El primer ataque del oponente cuesta +1 PA. Se consume al atacar. Expira al terminar el turno. |
| Implementación | `ModifierInstance`: `attackCost ADD +1`, 1 turno, 1 uso |

---

## Counters (3 cartas)

### Panacea

| Campo | Valor |
|-------|-------|
| Tipo | COUNTER |
| Aplicación | Instantánea |
| Válida contra | DEBUFF (solo) |
| Efecto | Elimina todos los modificadores activos que afectan al jugador (filtra `activeModifiers` por `sourcePlayerId`). |
| Implementación | `card.ts:264-266`. Se descartan ambas cartas (Panacea + debuff). Vuelve a MAIN. |

### Ladrón

| Campo | Valor |
|-------|-------|
| Tipo | COUNTER |
| Aplicación | Instantánea |
| Válida contra | BUFF o DEBUFF |
| Efecto | Roba la carta BUFF/DEBUFF pendiente del rival y la añade a tu mano. La carta original se descarta sin efecto. |
| Implementación | `card.ts:269-287`. La carta robada se puede jugar en el turno del jugador. |

### Espejo

| Campo | Valor |
|-------|-------|
| Tipo | COUNTER |
| Aplicación | Instantánea |
| Válida contra | DEBUFF (solo) |
| Efecto | Refleja el DEBUFF pendiente al rival que lo jugó. Se vuelve a ejecutar `applyCardEffect` apuntando al emisor original. |
| Implementación | `card.ts:290-308`. Calcula el oponente del emisor para aplicar el efecto en su contra. |
