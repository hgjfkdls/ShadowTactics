# Heurística de Evaluación de la IA

## Arquitectura

La función `evaluate(state, playerId, weights)` retorna un número `ℝ` que representa la calidad de una posición de juego para el jugador indicado. La IA selecciona la acción que maximiza este valor.

```
score = Σ (peso_i × factor_i) para i = 1..10
```

Los pesos varían según la dificultad. Los factores están normalizados para que su contribución sea comparable.

---

## Pesos por Dificultad

| Componente | Fácil | Medio | Difícil |
|------------|-------|-------|---------|
| hp         | 1.5   | 1.0   | 1.0     |
| kill       | 0.5   | 1.0   | 1.5     |
| pos        | 0.3   | 0.6   | 1.0     |
| dmg        | 0.3   | 0.6   | 0.8     |
| ap         | 0.1   | 0.3   | 0.5     |
| card       | 0.2   | 0.4   | 0.5     |
| formation  | 0.1   | 0.3   | 0.5     |

**Fácil**: defensivo (hp alto, kill bajo) + 20% ruido aleatorio
**Medio**: balanceado
**Difícil**: agresivo (kill alto, posicional alto)

---

## Factores de Evaluación

### 1. HP Advantage — `w.hp * hpRatio`

```typescript
const myHp = sum(unit.hp for each myUnit);
const oppHp = sum(unit.hp for each oppUnit);
const hpRatio = (myHp - oppHp) / (myHp + oppHp);
```

**Rango:** `[-1, 1]`
**Propósito:** Medir la ventaja de salud total entre ejércitos.

| myHp | oppHp | hpRatio | Interpretación |
|------|-------|---------|----------------|
| 100  | 50    | +0.33   | 2:1 ventaja |
| 50   | 100   | -0.33   | 1:2 desventaja |
| 80   | 80    | 0       | Empate |

**Limitación:** No distingue entre una unidad con 10 HP y dos con 5 HP (menos unidades = menos acciones disponibles por turno).

---

### 2. Unit Count — `w.hp * 0.3 * countRatio`

```typescript
const countRatio = (myCount - oppCount) / (myCount + oppCount + 1);
```

**Rango:** `[-1, 1]`
**Propósito:** Complementar el HP advantage con la cantidad de unidades (más unidades = más acciones).

**Ejemplo:** 6 vs 4 unidades → `(6-4)/(6+4+1) = +0.18 * w.hp * 0.3`

---

### 3. Graveyard Tracking — `w.kill * 0.3 * tanh(deadDiff * 0.5)`

```typescript
const myDead = graveyard.filter(owner === playerId).length;
const oppDead = graveyard.filter(owner === opponent).length;
const deadDiff = oppDead - myDead; // positivo = eliminamos más
```

**Rango:** `[-1, 1]`
**Propósito:** Valorar las bajas causadas al enemigo. Cuantas más unidades enemigas hayan muerto, mejor.

**Curva:** `tanh(diff * 0.5)` suaviza la diferencia:
- +3 bajas → `tanh(1.5)` = +0.90
- +1 baja → `tanh(0.5)` = +0.46
- 0 → 0

---

### 4. General Safety — `w.hp * 0.5 * (genRatio - 0.5) + w.kill * bonus`

```typescript
// General propio: bonus si está sano, penal si está herido
const genRatio = myGeneral.hp / 20;
score += w.hp * 0.5 * (genRatio - 0.5);

// Amenaza a general enemigo: bonus si tenemos unidades en rango y tiene ≤4 HP
if (oppGeneral.hp <= 4 && someUnitInRange) score += w.kill * 0.5;
```

**Rango:** `[-0.5, 0.5]` para safety, `[0, 0.75]` para amenaza
**Propósito:** Proteger al general (su muerte = derrota) y priorizar eliminar al general rival.

| HP del general propio | genRatio | Contribución (w.hp=1) |
|-----------------------|----------|----------------------|
| 20/20 (sano) | 1.0 | +0.25 |
| 10/20 (mitad) | 0.5 | 0 |
| 4/20 (crítico) | 0.2 | -0.15 |

