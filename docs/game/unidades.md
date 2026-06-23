[docs](../docs.md) > [game](./docs.md) > unidades

[volver](./docs.md) | [prev](./juego.md)

## ARQUERO

El arquero es un maestro del combate a distancia, siempre atento al movimiento de sus enemigos. Su precisión y rapidez le permiten ralentizar a los adversarios y mantenerlos bajo control, mientras se mantiene fuera del alcance de los ataques más peligrosos. Ágil en la colocación estratégica, su fuerza radica en anticipar los movimientos del rival y usar su puntería para proteger a sus aliados y dominar el campo de batalla desde la distancia.

### Estadísticas

| Stat | Valor |
|------|-------|
| HP | 8 |
| Ataque | 3 |
| Dificultad | 6 + distancia |
| Coste movimiento | 2 |
| Rango | 4 |

### Habilidades

- **Blanco fácil** (Pasiva)
Descripción: Si el objetivo no se movió el turno anterior -1 dificultad

- **Disparo rápido** (coste 1)
Descripción: si el enemigo esta a 2 o menos de distancia, puedes realizar un segundo ataque, pero este tiene dificultad +1

- **Fuego de cobertura** (coste 2)
Descripción: Lanza un ataque de control. Si el ataque impacta, el objetivo tendrá coste +1 en su próximo turno (max 2 acciones)

- **Acción evasiva** (coste 1)
Descripción: si hay enemigos adyacentes al inicio del turno, esta habilidad reemplaza al primer movimiento del turno

Restricciones:
- Cada arquero puede usar Fuego de cobertura 1 vez por turno, el efecto no se acumula

----------------------------------------------------------------------------------------------------------------

## CABALLERÍA

Especialistas en velocidad y ataque de impacto. Su bajo coste de movimiento les permite recorrer el campo rápidamente, romper formaciones enemigas y golpear con fuerza concentrada, pero dependen de posicionamiento cuidadoso para maximizar su efectividad.

### Estadísticas

| Stat | Valor |
|------|-------|
| HP | 10 |
| Ataque | 4 |
| Dificultad | 7 |
| Coste movimiento | 1 |
| Rango | 1 |

### Habilidades

- **Romper filas** (Pasiva)
Descripción: ignora Resistencia y Línea defensiva (habilidades de infantería)

- **Doble ataque** (coste 1)
Descripción: puedes realizar un segundo ataque contra el mismo objetivo, pero este hace -1 daño

- **Cabalgar** (coste 1)
Descripción: 1 vez por turno puedes mover 2 casillas en línea recta. Esta habilidad reemplaza el movimiento normal

- **Carga** (coste 1)
Descripción: Luego de Cabalgar, puede realizar un ataque con -1 dificultad y +1 daño a un objetivo que se encuentre en la misma linea recta del movimiento realizado.

Restricción:
- Si usa carga, no puede volver a atacar este turno


----------------------------------------------------------------------------------------------------------------

## LANCEROS

Defensores expertos contra la caballería, equilibran ofensiva y resistencia. Mantienen la línea, controlan el avance enemigo y pueden hostigar unidades fuertes mientras protegen a sus aliados de cargas devastadoras.

### Estadísticas

| Stat | Valor |
|------|-------|
| HP | 10 |
| Ataque | 4 |
| Dificultad | 7 |
| Coste movimiento | 1 |
| Rango | 1 |

### Habilidades:

- **Anti-caballería** (Pasiva)
Descripción: al atacar unidades de caballería +2 daño

- **Formación defensiva** (Pasiva)
Descripción: al ser atacado con Carga en un combate, anula el bono de dificultad del atacante. Si el lancero gana el combate, el atacante recibe +1 daño

- **Doble ataque** (coste 1)
Descripción: puedes realizar un segundo ataque contra el mismo objetivo, pero este hace -1 daño

- **Ventaja de alcance** (coste 1)
Descripción: Una vez por turno, uno de tus ataques tiene +1 rango

Restricción:
- Ventaja de alcance solo puede usarse en el primer ataque.
- Si la unidad usa Ventaja de alcance, no puede usar Doble ataque el mismo turno

----------------------------------------------------------------------------------------------------------------

## INFANTERÍA

Pilar del frente, resistente y constante. Su función es absorber daño, mantener la formación y presionar a los enemigos con ataques sostenidos, asegurando que la línea se mantenga firme incluso bajo presión intensa.

### Estadísticas

| Stat | Valor |
|------|-------|
| HP | 12 |
| Ataque | 3 |
| Dificultad | 6 |
| Coste movimiento | 1 |
| Rango | 1 |

### Habilidades:

- **Resistencia** (Pasiva)
Descripción: la primera vez que recibes daño en un turno, -1 daño

- **Línea defensiva** (Pasiva)
Descripción: si no te moviste en tu turno anterior, -1 daño este turno. Línea defensiva no se acumula con Resistencia.

- **Presión** (Pasiva)
Descripción: si esta unidad ataca al mismo objetivo que atacó el turno anterior, +1 daño

- **Avance** (coste 1)
Descripción: Si elimina a un enemigo, puede ocupar su posición sin romper Línea defensiva

----------------------------------------------------------------------------------------------------------------

## GENERAL

### Estadísticas

| Stat | Valor |
|------|-------|
| HP | 15 |
| Ataque | 5 |
| Dificultad | 6 |
| Coste movimiento | 1 |
| Rango | 1 |

### Habilidades

**Carta de identidad**
Activación: 1 vez luego de la fase de despliegue
Descripción: roba 3 cartas de identidad y escoge una de ellas, la carta seleccionada se pondrá boca abajo y se revela cuando ambos jugadores ya han seleccionado una.

Nota: las cartas de identidad dan habilidades especiales al General y habilidades globales a todo su ejercito.