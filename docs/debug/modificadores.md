# Modificadores del juego

## Fórmula de daño

```
Daño final = Ataque base + Σ(modificadores de ataque) - Σ(modificadores de defensa)
```

El **daño** es la consecuencia de la acción, no una estadística de unidad. Las unidades tienen `ataque` (capacity ofensiva) y `defensa base = 0`. Los modificadores modifican estos valores.

## Organización por categorías

| Categoría | Estadística | Efecto | Aplica a |
|-----------|-------------|--------|----------|
| `attack` (Ataque) | `stat='attack'` | Modifica el daño SALIENTE (`+` suma, `-` resta) | Atacante |
| `defense` (Defensa) | `stat='defense'` | Modifica la defensa, resta del daño entrante | Defensor |
| `difficulty` (Dificultad) | `stat='difficulty'` | Modifica la dificultad de acertar ataques | Defensor (+) / Atacante (-) |
| `movementCost` (Movimiento) | `stat='movementCost'` | Modifica el coste de PA por hexágono | Unidad que se mueve |
| `ap` (PA) | `stat='ap'` | Modifica los PA al inicio del turno | Jugador |
| `attackCost` (Coste ataque) | `stat='attackCost'` | Modifica el coste de PA de atacar | Atacante |
| `bloqueo` (Bloqueo) | `stat='bloqueo'` | Impide que la unidad actúe | Defensor |
| `inmovil` (Inmovil) | `stat='inmovil'` | Impide que la unidad se mueva | Defensor |
| `dotOnHit` (Daño al impactar) | `stat='dotOnHit'` | Marca al atacante para aplicar DoT al impactar | Atacante |
| `passiveDamage` (DoT) | `stat='passiveDamage'` | Daño automático al inicio del turno del objetivo | Defensor |

---

## Listado completo de modificadores

### Ataque (`stat='attack'`) — Modifica el daño saliente

Se suman a la fórmula: `Daño final = ataque base + Σ(attack) - Σ(defense)`

| # | Valor | Duración | Usos | Fuente | Nombre | Origen | Descripción |
|---|-------|----------|------|--------|--------|--------|-------------|
| 1 | `+1` | 0 turnos | 1 uso | `ability` | `Avanzar` | Comandante Supremo: Plan de batalla ofensivo | +1 daño al primer ataque de cada aliado este turno |
| 2 | `+1` | 0 turnos | 1 uso | `identity` | `Inspiración Real` | Inspiración Real: Guardia real | +1 ataque a unidades adyacentes al general propio |
| 3 | `+1` | 1 turno | 1 uso | `formation` | `Triángulo` | Corazón de Estratega: formación Triángulo | +1 daño al atacar para unidades en triángulo |
| 4 | `-1` | 1 turno | 1 uso | `card` | `Mantenimiento` | Carta Mantenimiento de equipo | -1 al ataque del oponente en su próximo ataque |
| 5 | `+1` | 0 turnos | 1 uso | `card` | `Flechas de fuego` | Carta Flechas de fuego | +1 daño global al jugador en su próximo ataque |

### Defensa (`stat='defense'`) — Resta del daño entrante

Se restan en la fórmula: `Daño final = ataque base + Σ(attack) - Σ(defense)`

Las unidades tienen `defensa base = 0`. Los modificadores de defensa tienen valores positivos.

