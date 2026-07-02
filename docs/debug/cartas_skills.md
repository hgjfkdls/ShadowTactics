# Cartas y Habilidades — Descripciones en español

> Archivo de referencia para corregir terminología:
> - `stat='damage'` → reemplazar por `attack` (bono ofensivo) o `defense` (bono defensivo)
> - "ataque" = bono ofensivo que **aumenta** el daño causado
> - "defensa" = bono defensivo que **reduce** el daño recibido
> - "daño" = resultado final de `baseAttack + sum(attack) - sum(defense)`

---

## 1. Cartas de Identidad (15)

### robin_hood — Robin Hood
- **Clase**: Arquero
- **desc**: `Especial: Daño gratis por turno. Global: Arqueros móviles + sustain.`
- **descVerbose**:
  ```
  Forajido de Sherwood, roba a los ricos para dar a los pobres. Arquero certero y defensor del pueblo.

  Especial — En la mira (Pasiva)
  Tu General se considera arquero. Al comienzo de cada turno, elige una unidad enemiga e inflige 1 de daño sin coste. No puedes elegir al general enemigo.

  Global — Robar a los ricos (Pasiva)
  Tus arqueros tienen coste movimiento 1 y pierden acción evasiva. El primer arquero que acierta un ataque cada turno recupera 1 HP.
  ```

### francotirador — Francotirador del Bosque
- **Clase**: Arquero
- **desc**: `Especial: +1 rango habilidades de arquero. Global: Rango y precisión para arqueros.`
- **descVerbose**:
  ```
  Cazador solitario. Una flecha, un muerto. Nadie ve de dónde vino el disparo.

  Especial — Francotirador (Pasiva)
  Tu General se considera arquero. Tu General tiene +1 rango de habilidades de arquero.

  Global — Tiro a distancia (Pasiva)
  Tus arqueros obtienen +1 de rango para ataques básicos. Mejora Blanco fácil: -2 dificultad si el objetivo no se movió el turno anterior (en lugar de -1).
  ```

### dios_trueno — Dios del Trueno
- **Clase**: Infantería
- **desc**: `Especial: Bendice aliado [+3/+2/+1] + pasivas. Global: +1 daño al 50% HP.`
- **descVerbose**:
  ```
  Thor, el dios nórdico del trueno. Su martillo forja tormentas y bendice a los suyos con rayos divinos.

  Especial — Rayo celestial (coste 2)
  Tu General gana las pasivas Resistencia y Presión de infantería. Elige un aliado a rango ≤ 2: su siguiente ataque tiene +3 de ataque. El efecto termina después de ejecutar el ataque.

  Global — Furia berserker (Pasiva)
  El General y tus unidades de infantería tienen +1 de ataque mientras tengan 50% o menos de HP.
  ```
modificado, se cambia a paradigma de ataque en lugar de daño, ya no tiene reduccion de rayo celestial en cada uso pero aumenta su coste

### capitan_guardia — Capitán de la Guardia
- **Clase**: Infantería
- **desc**: `Especial: Contraataque + pasivas. Global: Presión al eliminar enemigos.`
- **descVerbose**:
  ```
  Veterano de mil batallas, lidera desde el frente. No pide a nadie lo que él no haría primero.

  Especial — Contraataque (Pasiva)
  Tu General gana las pasivas Resistencia y Presión de infantería. Una vez por turno del enemigo, si tu General recibe un ataque de rango 1, inflige 1 daño al atacante.

  Global — Liderar a las tropas (Pasiva)
  Si el General o una unidad de infantería a rango ≤ 2 del General elimina a un enemigo, todas tus unidades de infantería y el General activan Presión en el siguiente turno.
  ```
modificado: se cambia termino melee por rango 1 (estandarizacion), se cambia +1 de daño por inflinge 1 de daño (tal como robin hood es daño verdadero)

### caballos_guerra — Caballos de Guerra
- **Clase**: Caballería
- **desc**: `Especial: Cabalgar mejorado (coste progresivo). Global: Cabalgar sin línea recta.`
- **descVerbose**:
  ```
  Caballería pesada de choque. Galopar, impactar y romper la línea. No hay formación que resista una carga bien ejecutada.

  Especial — A la carga (coste progresivo: +0/+1/+2/+3)
  Tu General se considera caballería. Tu General puede avanzar 3 casillas (en lugar de 2) cuando usa Cabalgar hacia un enemigo. Cada activación aumenta su coste en 1 PA. [+0/+1/+2/+3]

  Global — Maniobras acrobáticas (Pasiva)
  Caballería puede ignorar línea recta al Cabalgar. Carga debe respetar la línea recta desde la última casilla avanzada por Cabalgar.
  ```

