[docs](../../docs.md) > [arquitectura](../docs.md) > [fases](./docs.md) > simulacion

[volver](./docs.md) | [prev](./10-fin-del-juego.md) | [next](./simulacion_mov.md)

# Simulación de flujo del juego

6 escenarios que recorren los caminos del orquestador (`04-flujo-del-juego.md`). Cada escenario comienza al terminar el DRAW inicial del turno, salvo que se indique lo contrario.

---

## Escenario 1 — Turno solo con acciones (sin cartas)

**Setup**: p1 activo, PA = 5, 1 carta en mano (`precision_1`), unidades desplegadas.

| Paso | Fase | Acción | PA antes | PA después | Estado |
|------|------|--------|----------|------------|--------|
| 1 | DRAW | automático: roba `ataque_extra_1`, PA = 5 | — | 5 | hand: [precision_1, ataque_extra_1], turnPhase → MAIN |
| 2 | MAIN | `MOVE_UNIT` (u1 → {q:1,r:0}, cuesta 2) | 5 | 3 | hand igual |
| 3 | MAIN | `ATTACK_UNIT` (u1 → u3, cuesta 1) | 3 | 2 | hand igual |
| 4 | MAIN | `END_TURN` | 2 | — | carryOver = floor(2/2) = 1, turn → 2, activePlayer → p2, DRAW del oponente |

**Árbol de decisión**: el jugador nunca usó cartas. Dentro de MAIN eligió libremente MOVE → ATTACK → END_TURN.

```
DRAW ──→ MAIN ──→ MAIN ──→ MAIN ──→ END_TURN ──→ DRAW (p2)
         MOVE     ATTACK    END_TURN
```

---

## Escenario 2 — Carta BUFF + acciones

**Setup**: p1 activo, PA = 5, 1 carta en mano (`precision_1`).

| Paso | Fase | Acción | PA ant | PA new | Estado |
|------|------|--------|--------|--------|--------|
| 1 | DRAW | roba `mantenimiento_1`, PA = 5 | — | 5 | hand: [precision_1, mantenimiento_1], MAIN |
| 2 | MAIN | `USE_CARD` (precision_1, **no cuesta PA**) | 5 | 5 | precision_1 → lastCardAction, turnPhase → COUNTER |
| 3 | COUNTER | rival: `PASS_COUNTER` | — | — | precision_1 se resuelve (difficulty -2 al próximo ataque de p1), turnPhase → MAIN |
| 4 | MAIN | `MOVE_UNIT` (u1 → {q:1,r:0}, cuesta 2) | 5 | 3 | hand: [mantenimiento_1] |
| 5 | MAIN | `ATTACK_UNIT` (u1 → u3, cuesta 1, con -2 difficulty por precision) | 3 | 2 | modificador precision consumido |
| 6 | MAIN | `END_TURN` | 2 | — | carryOver = 1, turn → 2, activePlayer → p2 |

**Árbol**: USE_CARD desde MAIN → desvío a COUNTER → vuelve a MAIN → acciones normales.

```
DRAW ──→ MAIN ──→ COUNTER ──→ MAIN ──→ MAIN ──→ MAIN ──→ END_TURN
         CARD     PASS         MOVE    ATTACK   END_TURN
```

---

## Escenario 3 — Contrajuego con Ladrón

**Setup**: p1 activo, PA = 5, 1 carta en mano (`bajar_moral_1`). p2 tiene `ladron_1` en mano.

| Paso | Fase | Acción | PA ant | PA new | Estado |
|------|------|--------|--------|--------|--------|
| 1 | DRAW | roba, PA = 5 | — | 5 | hand p1: [bajar_moral_1, X], MAIN |
| 2 | MAIN | p1: `USE_CARD` (bajar_moral_1) | 5 | 5 | lastCardAction = bajar_moral_1, turnPhase → COUNTER |
| 3 | COUNTER | p2: `USE_CARD` (ladron_1) | — | — | Ladrón roba `bajar_moral_1`: va a hand de p2, se descarta ladron_1, lastCardAction → undefined, turnPhase → MAIN |
| 4 | MAIN | p1: `MOVE_UNIT` (cuesta 2) | 5 | 3 | hand p1: [X], hand p2 ahora incluye bajar_moral_1 |
| 5 | MAIN | p1: `END_TURN` | 3 | — | carryOver = 1, turn → 2, activePlayer → p2 |