| # | Valor | Duración | Usos | Fuente | Nombre | Origen | Descripción |
|---|-------|----------|------|--------|--------|--------|-------------|
| 6 | `+1` | 0 turnos | 1 uso | `ability` | `Reagruparse` | Comandante Supremo: Plan de batalla defensivo | +1 defensa al primer ataque recibido por cada aliado |
| 7 | `+1` | 1 turno | 1 uso | `identity` | `Meditación` | Monje Shaolin: meditación | +1 defensa al general si no actuó el turno anterior |
| 8 | `+1` | 0 turnos | 1 uso | `identity` | `Inspiración Real` | Inspiración Real: Guardia real (oponente) | +1 defensa a unidades adyacentes al general enemigo |
| 9 | `+1` | 0 turnos | 1 uso | `identity` | `Escudo del Comandante` | Escudo del Comandante | +1 defensa al general si no se usó Proteger |
| 10 | `+1` | 1 turno | 1 uso | `formation` | `Línea` | Corazón de Estratega: formación Línea | +1 defensa al recibir ataque para unidades en línea |
| 11 | `+1` | 0 turnos | 1 uso | `ability` | `Proteger` | Escudo del Comandante: Proteger | +1 defensa a un aliado seleccionado |

### Dificultad (`stat='difficulty'`)

| # | Valor | Duración | Usos | Fuente | Nombre | Origen | Descripción |
|---|-------|----------|------|--------|--------|--------|-------------|
| 12 | `+1` | 0 turnos | 1 uso | `ability` | `Terror` | Furia del Tirano: Terror | +1 dificultad a enemigos adyacentes al eliminar un aliado |

### Coste de movimiento (`stat='movementCost'`)

| # | Valor | Operador | Duración | Usos | Fuente | Nombre | Origen | Descripción |
|---|-------|----------|----------|------|--------|--------|--------|-------------|
| 13 | `0` | `SET` | 1 turno | 1 uso | `card` | `Movilidad` | Carta Movilidad | El primer movimiento cuesta 0 PA |
| 14 | `2` | `MUL` | 1 turno | 1 uso | `card` | `Pantano` | Carta Pantano | El primer movimiento cuesta el doble de PA |

### PA (`stat='ap'`)

| # | Valor | Duración | Usos | Fuente | Nombre | Origen | Descripción |
|---|-------|----------|------|--------|--------|--------|-------------|
| 15 | `-1` | 1 turno | ∞ | `card` | `Bajar moral` | Carta Bajar la moral | -1 PA al oponente al inicio de su turno |

### Coste de ataque (`stat='attackCost'`)

| # | Valor | Duración | Usos | Fuente | Nombre | Origen | Descripción |
|---|-------|----------|------|--------|--------|--------|-------------|
| 16 | `+1` | 1 turno | 1 uso | `card` | `Miedo` | Carta Miedo | +1 PA de coste de ataque al oponente |

### Bloqueo (`stat='bloqueo'`)

| # | Valor | Duración | Usos | Fuente | Nombre | Origen | Descripción |
|---|-------|----------|------|--------|--------|--------|-------------|
| 17 | `1` | 1 turno | ∞ | `card` | `Confusión` | Carta Confusión | Bloquea movimiento y ataque de una unidad enemiga |

### Inmovil (`stat='inmovil'`)

| # | Valor | Duración | Usos | Fuente | Nombre | Origen | Descripción |
|---|-------|----------|------|--------|--------|--------|-------------|
| 18 | `1` | 0 turnos | ∞ | *(ninguno)* | `Desenvainado veloz` | Desenvainado veloz (Samurái) | Inmoviliza al objetivo (no puede moverse) |

### Daño al impactar (`stat='dotOnHit'`)

| # | Valor | Duración | Usos | Fuente | Nombre | Origen | Descripción |
|---|-------|----------|------|--------|--------|--------|-------------|
| 19 | `1` | 0 turnos | 1 uso | `card` | `Flechas de fuego` | Carta Flechas de fuego | Marca al jugador para aplicar DoT al impactar |

### Daño pasivo (`stat='passiveDamage'`)

| # | Valor | Duración | Usos | Fuente | Nombre | Origen | Descripción |
|---|-------|----------|------|--------|--------|--------|-------------|
| 20 | `+1` | 0 turnos | 2 usos | *(ninguno)* | *(ninguno)* | Flechas de fuego (DoT post-impacto) | 1 de daño al inicio del turno del objetivo (2 turnos) |

---

## Modificadores del panel de historia (UI)