---

### 5. Kill Potential — `w.kill * (safeKills * 0.6 + riskyKills * 0.2)`

```typescript
for each atacante without basic_attack flag:
  for each enemigo in range:
    if enemigo.hp <= atacante.attack:
      if enemigo.range < distance: // no puede contraatacar
        score += w.kill * 0.6       // kill seguro
      else:
        score += w.kill * 0.2       // kill riesgoso (recibirá contraataque)
```

**Rango:** `[0, N * 0.9]`
**Propósito:** Identificar oportunidades de eliminación, diferenciando ataques seguros de aquellos que implican riesgo de contraataque.

**Ejemplo:** Arquero (atk=3, range=3) a distancia 2 de un lancero (HP=2, range=1):
- Distancia 2 ≤ range 3 → puede atacar
- Lancero range=1 < 2 → no puede contraatacar → kill seguro: +0.6 * w.kill

**Ejemplo 2:** Infantry (atk=2, range=1) adyacente a arquero (HP=1, range=3):
- Distancia 1 ≤ range 1 → puede atacar
- Arquero range=3 ≥ 1 → puede contraatacar → kill riesgoso: +0.2 * w.kill

---

### 6. Positional (por clase) — `w.pos * posScore`

```typescript
for each myUnit:
  nearest = min distance to any enemy
  switch class:
    archer:    nearest > range ? +0.1 : -0.1
    general:   nearest > 2 ? +0.1 : -0.1; +0.05 if ally near
    infantry:  nearest ≤ 1 ? +0.08 : nearest ≤ 2 ? +0.03 : -0.05
    lancer:    nearest ≤ 1 ? +0.08 : -0.03; +0.05 if ally adjacent
    cavalry:   nearest == 2 ? +0.08 : nearest == 1 ? -0.05 : -0.03
```

**Rango:** `[-0.15, 0.15]` por unidad
**Propósito:** Evaluar si cada clase está en su posición táctica ideal.

| Clase | Posición ideal | Penalización |
|-------|----------------|--------------|
| Archer | Lejos del enemigo (> range) | Cerca del enemigo |
| General | Protegido (aliados cerca, enemigos lejos) | Aislado o expuesto |
| Infantry | Cerca del enemigo (≤1 hex) | Lejos |
| Lancer | Cerca del enemigo + aliado adyacente | Lejos o aislado |
| Cavalry | A distancia 2 (flanqueo) | Adyacente (atascado) o lejos |

---

### 7. Formation Bonus — `w.formation * min(formations, 1)`

```typescript
for each myUnit:
  // Línea: 3+ unidades alineadas (misma q, r o q+r) a ≤3 hex
  aligned = count allies with same q|r|q+r AND distance ≤ 3
  if aligned ≥ 2: formations += 0.1

  // Adyacencia: 3+ unidades mutuamente adyacentes
  adjacent = count allies at distance exactly 1
  if adjacent ≥ 2: formations += 0.05
```

**Rango:** `[0, 1]`
**Propósito:** Incentivar formaciones que otorgan bonificaciones de juego (Corazón de Estratega: +1 atk/def).

**Ejemplo:** 3 lanceros en línea recta a distancia 1 entre sí:
- Cada uno ve 2 alineados → 3 × 0.1 = +0.3
- Cada uno ve 2 adyacentes → 3 × 0.05 = +0.15
- Total: 0.45, `min(0.45, 1)` = 0.45

---

### 8. Active Modifiers — `w.pos * modScore + w.hp * dotScore`

```typescript
for each myUnit:
  bloqueo → -0.2 * w.pos
  inmovil → -0.15 * w.pos
  passiveDamage (DoT) → -0.1 * w.hp
  defense buff → +0.05 * w.hp
  attack buff → +0.05 * w.kill

for each oppUnit:
  bloqueo → +0.2 * w.pos
  inmovil → +0.15 * w.pos
  defense buff → -0.05 * w.kill
  attack buff → -0.05 * w.hp
```