**Árbol**: COUNTER no se pasa — p2 contraataca con Ladrón. La carta robada cambia de manos y p1 continúa en MAIN con los PA intactos.

```
DRAW ──→ MAIN ──→ COUNTER ──→ MAIN ──→ MAIN ──→ END_TURN
         CARD     LADRÓN      MOVE    END_TURN

         (bajar_moral_1 pasa a mano de p2)
```

---

## Escenario 4 — Mano llena al DRAW + descarte

**Setup**: p1 comienza su turno con hand = [movilidad_1, precision_1, ataque_extra_1] (3 cartas, máximo). PA anterior = 4 → carryOver = floor(4/2) = 2, PA base = 5, PA total = min(5 + 2, 8) = 7.

| Paso | Fase | Acción | PA | Hand (pool) | Estado |
|------|------|--------|----|-------------|--------|
| 1 | DRAW | p1 activo, turn++, reset tracking | — | [mov, prec, ataq] | turnPhase → DRAW |
| 2 | DRAW | PA = min(5 + carryOver(2), 8) = 7 | 7 | [mov, prec, ataq] | — |
| 3 | DRAW | drawCard → mazo da `bajar_moral_1` | 7 | **[mov, prec, ataq, bajar]** (pool de 4) | — |
| 4 | DRAW | processModifiersAtTurnStart | 7 | [mov, prec, ataq, bajar] | sin modificadores |
| 5 | DRAW | turnPhase se queda en DRAW | 7 | [mov, prec, ataq, bajar] | mano > 3 → solo DISCARD_CARD |
| 6 | DRAW | `DISCARD_CARD` (cardId: `movilidad_1`) | 7 | [prec, ataq, bajar] (3) | mov → effectDiscard, **MAIN** |
| 7 | MAIN | `MOVE_UNIT` (cuesta 2) | 5 | [prec, ataq, bajar] | — |
| 8 | MAIN | `END_TURN` | 5 | — | carryOver = 2, turn → 2, activePlayer → p2 |

**Alternativa** (paso 6): descartar la recién robada en lugar de una existente:

| Paso | Fase | Acción | PA | Hand | Estado |
|------|------|--------|----|------|--------|
| 6b | DRAW | `DISCARD_CARD` (cardId: `bajar_moral_1`) | 7 | [mov, prec, ataq] (vuelve a 3) | bajar → effectDiscard, **MAIN** |

**Árbol**: DRAW mete la carta al hand (pool de 4). El jugador elige cuál de las 4 descarta. Solo tras DISCARD_CARD se sale a MAIN.

```
DRAW ──→ DRAW ──→ DRAW ──→ MAIN
        roba     DISCARD  acciones
        pool=4   elige    PA=7
```

---

---

## Escenario 5 — Dos cartas consecutivas (BUFF + BUFF)

**Setup**: p1 activo, PA = 5, hand = [precision_1, ataque_extra_1].

| Paso | Fase | Acción | PA | Hand | Estado |
|------|------|--------|----|------|--------|
| 1 | DRAW | roba `mantenimiento_1`, PA = 5 | 5 | [precision_1, ataque_extra_1, mantenimiento_1] | MAIN |
| 2 | MAIN | `USE_CARD` (precision_1) | 5 | [ataque_extra_1, mantenimiento_1] | precision → lastCardAction, COUNTER |
| 3 | COUNTER | `PASS_COUNTER` | — | — | precision resuelta (difficulty -2), MAIN |
| 4 | MAIN | `USE_CARD` (ataque_extra_1) | 5 | [mantenimiento_1] | ataque_extra → lastCardAction, COUNTER |
| 5 | COUNTER | `PASS_COUNTER` | — | — | ataque_extra resuelta (+1 attack, +2 difficulty), MAIN |
| 6 | MAIN | `MOVE_UNIT` (u1 → {q:1,r:0}) | 3 | [mantenimiento_1] | — |
| 7 | MAIN | `ATTACK_UNIT` (u1 → u3, con precision + ataque_extra activos) | 2 | [mantenimiento_1] | ataque con -2 difficulty, +1 attack |
| 8 | MAIN | `END_TURN` | 2 | — | carryOver = 1, turn → 2, activePlayer → p2 |