Estos no son `addModifier`, sino strings que se muestran en el panel de información al seleccionar un ataque en el historial. Se agrupan por categoría mediante prefijos `[cat]`.

### Categorías del panel

| Prefijo | Categoría | Color |
|---------|-----------|-------|
| `[diff]` | Dificultad | `text-amber-400` |
| `[atk]` | Ataque | `text-red-400` |
| `[def]` | Defensa | `text-blue-400` |
| `[range]` | Rango | `text-cyan-400` |
| `[pa]` | PA | `text-yellow-400` |
| `[mixed]` | Mixto | `text-zinc-300` |

### Modificadores de ataque básico (attack.ts)

| Prefijo | String | Condición |
|---------|--------|-----------|
| *(none)* | `Dificultad: base X, distancia +Y → Z` | Siempre (fórmula base) |
| `[diff]` | `Blanco fácil: -N dificultad` | Atacante tiene `blanco_facil` y objetivo no se movió |
| `[mixed]` | `Ataque extra: +1 daño, +2 dificultad, 0 PA` | Carta Ataque extra activa |
| `[diff]` | `Precisión: -2 dificultad` | Carta Precisión activa |
| `[atk]` | `+N (source: sourceName)` | Modificadores de ataque activos del atacante |
| `[def]` | `-N (source: sourceName)` | Modificadores de defensa activos del defensor |
| `[range]` | `Bonificación rango: +N` | Francotirador (+1) o Espartano (+1) |
| `[def]` | `Línea defensiva: -1 daño` | Objetivo tiene `linea_defensiva` y no se movió |
| `[def]` | `Resistencia: -1 daño` | Objetivo tiene `resistencia` y no fue dañado |
| `[def]` | `Romper filas: ignora modificador X` | Atacante tiene `romper_filas` y objetivo tiene defensas |
| `[atk]` | `Rayo celestial: +N daño` | Dios del Trueno: rayo celestial disponible |
| `[atk]` | `+N daño (sourceName)` | Formaciones de ataque (Triángulo) |
| `[def]` | `-N daño (sourceName)` | Formaciones de defensa (Línea) |
| `[def]` | `Contraataque (Capitán de la Guardia): daño reflejado` | Capitán de la Guardia contraataca |
| *(aura)* | `Precisión: -N dificultad` | Aura de mando (general atacante) |
| *(aura)* | `Evasión: +N dificultad` | Aura de mando (general defensor) |
| *(aura)* | `Durabilidad: -N daño` | Aura de mando (general defensor) |
| *(aura)* | `Escudo: N HP restantes` | Aura de mando (general defensor con escudo) |

### Modificadores de habilidad (ability.ts - buildAttackModifiers)

| Prefijo | String | Condición |
|---------|--------|-----------|
| `[cat]` | `stat: +N (source: sourceName)` | Modificadores activos que afectan al atacante/defensor |
| `[range]` | `Ventaja de alcance: +1 rango` | Lancero con `ventaja_alcance` |
| `[atk]` | `Anti-caballería: +1 daño` | Lancero vs caballería |
| `[diff]` | `Blanco fácil: -N dificultad` | Arquero con `blanco_facil` vs objetivo inmóvil |
| `[atk]` | `Presión: +1 daño` | Unidad con `presion` ataca mismo objetivo |
| `[def]` | `Romper filas: ignora defensas` | Lancero ignora defensas pasivas |
| `[def]` | `Formación defensiva: anula Carga, +1 contra` | Infantería con `formacion_defensiva` vs caballería |
| `[def]` | `Resistencia: -1 daño` | Objetivo tiene `resistencia` |
| `[def]` | `Línea defensiva: -1 daño` | Objetivo tiene `linea_defensiva` |
| `[atk]` | `Contraataque (Capitán de la Guardia): +1 daño` | Capitán de la Guardia contraataca |
| `[atk]` | `Contraataque: +2 daño` | Contraataque normal |