### cazadores — Cazadores
- **Clase**: Caballería
- **desc**: `Especial: +2 daño a unidades aisladas. Global: -1 dificultad a enemigos débiles.`
- **descVerbose**:
  ```
  Jinetes nómadas que rastrean a sus presas como lobos. Atacan al débil, al aislado, al que huye.

  Especial — Acechar (Pasiva)
  Tu General se considera caballería.
  Tu General tiene ataque +2 al atacar unidades que no tengan aliados adyacentes.
  Contra el General enemigo, el bono es +1 en lugar de +2.

  Global — Hostigar (Pasiva)
  Tus unidades de caballería tienen -1 dificultad al atacar a un enemigo con 50% de HP o menos.
  Tus unidades de caballería ganan la mitad del efecto de Acechar (no afecta al General enemigo) 
  ```
modificado: cambio de paradigma daño -> ataque, se agrega la mitad del efecto de acechar a caballeria, solo el general puede aplica acechar sobre el general rival

### punta_lanza — Punta de Lanza
- **Clase**: Lancero
- **desc**: `Especial: Torbellino (2 dmg área). Global: Proyección (daño detrás del objetivo).`
- **descVerbose**:
  ```
  La vanguardia del ejército. Su lanza es la primera en impactar y la última en retirarse.

  Especial — Torbellino (coste 3)
  Tu General se considera lancero. Dificultad 6. Inflige 2 de daño a todos los enemigos adyacentes. Fallo: 1 de daño a todos los adyacentes (excepto generales). No puede ser crítico.

  Global — Proyección (Pasiva)
  1 vez por turno, cuando un lancero acierta un ataque cuerpo a cuerpo, hace 1 de daño a las 2 casillas detrás del objetivo (en línea recta desde el atacante).
  ```

### espartano — Espartano
- **Clase**: Lancero
- **desc**: `Especial: Elegir rango o defensa cada turno. Global: -1 daño entre lanceros.`
- **descVerbose**:
  ```
  Guerrero de Esparta. Su escudo protege a su hermano. Su lanza alcanza al enemigo. La falange nunca retrocede.

  Especial — Lanza y escudo (Pasiva)
  Tu General se considera lancero. Una vez por turno, elige: rango +1, o defensa +1 hasta tu siguiente turno.

  Global — Muro espartano (Pasiva)
  Tus lanceros adyacentes entre sí reciben -1 de daño.
  ```
modificado: cambio paradigma reduccion daño -> defensa

### monje_shaolin — Monje Shaolin
- **Clase**: General
- **desc**: `Especial: Curación + Resistencia condicional. Global: Karma (daño al asesino).`
- **descVerbose**:
  ```
  Monje del templo Shaolin. Años de disciplina forjan su cuerpo como arma. Mente en calma, puño de hierro.

  Especial — Meditación (coste variable)
  Si no usaste meditación en tu turno, tu General gana gana +1 de defensa hasta el proximo turno.
  Durante tu turno, puedes usar 2 PA para curar 3 HP a tu General (sin límite de usos por turno).

  Global — Karma (Pasiva)
  Cuando una unidad aliada es eliminada, la unidad que la eliminó recibe 2 de daño.
  ```
modificado: cambio de paradigma y mecanica, reduccion daño -> defensa, karma sigue funcionando por daño (ignora defensa) además he aumentado a 2 el daño de karma

### corazon_estratega — Corazón de Estratega
- **Clase**: General
- **desc**: `Especial: Movimiento gratuito 1 casilla. Global: Bonos por formación (línea/triángulo).`
- **descVerbose**:
  ```
  Mente maestra del campo de batalla. Mueve sus piezas con precisión y saca ventaja de cada formación.

  Especial — Posición estratégica (Pasiva)
  Una vez por turno, tu General puede moverse 1 casilla sin coste de PA. La casilla destino debe estar adyacente a un aliado.

  Global — Formaciones tácticas (Pasiva)
  Tus unidades ganan bonificaciones según su formación:
  - Línea: si hay 3 o más unidades aliadas adyacentes en línea recta, todas reciben +1 defensa en el turno del enemigo.
  - Triángulo: si 3 unidades aliadas están adyacentes entre sí (grupo cerrado), todas tienen ataque +1 durante tu turno.
  ```