**Árbol**: dos cartas una tras otra. Cada USE_CARD desencadena COUNTER→PASS→MAIN. Luego acciones.

```
DRAW ──→ MAIN ──→ COUNTER ──→ MAIN ──→ COUNTER ──→ MAIN ──→ MAIN ──→ MAIN ──→ END_TURN
         CARD     PASS        CARD     PASS        MOVE     ATTACK   END_TURN
         (prec)               (ataq)               (2 PA)   (1 PA)
```

---

## Escenario 6 — Cartas intercaladas con acciones

**Setup**: p1 activo, PA = 5, hand = [precision_1, flechas_fuego_1, bajar_moral_1].

| Paso | Fase | Acción | PA | Hand | Estado |
|------|------|--------|----|------|--------|
| 1 | DRAW | roba `pantano_1` | 5 | [prec, flechas, bajar, pantano] (pool de 4) | DRAW (mano > 3, solo DISCARD) |
| 2 | DRAW | `DISCARD_CARD` (cardId: `bajar_moral_1`) | 5 | [prec, flechas, pantano] (3) | bajar → effectDiscard, MAIN |
| 3 | MAIN | `MOVE_UNIT` (u1 → {q:1,r:0}) | 3 | [prec, flechas, pantano] | — |
| 4 | MAIN | `USE_CARD` (precision_1) | 3 | [flechas, pantano] | COUNTER |
| 5 | COUNTER | `PASS_COUNTER` | — | — | precision resuelta, MAIN |
| 6 | MAIN | `ATTACK_UNIT` (u1 → u3, con -2 difficulty) | 2 | [flechas, pantano] | modificador precision consumido |
| 7 | MAIN | `USE_CARD` (flechas_fuego_1) | 2 | [pantano] | COUNTER |
| 8 | COUNTER | `PASS_COUNTER` | — | — | flechas_fuego resuelta (+1 damage arqueros 2 turnos), MAIN |
| 9 | MAIN | `MOVE_UNIT` (u2 → {q:3,r:0}) | 0 | [pantano] | — |
| 10 | MAIN | `END_TURN` (PA = 0, carryOver = 0) | 0 | — | turn → 2, activePlayer → p2 |

**Árbol**: las acciones y cartas se intercalan libremente. El jugador decide el orden según conveniencia táctica.

```
DRAW ──→ DRAW ──→ MAIN ──→ MAIN ──→ COUNTER ──→ MAIN ──→ MAIN ──→ COUNTER ──→ MAIN ──→ MAIN ──→ END_TURN
         DISCARD  MOVE     CARD     PASS        ATTACK   CARD     PASS        MOVE     END_TURN
         bajar    (2 PA)   (prec)               (1 PA)   (flechas)            (2 PA)
```

---

## Resumen de caminos cubiertos

| Esc. | DRAW | MAIN | COUNTER | END_TURN | Característica |
|------|------|------|---------|----------|----------------|
| 1 | ✓ | ✓ | — | ✓ | Solo acciones, sin cartas |
| 2 | ✓ | ✓ | ✓ (PASS) | ✓ | Carta + acciones post-COUNTER |
| 3 | ✓ | ✓ | ✓ (Ladrón) | ✓ | Contrajuego en COUNTER |
| 4 | ✓ (pool 4) | ✓ | — | ✓ | Mano llena → DISCARD_CARD |
| 5 | ✓ | ✓ | ✓ (PASS×2) | ✓ | 2 cartas consecutivas |
| 6 | ✓ (pool 4) | ✓ | ✓ (PASS×2) | ✓ | Cartas intercaladas con acciones |
