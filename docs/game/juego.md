[docs](../docs.md) > [game](./docs.md) > juego

[volver](./docs.md) | [prev](./cartas_identidad.md) | [next](./unidades.md)

# Shadow Tactics

Juego de estrategia por turnos sobre un tablero hexagonal de radio 6 casillas.

## Componentes

| Cantidad | Elemento |
|---------:|----------|
| 1 | tablero hexagonal (radio 6) |
| 15 | cartas de identidad |
| 52 | cartas de efecto |
| 2 | generales |
| 8 | arqueros |
| 8 | caballería |
| 8 | lanceros |
| 8 | infantería |
| 2 | dados |

## Fase de preparación

Cada jugador recibe:
- 1 general
- 4 arqueros
- 4 caballería
- 4 lanceros
- 4 infantería

### Sorteo de prioridad
Se revuelven ambos mazos (identidad y efecto). Ambos jugadores lanzan los 2 dados; el que obtenga el número mayor tiene prioridad en el despliegue (**jugador 1**).

### Selección de identidad
Se reparten 3 cartas de identidad al azar a cada jugador del mazo barajado. Cada uno selecciona 1 carta y devuelve las otras 2 al mazo sin que el rival las vea.

Una vez ambos han elegido, muestran su carta al rival y la colocan boca arriba frente al tablero.

> La carta de identidad dicta las habilidades del general.

## Fase de despliegue

Los jugadores despliegan sus unidades alternadamente hasta tener 11 unidades cada uno.

### Orden de despliegue
1. El **jugador 2** despliega 1 unidad.
2. El **jugador 1** despliega 2 unidades.
3. Ambos se turnan desplegando 2 unidades hasta que el jugador 2 completa 11.
4. El jugador 1 coloca su última unidad.

### Reglas de despliegue
1. La primera unidad de cada jugador debe estar a **rango 2** de la casilla central.
2. Cada unidad siguiente debe estar a **rango ≤ 2** de cualquier unidad aliada.
3. Máximo **3 unidades** del mismo tipo por jugador.

## Fase de turnos

### Inicio del turno
1. El jugador roba 1 carta de efecto del mazo.
2. Si tiene más de 3 cartas, debe descartar 1 (mano máxima: 3).
3. Recibe **5 puntos de acción (PA)**.

### Acciones
Puede gastar PA en estas acciones:
- **Mover**: mover una unidad 1 hexágono cuesta PA igual a su **coste de movimiento**.
- **Atacar**: ataque básico cuesta 1 PA.
- **Habilidad**: cuesta el PA indicado en la habilidad.

También puede jugar cartas de efecto sin coste de PA.

### PA no utilizados
Si el jugador no gasta todos sus PA, la mitad (redondeo hacia abajo) se añaden a los 5 PA base de su siguiente turno. (máximo 8 PA totales)

## Uso de cartas de efecto

Jugar una carta de efecto **no tiene coste de PA**. Se dividen en 3 tipos según cuándo y cómo se juegan:

- **Buffs**: se juegan en tu turno y aplican inmediatamente sobre tus unidades.
- **Debuffs**: se juegan en tu turno y afectan al rival en su siguiente turno.
- **Counters**: se juegan durante el turno del rival, inmediatamente después de que él juegue una carta.

## Fase de combate

Cuando un jugador decide atacar durante su turno, se inicia una fase de combate.

### 1. Selección de unidades
El jugador atacante selecciona una unidad propia con rango suficiente para alcanzar a una unidad enemiga. Luego elige una unidad enemiga dentro del rango de su atacante.

### 2. Tipo de ataque
Con ambas unidades seleccionadas, el jugador elige entre:
- **Ataque básico**: coste 1 PA.
- **Habilidad**: tiene un coste de PA asociado y puede requerir condiciones especiales.

Sin importar el resultado del combate, las acciones utilizadas como coste se consideran gastadas.

### 3. Cálculo de modificadores
Se calculan los modificadores de daño y dificultad según:
- Habilidades de las unidades involucradas.
- Cartas de efecto activas (Buffs/Debuffs).

### 4. Tirada de dados
El atacante lanza 2 dados. El resultado determina el éxito o fracaso del ataque según la dificultad calculada.

### 5. Resultados

**Ataque exitoso** (dados ≥ dificultad):
- Se aplica el daño de la habilidad o ataque básico al defensor, reduciendo su HP.
- **Golpe crítico** (dados ≥ 11): +2 de daño adicional.

**Ataque fallido** (dados < dificultad):
- Se aplican 2 de daño de contraataque al atacante si el defensor está en rango de ataque.

Si el HP de una unidad llega a 0, es eliminada.

## Condición de victoria

Gana el jugador que elimina al General enemigo.

### Distancia
La distancia entre dos casillas hexagonales se mide como el número mínimo de pasos entre hexágonos adyacentes necesarios para ir de una a la otra. Se utiliza para determinar:
- Alcance de ataques.
- Condiciones de habilidades.
- Cálculo de dificultad.
