# Propuesta de mejoras — Protección del general y valor de las unidades normales

## Problema detectado

Actualmente la victoria se decide **exclusivamente por la muerte del general** (20 HP, ataque 4, dificultad 6, rango 1, movimiento 1). Un jugador puede ignorar al grueso del ejército enemigo, acorralar al general con 2-3 unidades y eliminarlo en 1-2 turnos. Las unidades normales (arquero/infantería/caballería/lancero) pierden relevancia estratégica porque no hay consecuencias por ignorarlas.

---

## Propuestas (de menor a mayor impacto)

### 1. Aumentar la durabilidad base del general

**Cambio:** General pasa de 20 → **30 HP** (50% más).

**Ventaja:** Simple, no requiere nuevo código. Obliga a dedicar más ataques para matarlo, dando tiempo al rival para reaccionar.

**Inconveniente:** No resuelve el fondo — seguiría siendo óptimo ignorar unidades. Solo alarga la partida.

**Valoración:** Medida parche, no recomendada como solución única.

---

### 2. Retrasar el despliegue del general

**Cambio:** El general se despliega **al final** (slot 12, después de que el rival haya desplegado 6-7 unidades). También: el general debe desplegarse **adyacente a al menos 2 aliados** (no puede quedar aislado en el borde).

**Ventaja:** El rival no puede ver dónde cae el general hasta bien entrada la fase de despliegue, lo que obliga a desplegar pensando en las unidades normales primero.

**Valoración:** ✅ Complemento útil. Bajo coste de implementación.

---

### 3. Aura de mando — sinergia recíproca general ↔ unidades

**Mecánica:** El general proyecta un **aura de radio 2** (hexágonos). Dentro del aura:

- Las **unidades aliadas** reciben **+1 ataque** y **-1 daño recibido**.
- El **general** recibe **-1 daño por cada unidad aliada en el aura** (mínimo 1 de daño).

**Efecto:** Con 2 unidades cerca del general, este recibe -2 de daño (un ataque de 3 pasa a 1). Con 0 unidades alrededor, el general es tan frágil como ahora.

**Por qué funciona:** El atacante debe **decidir entre**:
- Matar primero a las escoltas (reduce la protección del general pero gasta turnos).
- Ignorar las escoltas (el general recibe menos daño porque están vivas).

**Valoración:** ✅✅ Solución estratégica que da valor a las unidades sin añadir casi complejidad. Se implementa en `ability-effects.ts` como un modificador evaluado dinámicamente (similar a formaciones o muro espartano).

---

### 4. Victoria por puntos — condición alternativa

**Mecánica:** Además de matar al general, se puede ganar por **eliminación completa** del ejército enemigo (12 de 13 unidades). Si ambos generales siguen vivos al llegar a ronda 15, gana quien tenga más puntos de ejército (suma de HP restante de todas las unidades).

**Efecto:** Ignorar unidades normales ya no es gratis — si dejas a 12 unidades vivas y matas al general, ganas. Pero si el general sobrevive y tú has perdido 10 unidades, puedes perder por puntos en ronda 15.

**Valoración:** ✅ Complemento interesante pero requiere UI (mostrar puntuación/historial de bajas). No resuelve el rush al general por sí solo.

---

### 5. Desgaste de guardia — capa de protección

**Mecánica:** El general tiene una capa de **«guardia»** que absorbe los primeros N puntos de daño por turno, donde N = **número de unidades aliadas en radio 2** (máx 6). La guardia se regenera al inicio de cada turno.

**Ejemplo:** Si hay 3 aliados cerca del general, los primeros 3 puntos de daño que reciba en ese turno no le afectan. Un ataque de 4 solo hace 1 de daño real.

**Valoración:** ✅ Similar al aura pero más intuitiva (escudo visual). Más trabajo de UI.

---

### 6. Penalización por aislar al general — daño reflejado

**Mecánica:** Cuando una **unidad enemiga ataca al general sin tener aliados enemigos adyacentes al general**, recibe 1 de daño reflejado (el general «se defiende» mejor cuando está solo).

**Efecto:** Para acorralar al general necesitas al menos 2 unidades atacando en tándem, o el daño se divide.

**Valoración:** ⚠️ Solución parcial — no evita que 2 unidades sigan pudiendo focus al general. Podría combinarse con el aura.

---

## Combinación recomendada

Para máxima efectividad con mínima complejidad:

| # | Cambio | Prioridad | Esfuerzo |
|---|--------|-----------|----------|
| 2 | General se despliega al final + debe estar junto a aliados | Alta | Bajo |
| 3 | Aura de mando recíproca (general protege y es protegido) | Alta | Medio |
| 4 | Victoria por eliminación total + límite de rondas | Media | Medio |

### Flujo de partida tras los cambios

1. **Despliegue:** Ambos jugadores posicionan sus 10 unidades. El general se despliega el 11º, obligado a estar junto a al menos 2 aliados. Esto fuerza a pensar la formación desde el principio.

2. **Desarrollo:** Las unidades normales protegen al general (aura). El atacante debe decidir si desgastar la escolta primero (reduce protección) o arriesgar un ataque directo menos efectivo.

3. **Final:** Si consigues aislar al general (matar su escolta), se vuelve vulnerable. Pero matar la escolta toma tiempo, durante el cual el defensor puede contraatacar con sus unidades potenciadas por el aura.