modificado: cambio de paradigma daño -> ataque y reduccion de daño -> defensa

### comandante_supremo — Comandante Supremo
- **Clase**: General
- **desc**: `Especial: Mover aliado gratis + potenciar. Global: Plan de batalla (+1 atk o -1 dmg).`
- **descVerbose**:
  ```
  General veterano que ha dirigido innumerables batallas. Su experiencia le permite leer el campo como nadie.

  Especial — Voz de mando (Pasiva)
  La primera vez que mueves a tu General en tu turno, puedes mover a una unidad aliada 1 casilla sin coste de PA. Esa unidad recibe el doble del efecto de Plan de batalla (+2 ataque o -2 defensa).

  Global — Plan de batalla (Pasiva)
  Al inicio de tu turno, elige una orden para tu ejército hasta tu siguiente turno:
  - Avanzar: el primer ataque de cada unidad este turno tiene +1 de ataque.
  - Reagruparse: la primera vez que cada unidad es atacada (hasta tu siguiente turno), tiene +1 de defensa.
  ```
modificado: cambio de paradigma daño -> ataque y reduccion de daño -> defensa

### inspiracion_real — Inspiración Real
- **Clase**: General
- **desc**: `Especial: Ataque 5 + escudo 3 HP a aliado. Global: +1 atk / -1 dmg a adyacentes.`
- **descVerbose**:
  ```
  La realeza en el campo de batalla. No es el más fuerte, pero su presencia convierte a hombres comunes en héroes.

  Especial — En nombre del rey (coste 2)
  Elige un aliado a rango ≤ 2. Hasta tu siguiente turno, ese aliado tiene ataque +2 y un escudo de 3 HP (absorbe daño primero). El General no puede atacar este turno.

  Global — Guardia real (Pasiva)
  Unidades que iniciaron el turno adyacentes al General tienen +1 de ataque y +1 de defensa. Al atacar o recibir daño, pierden ambas bonificaciones.
  ```
modificado: cambio de paradigma daño -> ataque y reduccion de daño -> defensa

### furia_tirano — Furia del Tirano
- **Clase**: General
- **desc**: `Especial: Sacrificar aliado para curarse. Global: Terror (+1 dificultad a enemigos cercanos a la eliminación).`
- **descVerbose**:
  ```
  General tirano que ve a su ejército como herramientas. No duda en sacrificarlos si eso le acerca a la victoria.

  Especial — Sacrificar (coste 1)
  Elige un aliado a rango 1. Recibe 2 de daño y el General recupera 3 HP. Si el aliado muere, el General recupera 5 HP.

  Global — Terror (Pasiva)
  Cuando un aliado elimina a un enemigo a rango 1, los enemigos adyacentes al atacante o al objetivo tienen dificultad +1 en su siguiente ataque (persiste hasta que ataquen).
  ```
decision: mantener, esta identidad funciona por daño, independiente de ataque y defensa

### samurai — Samurái
- **Clase**: General
- **desc**: `Especial: Desenvainado veloz (inmoviliza, reset en kill). Global: +1 PA por kill a rango 1.`
- **descVerbose**:
  ```
  Guerrero de élite, forjado por años de disciplina. Su katana es precisa, su espíritu inquebrantable.

  Especial — Desenvainado veloz (coste 1)
  -1 dificultad. Si acierta, el objetivo no puede moverse en su siguiente turno (puede atacar). Se resetea si elimina al objetivo. Si el hex detrás del objetivo está vacío, puedes ocuparlo.

  Global — Camino del guerrero (Pasiva)
  Una vez por turno, cuando un aliado elimina a un enemigo a rango 1, recuperas 1 PA.
  ```

### escudo_comandante — Escudo del Comandante
- **Clase**: General
- **desc**: `Especial: Ángel Guardián (+2 HP aliados). Global: Proteger (-1 daño a aliado rango ≤ 3).`
- **descVerbose**:
  ```
  Protector nato. Su misión no es vencer al enemigo, sino asegurarse de que todos los suyos vuelvan a casa.

  Especial — Ángel Guardián (coste 2)
  Todos tus aliados (excepto el General) reciben un escudo de +2 HP hasta tu siguiente turno.

  Global — Proteger (coste 0)
  Elige un aliado a rango ≤ 3. Este aliado tiene +1 de defensa hasta tu siguiente turno. Si no usas esta habilidad durante tu turno, el efecto se otorga al General automáticamente.
  ```
