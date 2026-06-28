# Estrategia de desacople por capas

Basado en el análisis del código actual del proyecto Shadow Tactics.

## Diagnóstico actual

El código tiene acoplamientos fuertes en varias direcciones:

- **`HexBoard.tsx`** (~1300 líneas) mezcla lógica de tablero, selección, targeting, animaciones, teclas, paneles. Es el punto de mayor acoplamiento.
- **`UnitsLayer.tsx`** (~735 líneas) mezcla renderizado de unidades con cálculo de pasivas, tooltips, indicadores visuales y lógica de targeting.
- **`state.ts`** es el único modelo compartido — cualquier capa nueva necesita tocar el state, lo que genera dependencias.
- **`reducer.ts`** centraliza toda la mutación de estado. Las capas no pueden reaccionar a eventos sin pasar por el reducer.
- Las **animaciones** (animPath, animStep, animTimerRef en HexBoard) están implementadas inline con setTimeout y refs, sin abstracción.
- No hay sistema de **internacionalización** — todos los strings están hardcodeados en español.

---

## Capas propuestas

### 1. Board Layer (`@shared/game/`)

**Responsabilidad**: modelo del tablero, unidades, posiciones, geometría hexagonal, estado de juego.

**Ya existe como**: `state.ts`, `hex.ts`, `units/`, `map/`.

**Desacople necesario**:
- Extraer toda la lógica de `state.ts` que no sea puramente datos (helpers de filtrado, búsqueda, conteo) a módulos separados bajo `@shared/game/utils/`.
- El `GameState` debe ser una interfaz plana de datos, no un modelo de dominio con métodos.

**Ejemplo de separación**:

```
@shared/game/
  state.ts            → solo tipos e interfaz GameState
  board/
    hex.ts             → geometría, distancia, vecinos
    map.ts             → generación de mapa, bounds
  units/
    stats.ts           → stats base por clase
    factory.ts         → createUnit
  utils/
    filters.ts         → countPlayerClasses, findPoolEntry, etc.
    combat-checks.ts   → canCounterattack, isInRange, getDifficulty
```

---

### 2. Modifier Layer (`@shared/game/modifiers/`)

**Responsabilidad**: ciclo de vida de modificadores: creación, aplicación, consumo, expiración por turnos.

**Ya existe como**: `modifiers/engine.ts`, `modifiers/types.ts`.

**Estado actual**: bien encapsulado. `addModifier`, `consumeModifier`, `getModifierSum` y `processModifiersAtTurnStart` son funciones puras que reciben y retornan `GameState`.

**Desacople necesario**:
- Los modificadores deben poder tener `source` y `sourceName` (ya implementado).
- Separar la lógica de persistencia de la lógica de negocio: los modificadores son datos en `activeModifiers[]`, las reglas de cómo se aplican están en `engine.ts`.
- Las habilidades pasivas (Resistencia, Línea defensiva, etc.) actualmente se evalúan en `resolver.ts` y `ability-effects.ts` mirando `unit.abilities`. No son modificadores reales. Esto es correcto: las pasivas son intrínsecas a la unidad, no efectos externos.

**Futuro**: si se necesitan modificadores con efectos visuales (partículas, cambio de color), el `source`/`sourceName` permite hacer lookup a una tabla de efectos.

---

### 3. Actions Layer (`@client/game/`)

**Responsabilidad**: interacciones del usuario: selección de unidades, targeting, activación de habilidades/cartas.

**Ya existe como**: `HexBoard.tsx`, `useBoardInteraction.ts`, `ActionPanel.tsx`, `UnitsLayer.tsx`.

**Problema actual**: todo está en HexBoard. La selección, el targeting, las teclas, los paneles, las animaciones, los resultados de ataque, los modales — todo coexiste en un solo componente de ~1300 líneas.

**Estrategia de desacople**:

1. **`useBoardInteraction`** ya extrae hoveredHex, selectedHex, selectedUnitId. Extenderlo a un hook central de selección:
   - `useSelection()` → maneja selectedUnitId, selectedInfo, movingUnitId, attackingUnitId, pendingAbility
   - Emite eventos cuando cambia la selección para que otras capas reaccionen