**Rango:** `[-0.4, 0.4]` aproximadamente
**Propósito:** Reaccionar a modificadores activos en el estado. Si una unidad está bloqueada, la IA prefiere no contar con ella. Si el enemigo está bloqueado, es oportunidad para atacar.

**Modificadores evaluados:**

| Stat | Efecto en propia unidad | Efecto en unidad enemiga |
|------|------------------------|-------------------------|
| `bloqueo` | No puede actuar (-0.2) | Vulnerable (+0.2) |
| `inmovil` | No puede moverse (-0.15) | No puede escapar (+0.15) |
| `passiveDamage` | Recibe daño por turno (-0.1) | — |
| `defense` | Recibe menos daño (+0.05) | Difícil de matar (-0.05) |
| `attack` | Hace más daño (+0.05) | Peligroso (-0.05) |

---

### 9. AP Efficiency (Carry-over) — `w.ap * 0.08 * wasted`

```typescript
const ap = current action points;
const carryOver = Math.floor(ap / 2); // PA que se guardan
const wasted = ap - carryOver;         // PA que se pierden
score -= w.ap * 0.08 * wasted;
```

**Rango:** `[-0.4, 0]`
**Propósito:** Penalizar terminar el turno con PA desperdiciado. Al final del turno, solo `floor(AP/2)` se guarda para el siguiente turno. El resto se pierde.

| AP actual | Carry-over | Wasted | Penalización (w.ap=0.3) |
|-----------|------------|--------|-------------------------|
| 1 | 0 | 1 | -0.024 |
| 2 | 1 | 1 | -0.024 |
| 3 | 1 | 2 | -0.048 |
| 4 | 2 | 2 | -0.048 |
| 5 | 2 | 3 | -0.072 |

---

### 10. Card Advantage — `w.card * tanh((myCards - oppCards) * 0.3)`

```typescript
const myCards = cardsInHand.length ?? 0;
const oppCards = opponent.cardsInHand.length ?? 0;
score += w.card * tanh((myCards - oppCards) * 0.3);
```

**Rango:** `[-1, 1]`
**Propósito:** Valorar tener más cartas en mano que el rival.

| Diferencia | tanh(diff * 0.3) | Contribución (w.card=0.4) |
|------------|------------------|---------------------------|
| +3 | +0.76 | +0.30 |
| +1 | +0.29 | +0.12 |
| 0 | 0 | 0 |
| -1 | -0.29 | -0.12 |
| -3 | -0.76 | -0.30 |

---

## Flujo de Decisión

```
AIPlayer.decide(state, playerId, difficulty)
  → getValidActions(state, playerId)         ← acciones filtradas por simulación
  → for each action:
      simState = cloneState(state)
      resultState = applyAction(simState, action)
      score = evaluate(resultState, playerId, weights)
      if (difficulty === 'hard'):
        // 2-ply minimax: simular mejor respuesta del oponente
        oppActions = getValidActions(resultState, opponent)
        for each oppAction:
          oppResult = applyAction(cloneState(resultState), oppAction)
          oppScore = evaluate(oppResult, playerId, weights)
          score = min(score, oppScore)  // el oponente minimiza nuestro score
      if (difficulty === 'easy'):
        score += randomNoise(20%)
      keep best action
  → return bestAction
```

---

## Limitaciones Conocidas

1. **Sin evaluación de sinergias**: No considera combos entre unidades (ej: Cabalgar + Carga)
2. **Cartas COUNTER**: La IA siempre pasa (`PASS_COUNTER`) en lugar de evaluar si conviene contraatacar
3. **Formaciones**: El bonus es genérico, no consulta la identidad del jugador (Corazón de Estratega, Muro Espartano)
4. **Posición**: No evalúa control del centro del mapa ni cobertura
5. **Despliegue**: Usa `findRandomDeployPosition` en lugar de evaluar posiciones (no usa la heurística para desplegar)