### Coste de implementación estimado

- **Aura de mando**: ~30 líneas en `ability-effects.ts` + limpieza en `turn.ts` (similar a formaciones).
- **Despliegue tardío**: ~10 líneas en `deployment.ts` (validación de posición y orden).
- **Victoria por eliminación**: ~15 líneas en `reducer.ts` + check en `applyAction` (similar a `checkGeneralKilled`).

---

## Alternativa futura: identidades que interactúen con el aura

Si el sistema de aura funciona, cada identidad podría especializarlo:

| Identidad | Efecto sobre el aura |
|-----------|---------------------|
| Corazón de Estratega | Aura radio 3 |
| Escudo del Comandante | -1 daño extra dentro del aura |
| Furia del Tirano | Unidades en aura +2 ataque (sin defensa extra) |
| Inspiración Real | General recibe -2 por aliado en vez de -1 |

Esto añadiría profundidad sin complejidad excesiva.

---

## Propuesta específica: bonos por clase en escolta

Tras discutirlo, surge una idea más refinada que el aura genérica: **cada clase aporta un bono específico al general si está en radio ≤2**, con un máximo de 2 unidades por clase. Además, el general baja a **ataque base 3** (antes 4) para que los bonos sean realmente necesarios.

### Diseño

| Clase | Bono al general (por unidad, máx 2) | Justificación |
|-------|--------------------------------------|---------------|
| 🏹 Arquero | `ataque +1` (máx +2 → ataque 5) | Clase ofensiva por excelencia |
| 🔱 Lancero | `daño recibido -1` (máx -2) | Clase cuerpo a cuerpo defensiva |
| 🛡️ Infantería | `escudo +1 por turno` (máx +2, se consume antes que el HP) | Clase tanque — absorbe daño |
| 🐎 Caballería | `dificultad enemiga +1 al atacar al general` (máx +2) | Clase más móvil — hostiga al atacante |

### Cómo funciona en la práctica

**Turno 1 — ejército intacto:**
El general sale con 2 infantes cerca (escudo +2), 1 lancero (-1 daño) y 1 arquero (+1 ataque, ataque total 4). Atacar al general requiere primero superar el escudo de 2, luego el daño se reduce en 1, todo con dificultad base 6. Un ataque de 3 que acierte haría: 3 - 1 (lancero) = 2 daño al escudo (no al HP). El general aguanta varios turnos.

**Turno 4 — escolta reducida:**
El atacante mató a los 2 infantes y al lancero. Solo queda 1 arquero cerca. El general tiene ataque 4 (3+1), pero sin escudo ni reducción de daño. Ahora es vulnerable — 2 unidades enemigas pueden acorralarlo en 1-2 turnos.

**Escenario de rush al general:**
Si el atacante ignora a las unidades y va directo al general desde el principio, se enfrenta a: escudo +2, daño -1, dificultad +2 (si hay 2 caballerías cerca). Sus ataques harán poco daño real durante varios turnos, tiempo durante el cual las unidades del defensor, potenciadas por el aura, contraatacan.

### Lo que resuelve

- **Cada clase tiene un rol específico** cerca del general, no son intercambiables.
- **El atacante tiene que decidir** a qué escolta eliminar primero según qué bono quiera anular.
- **Aislar al general** requiere desgastar su escolta, lo que da tiempo al defensor para reaccionar.
- **El general sin escolta** es más débil que ahora (ataque 3 vs 4), incentivando mantenerlo protegido.

### Consideraciones de implementación

- Los bonos se evalúan **dinámicamente** en el momento del ataque (contar unidades en radio ≤2 del general).
- El **escudo de infantería** se otorga al **inicio del turno del jugador** como un `bonusHp` que se消耗 primero.
- La **dificultad extra de caballería** se aplica como modificador en `applyDifficultyAbilities`.
- Máx 2 por clase evita stacking extremo y da un límite claro.

### ¿Por qué mejor que el aura genérica?

| Aspecto | Aura genérica | Bonos por clase |
|---------|--------------|-----------------|
| Profundidad estratégica | Media — todas las unidades valen igual | Alta — cada clase tiene un rol distinto |
| Decisión del atacante | «Mato cualquier unidad» | «Mato primero a los lanceros para hacer más daño» |
| Identidad de clase | Difusa | Cada clase se siente única |
| Contador | Difícil de trackear visualmente | Fácil — cada bono se asocia a un icono de clase |

### Contras y riesgos

- **Mayor complejidad** que el aura genérica. Hay que explicar 4 bonos distintos.
- **Desequilibrio potencial**: si una clase es mucho más fácil de matar que su bono es valioso, podría sesgar las decisiones.
- **UI necesaria**: indicadores visuales de qué bonos están activos (similar a los indicadores de pasivas actuales).
- **Sinergias de identidad**: habría que revisar si alguna identidad rompe los bonos (exceso de ataque, dificultad inmune, etc.).

### Veredicto

La propuesta de bonos por clase es **superior en profundidad estratégica** al aura genérica, a costa de ser ligeramente más compleja. Dado que el juego ya tiene 15 identidades con habilidades específicas, este nivel de detalle es coherente con el diseño existente. Recomendado como reemplazo del punto 3 de la combinación anterior.