modificado: cambio de paradigma reduccion de daño -> defensa

---

## 2. Cartas de Efecto (13)

### BUFF (5)

| ID | Nombre | Descripción |
|----|--------|-------------|
| movilidad | Movilidad | `El siguiente movimiento de una unidad cuesta 0 PA.` |
| ataque_extra | Ataque extra | `Reinicia el ataque básico de una unidad aliada. El siguiente ataque básico no cuesta PA, tiene +1 de ataque y +2 de dificultad. Los bonos se consumen al atacar (acierte o no). Si usa una habilidad, los bonos no se aplican.` |
| precision | Precisión | `-2 dificultad al siguiente ataque básico de una unidad aliada. Se consume al atacar (acierte o no). Si usa una habilidad, el bono no se aplica.` |
| flechas_fuego | Flechas de fuego | `El siguiente ataque del jugador tiene +1 de ataque. Además, el objetivo recibe 1 de daño pasivo al inicio de los 2 siguientes turnos del jugador.` |
| inspiracion_tropa | Inspiración de tropa | `+1 PA.` |
modificado: cambio de paradigma daño -> ataque en ataque extra y flechas de fuego (el daño pasivo sigue siendo daño porque no se afecta por defensa)

### DEBUFF (5)

| ID | Nombre | Descripción |
|----|--------|-------------|
| bajar_moral | Bajar la moral | `-1 PA al oponente en su turno.` |
| pantano | Pantano | `El primer movimiento del oponente cuesta el doble de PA en su siguiente turno.` |
| mantenimiento | Mantenimiento de equipo | `El primer ataque del oponente tiene -1 de ataque.` |
| confusion | Confusión en la retaguardia | `Una unidad enemiga elegida no puede mover ni atacar en su próximo turno.` |
| miedo | Miedo | `El primer ataque del oponente cuesta +1 PA en su siguiente turno.` |
modificado: cambio de paradigma daño -> ataque en mantenimiento de equipo, descripciones de algunas cartas modificadas pero sin cambios importantes

### COUNTER (3)

| ID | Nombre | Descripción |
|----|--------|-------------|
| panacea | Panacea | `Cancela el debuff que acaba de jugar el oponente.` |
| ladron | Ladrón | `Si el rival juega una carta. La carta pasa a tu mano y puedes usarla en tu turno.` |
| espejo | Espejo | `Si el rival juega un debuff. El debuff se refleja y aplica al rival.` |
modificado: cambios menores en la descripcion de cartas (efecto es el mismo)
---

## 3. Habilidades de Clase

### Arquero (4)

| ID | Nombre | Tipo | Descripción |
|----|--------|------|-------------|
| blanco_facil | Blanco fácil | Pasiva | `Si el objetivo no se movió el turno anterior, -1 dificultad` |
| patada_acrobatica | Patada acrobática | Activa (1 PA) | `Si el arquero está adyacente a un enemigo, hace 1 de daño y se mueve a una casilla adyacente no ocupada que no esté adyacente al enemigo` — *Restricción: Requiere enemigo adyacente y casilla de escape disponible* |
| fuego_cobertura | Fuego de cobertura | Activa (2 PA) | `Si impacta, inflige 2 de daño y el objetivo tiene coste +1 en su próximo turno (max 2 acciones)` — *Restricción: 1 vez por turno por arquero, no se acumula* |
| accion_evasiva | Acción evasiva | Activa (1 PA) | `Si hay enemigos adyacentes al inicio del turno, reemplaza al primer movimiento` |

### Caballería (4)

| ID | Nombre | Tipo | Descripción |
|----|--------|------|-------------|
| romper_filas | Romper filas | Pasiva | `Ignora Resistencia y Línea defensiva de la infantería` |
| cabalgar | Cabalgar | Activa (1 PA) | `Mueve 2 casillas en línea recta. Reemplaza el movimiento normal` — *Restricción: 1 vez por turno*: Solo disponible como primera acción de la unidad en el turno |
| carga | Carga | Activa (1 PA) | `Tras Cabalgar, ataque con -1 dificultad y +1 ataque en la misma línea recta` — *Restricción: Reemplaza al ataque básico, también habilita doble ataque |
| doble_ataque | Doble ataque | Activa (1 PA) | `Realiza un segundo ataque básico contra el mismo objetivo con -1 ataque` |
modificado: cambio de paradigma daño -> ataque, cambios en las restricciones para fomentar el uso de carga