2. **Los modales y paneles** (CounterPrompt, OccupationPanel, EspartanoChoice, PlanBatalla, EndTurn) deben ser componentes independientes que se renderizan condicionalmente desde `App.tsx` o desde un `GameOverlay` separado, no desde `HexBoard`.

3. **CardTarget y AbilityTarget** deben ser estados manejados por `useSelection()` y renderizados por `HexTile` mediante props, no mediante lógica inline en `onHexClick`.

4. **Separar `onHexClick`**: actualmente tiene un switch gigante con 15+ casos. Cada caso debe ser un handler independiente:
   - `handleDeployClick`
   - `handleMoveClick`
   - `handleAttackClick`
   - `handleAbilityClick`
   - `handleCardClick`
   - `handleCounterClick`
   - `handleIdentityClick`

**Ejemplo de estructura futura**:

```
@client/game/
  board/
    HexBoard.tsx         → orquestador, ~300 líneas
    HexTile.tsx          → presente
    UnitsLayer.tsx       → presente, simplificado
    useBoardInteraction.ts → presente, extendido a useSelection
    useKeyBindings.ts    → ya existe como KeyBindingsContext
    handlers/
      handleMove.ts      → lógica de click para movimiento
      handleAttack.ts    → lógica de click para ataque
      handleAbility.ts   → lógica de click para habilidades
      handleCard.ts      → lógica de click para cartas
      handleDeploy.ts    → lógica de click para despliegue
  layout/
    ActionPanel.tsx      → presente
    HistoryPanel.tsx     → presente
    PlayerSidebar.tsx    → presente
    RightPanel.tsx       → presente
    Modals/
      CounterPrompt.tsx
      OccupationPanel.tsx
      EspartanoChoice.tsx
      PlanBatalla.tsx
      EndTurnBtn.tsx
```

---

### 4. Animation Layer (`@client/game/animation/`)

**Responsabilidad**: ejecutar secuencias visuales (movimiento step-by-step, ataques, curaciones, partículas) sin acoplar la lógica de juego a los tiempos de animación.

**Estado actual**: las animaciones están implementadas inline en `HexBoard.tsx` con:
- `animPath`, `animStep`, `animTimerRef`, `animStartPos`, `animUnitId`
- `setTimeout` para step-by-step
- `animPositions` → `UnitsLayer` para renderizar posición animada

Esto está acoplado al ciclo de vida de `HexBoard` y no puede reutilizarse.

**Estrategia**:

1. **`AnimationContext`**: un contexto que expone `queueAnimation(anim: Animation)` y un estado `activeAnimations: Animation[]`.
   - Cualquier acción (move, attack, heal, counter, karma) puede encolar una animación.
   - `Animation` es una unión discriminada:
     ```typescript
     type Animation =
       | { type: 'move'; unitId: string; path: HexCoord[] }
       | { type: 'attack'; attackerId: string; targetId: string }
       | { type: 'damage'; targetId: string; amount: number }
       | { type: 'heal'; targetId: string; amount: number }
       | { type: 'particle'; effect: string; position: HexCoord }
     ```

2. **`AnimationEngine`**: procesa la cola secuencialmente, emitiendo eventos por paso:
   - `onStep(unitId, position)` → `UnitsLayer` actualiza posición renderizada
   - `onComplete()` → siguiente animación en cola

3. **Desacople**: `HexBoard` solo encola animaciones. No maneja `setTimeout` ni refs de temporizador. `UnitsLayer` recibe posiciones animadas desde `AnimationContext`, no desde props de HexBoard.

4. **Partículas**: cuando se implementen, se añade un tipo `particle` a `Animation` y se renderiza con un sistema de partículas (p.ej. PixiJS overlay) sin tocar el resto del juego.

**Ejemplo de uso**:

```typescript
// En handleMove, después de enviar la acción:
animationQueue.enqueue({
  type: 'move',
  unitId: unit.id,
  path: [unit.position, to]
});
```

---

### 5. Labels Layer (`@shared/i18n/`)