### Lancero (4)

| ID | Nombre | Tipo | Descripción |
|----|--------|------|-------------|
| anti_caballeria | Anti-caballería | Pasiva | `Ataque básico a caballería, +1 ataque` |
| formacion_defensiva | Formación defensiva | Pasiva | `Anula el bono de Carga (dificultad y ataque)` |
| ventaja_alcance | Ventaja de alcance | Activa (1 PA) | `Reemplaza el ataque básico. Ataque a rango +1` — *Restricción: No puede combinarse con Doble ataque. Reemplaza el ataque básico* |
| doble_ataque | Doble ataque | Activa (1 PA) | `Realiza un segundo ataque básico contra el mismo objetivo con -1 ataque` |
modificado: cambio de paradigma daño -> ataque, formacion defensiva sigue como daño, ya que ese +1 daño no es afectado por ataque o defensa

### Infantería (4)

| ID | Nombre | Tipo | Descripción |
|----|--------|------|-------------|
| resistencia | Resistencia | Pasiva | `La primera vez que recibes daño en un turno, +1 defensa` |
| linea_defensiva | Línea defensiva | Pasiva | `Si no te moviste en tu turno anterior, +1 defensa este turno. No se acumula con Resistencia` |
| presion | Presión | Pasiva | `Si ataca al mismo objetivo que el turno anterior, +1 ataque` |
| ejecutar | Ejecutar | Activa (1 PA) | `Si el enemigo tiene 2 HP o menos tu siguiente ataque ignora defensa, permite ocupar su posición` |
modificado: cambio de paradigma daño -> ataque y reduccion de daño -> defensa, se cambia habilidad avance por ejecutar, que tiene el mismo efecto de ocupar posicion pero tambien ejecuta enemigos con 2hp o menos

---

## 4. Habilidades de Identidad (Generales)

### Inspiración Real
| ID | Nombre | Tipo | Descripción |
|----|--------|------|-------------|
| en_nombre_del_rey | En nombre del rey | Activa (2 PA) | `Un aliado a rango ≤ 2 obtiene +2 ataque y escudo 3 HP hasta tu siguiente turno. El General no puede atacar este turno.` — *Restricción: 2 PA. El General queda marcado como que ya ha atacado este turno.* |
modificado: en luugar de ataque 5. es un bono de +2 ataque

### Corazón de Estratega
| ID | Nombre | Tipo | Descripción |
|----|--------|------|-------------|
| posicion_estrategica | Posición estratégica | Activa (0 PA) | `Mueve a tu General 1 casilla a una posición adyacente a un aliado` — *Restricción: 1 vez por turno. El destino debe estar adyacente a un aliado.* |

### Monje Shaolin
| ID | Nombre | Tipo | Descripción |
|----|--------|------|-------------|
| meditacion | Meditación | Activa (2 PA) | `Si no usaste meditación en tu turno, tu General gana gana +1 de defensa hasta el proximo turno. Activar, Recupera 3 HP a tu General. Sin límite de usos por turno.` — *Restricción: El General debe tener al menos 2 PA disponibles y no estar full hp.* |
modificado: agrega defensa si no se cura.

### Samurái
| ID | Nombre | Tipo | Descripción |
|--hasta el proximo turno | Activa (1 PA) | `-1 dificultad. Si acierta, el objetivo no puede moverse en su siguiente turno (puede atacar). Se resetea si elimina al objetivo.` — *Restricción: 1 vez por turno. Si el hex detrás del objetivo está vacío, puedes ocuparlo al impactar.* |
| camino_del_guerrero | Camino del guerrero | Pasiva | `Una vez por turno, cuando un aliado elimina a un enemigo a rango 1, recuperas 1 PA.` |

### Escudo del Comandante
| ID | Nombre | Tipo | Descripción |
|----|--------|------|-------------|
| angel_guardian | Ángel Guardián | Activa (2 PA) | `Todos los aliados reciben un escudo de 2 HP hasta tu siguiente turno.` |
| proteger | Proteger | Activa (0 PA) | `Un aliado a rango ≤ 3 recibe +1 defensa hasta tu siguiente turno. Se acumula con otras defensas (Resistencia, Línea defensiva). Si no se usa, el efecto va al General.` |