**Responsabilidad**: todos los strings visibles al usuario deben pasar por un sistema de traducción.

**Estado actual**: cero internacionalización. Strings en español hardcodeados en:
- `abilities.ts` (description, restrictions)
- `card.ts` (CARD_TEMPLATES.name, description)
- `identityData.ts` (desc, descVerbose)
- `PlayerSidebar.tsx` (CLASS_DISPLAY, statusLabel)
- `ActionPanel.tsx` (labels de botones)
- `HistoryPanel.tsx` (CLASS_LABELS, textos fijos)
- `RightPanel.tsx` (CLASS_DISPLAY, statusLabel)
- Todos los mensajes de alerta en `addAlert`

**Estrategia**:

1. **Archivos de recursos**: crear `@shared/i18n/es.ts` con todos los strings, usando claves jerárquicas:
   ```typescript
   export const es = {
     unit: {
       class: {
         archer: 'Arquero',
         infantry: 'Infantería',
         cavalry: 'Caballería',
         lancer: 'Lancero',
         general: 'General',
       },
       status: {
         movementCost: 'Coste movimiento alterado',
         attack: 'Ataque potenciado',
         // ...
       }
     },
     card: {
       movilidad: { name: 'Movilidad', description: '...' },
       // ...
     },
     alert: {
       noPA: 'No tienes PA suficientes',
       alreadyAttacked: 'Ya has atacado este turno',
       // ...
     }
   };
   ```

2. **Hook `useL`**: un hook simple que retorna una función `l(key: string, params?: Record<string, any>)` que busca el string en el locale activo y hace interpolación de parámetros.

3. **Implementación progresiva**:
   - Fase 1: crear la estructura de claves, migrando los strings más usados (clases, stats, botones)
   - Fase 2: migrar descripciones de habilidades, cartas e identidades
   - Fase 3: migrar alertas y mensajes de sistema
   - Fase 4: añadir soporte para otros idiomas (en, fr, etc.)

4. **Compatibilidad**: mientras no se complete la migración, `useL` debe tener un fallback que devuelva el string original si la clave no existe, permitiendo migración gradual.

---

## Orden de implementación recomendado

| Fase | Capa | Depende de | Esfuerzo | Riesgo |
|------|------|-----------|----------|--------|
| 1 | **Labels** (estructura + fases 1-2) | Ninguna | Medio | Bajo — solo afecta strings |
| 2 | **Actions** (separar handlers, extraer modales) | Labels (opcional) | Alto | Medio — cambios en HexBoard |
| 3 | **Animation** (contexto + engine) | Actions | Alto | Medio — nuevo sistema |
| 4 | **Board** (extraer utils) | Ninguna | Bajo | Bajo — solo mover código |
| 5 | **Modifier** (mejoras menores) | Board | Bajo | Bajo — ya está bien encapsulado |
| 6 | **Labels** (fase 3-4) | Actions (alertas) | Medio | Bajo — mecánico |
| 7 | **Animation** (partículas) | Animation engine | Alto | Alto — nuevo subsistema |

---

## Principios de diseño

1. **Cada capa se comunica con las demás mediante eventos o datos compartidos, nunca mediante imports directos de implementación.**
   - Board → Modifier: `GameState.activeModifiers` (datos)
   - Actions → Animation: `AnimationContext.enqueue()` (evento)
   - Actions → Labels: `l('alert.noPA')` (función)
   - Modifier → Board: `GameState.units` (datos)

2. **Las capas inferiores (Board, Modifier) no conocen la existencia de las superiores (Animation, Labels).**
   - `@shared/game/` no importa nada de `@client/` ni `@shared/i18n/`.

3. **Cada capa debe poder testearse de forma aislada.**
   - Board y Modifier ya son testeables (funciones puras).
   - Actions requiere mocking de GameState.
   - Animation requiere un entorno de render.
   - Labels requiere un archivo de recursos.

4. **No perfecto, sino pragmático.** El objetivo es reducir el acoplamiento progresivamente, no reescribir todo de una vez. Cada PR debe mover una responsabilidad de HexBoard a su capa correspondiente.