### Furia del Tirano
| ID | Nombre | Tipo | Descripción |
|----|--------|------|-------------|
| sacrificar | Sacrificar | Activa (1 PA) | `Un aliado a rango 1 recibe 2 de daño. El General recupera 3 HP. Si el aliado muere, recupera 5 HP.` — *Restricción: No puede usarse si el General está a full HP.* |
| terror | Terror | Pasiva | `Cuando un aliado elimina a un enemigo a rango 1, los enemigos adyacentes al atacante o al objetivo tienen dificultad +2 en su siguiente ataque.` |
modificado: cambio paradigma en lugar de perder hp, el aliado recibe daño (no afecto a defensa), ademas se aumenta el valor de terror a +2 dificultad

### Identidad-only (no clase general)

| ID | Nombre | Identidad | Tipo | Descripción |
|----|--------|-----------|------|-------------|
| cabalgar_2 | Cabalgar | Caballos de Guerra | Activa (1 PA) | `Avanza 2 casillas contiguas. Al finalizar, puedes usar Carga.` |
| torbellino | Torbellino | Punta de Lanza | Activa (3 PA) | `Dificultad 6. Inflige 2 de daño a todos los enemigos adyacentes. Fallo: 1 de daño a todos los adyacentes (excepto generales). No puede ser crítico.` — *Restricción: 1 vez por turno. No puede ser crítico (11-12 hacen daño normal). Afecta a todas las casillas a rango 1.* |
| a_la_carga | A la carga | Caballos de Guerra | Activa (prog.) | `Potencia Cabalgar: avanza 3 casillas en lugar de 2. El coste aumenta con cada uso.` — *Restricción: Coste progresivo: +0/+1/+2 (se mantiene en 2). Solo hacia un enemigo.* |
| rayo_celestial | Rayo celestial | Dios del Trueno | Activa (2 PA) | `Elige un aliado a rango ≤ 2. Su siguiente ataque tiene +3 de ataque. El efecto termina después de ejecutar el ataque.` |
modificado:
cabalgar_2 ahora dice 2 casillas en lugar de 2-3, es a_la_carga lo que habilita 3 casillas
rayo_celestial: ahora ataque no disminuye con cada uso, coste aumentado a 2
---

## 5. Etiquetas y textos de UI relacionados

### passive labels (es.ts)
```
blancoFacil: 'Blanco fácil'
presion: 'Presión (+1 ataque)'
anticaballeria: 'Anti-caballería (+1 ataque)'
lineaDefensiva: 'Línea defensiva (+1 defensa)'
resistencia: 'Resistencia (+1 defensa)'
meditacion: 'Meditación (+1 defensa)'
formacionLinea: 'Formación línea (+1 defensa)'
formacionTriangulo: 'Formación triángulo (+1 ataque)'
guardiaRealAtk: 'Guardia real'
guardiaRealDef: 'Guardia real'
proteger: 'Proteger (+1 defensa)'
contraataque: 'Contraataque (acierto: +1, fallo: +3)'
acechar: 'Acechar'
furiaBerserker: 'Furia berserker (+1 ataque)'
lanzaEscudoRango: 'Lanza y escudo (+1 rango)'
lanzaEscudoDefensa: 'Lanza y escudo (+1 defensa)'
muroEspartano: 'Muro espartano (+1 defensa)'
ataqueExtra: 'Ataque extra (+1 ataque, +2 dificultad, 0 PA)'
precision: 'Precisión (-2 dificultad)'
damageAbbr: 'daño'
attackAbbr: 'ataque'
```

### cat labels (categorías de modificadores)
```
diff: 'Dificultad'
atk: 'Ataque'
range: 'Rango'
def: 'Defensa'
pa: 'PA'
mixed: 'Mixto'
other: 'Otros'
```

---

## Fuentes de datos

| Archivo | Contenido |
|---------|-----------|
| `src/shared/i18n/resources/es.ts` | Traducciones ES de abilities (líneas 25-54), cards (56-70), identities (72-103), passive labels (414-456) |
| `src/shared/game/data/abilities.ts` | `ABILITIES` record + `CLASS_ABILITIES` mapping |
| `src/shared/game/actions/card.ts` | `CARD_TEMPLATES` con 13 cartas de efecto |
| `src/client/prep/identityData.ts` | `IDENTITY_INFO` con descripciones de identidad en ES |
