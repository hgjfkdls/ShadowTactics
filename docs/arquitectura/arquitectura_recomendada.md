[docs](../docs.md) > [arquitectura](./docs.md) > arquitectura_recomendada

[volver](./docs.md) | [prev](./arquitectura.md) | [next](./consistency.md)

# Arquitectura recomendada — `shared/game`

## Principios

1. **Un archivo = una responsabilidad**. Sin archivos gigantes (reducer.ts tiene 630 líneas).
2. **Fases separadas**. Cada fase del juego tiene su propio módulo.
3. **Efectos como datos, no como funciones**. Los buffs/debuffs son objetos planos aplicados por un sistema, no funciones `(state) => state` embebidas en el tipo Card.
4. **El reducer solo orquesta**. Delega a sub-reducers por fase/acción.

---

## Estructura propuesta

```
shared/game/
├── index.ts                 → re-exporta todo
├── state.ts                 → tipos del estado global
├── actions.ts               → tipos de acciones (unión)
│
├── phases/
│   ├── index.ts
│   ├── identity.ts          → selección y revelación de identidad
│   ├── roll.ts              → tirada de dados para prioridad
│   ├── deployment.ts        → despliegue de unidades
│   └── turn.ts              → inicio/fin de turno, carry-over AP
│
├── actions/
│   ├── index.ts
│   ├── move.ts              → validación y ejecución de movimiento
│   ├── attack.ts            → combate: dados, daño, contraataque, muerte
│   └── card.ts              → jugar carta de efecto/identidad
│
├── combat/
│   ├── index.ts
│   ├── resolver.ts          → orquesta: dados → acierto/fallo → daño/contraataque
│   ├── damage.ts            → cálculo de daño (con buffs, debuffs, habilidades)
│   ├── hit.ts               → tirada, dificultad, crítico
│   └── counter.ts           → contraataque
│
├── modifiers/
│   ├── index.ts
│   ├── types.ts             → tipos Modifier, ModifierTarget, ModifierType
│   ├── registry.ts          → registro central: añadir/quitar modifiers del estado
│   ├── apply.ts             → aplicar modifiers a stats (ataque, defensa, etc.)
│   └── lifetime.ts          → expiración por turno/fase
│
├── movement/
│   ├── index.ts
│   ├── cost.ts              → cálculo de coste de movimiento (terreno, debuffs)
│   └── validation.ts        → hex ocupado, límites del mapa, línea recta (carga)
│
├── identities/
│   ├── index.ts
│   ├── registry.ts          → mapa de todas las identidades (id → Effect[])
│   └── effects/             → cada identidad en su propio archivo
│       ├── robin-hood.ts
│       ├── francotirador.ts
│       ├── dios-trueno.ts
│       ├── ...
│       └── escudo-comandante.ts
│
├── effects/
│   ├── index.ts
│   ├── types.ts             → tipos Effect, BuffEffect, DebuffEffect, CounterEffect
│   ├── registry.ts          → mapa de cartas de efecto (id → Effect)
│   └── resolver.ts          → aplicar efecto según tipo (buff/debuff/counter)
│
├── units/
│   ├── index.ts
│   ├── factory.ts           → createUnit() con stats base
│   ├── stats.ts             → stats base por clase
│   └── abilities.ts         → ejecución de habilidades de unidad
│
├── utils/
│   ├── index.ts
│   ├── rng.ts               → RNG determinista (LCG)
│   ├── pipe.ts              → pipeState()
│   └── helpers.ts           → isHexOccupied, isWithinBounds, etc.
│
└── reducer.ts               → ~30 líneas, solo delega
```

---

## Responsabilidades de cada módulo

### `state.ts` — Estado global

```typescript
// Ejemplo de cómo debería evolucionar GameState
export type GameState = {
    turn: number;
    activePlayer: PlayerId;

    gamePhase: 'PREPARATION' | 'GAME';
    preparationPhase: PreparationPhase;
    turnPhase: TurnPhase;

    map: HexMap;
    centerHex: HexCoord;

    units: Record<UnitId, Unit>;
    graveyard: Record<UnitId, Unit>;

    modifiers: Modifier[];             // ← NUEVO: buffs/debuffs activos
    modifiersNext: Modifier[];         // ← NUEVO: buffs que aplican al iniciar turno

    players: Record<PlayerId, PlayerResources>;
    rngSeed: number;

    // Datos específicos de preparación
    diceRolls: Record<PlayerId, number | undefined>;
    deploymentOrder?: PlayerId[];
    currentDeployingPlayer?: PlayerId;
    deploymentCount: number;
};
```

Los efectos se almacenan como datos planos (`Modifier[]`), no como funciones. Esto permite serialización, rejugabilidad y depuración.

### `modifiers/` — Sistema de modificadores (nuevo)

Los modificadores reemplazan el approach actual de `Card.effect: (state) => state`. Son datos:

```typescript
export type Modifier = {
    id: string;
    source: string;           // qué carta/habilidad lo generó
    target: ModifierTarget;   // qué afecta
    stat: string;             // 'attack' | 'difficulty' | 'damageReduction' | etc.
    value: number;            // +2, -1, etc.
    operator: 'ADD' | 'MUL' | 'SET';
    duration: number;         // turnos restantes (0 = permanente)
};
```

**Ventajas**:
- Se pueden aplicar en orden y calcular stats finales con `apply.ts`
- Se serializan fácilmente para depuración/replay
- Se pueden remover automáticamente al expirar su duración
- Tanto identidades como cartas de efecto y habilidades de unidad usan el mismo sistema

### `phases/` — Sub-reducers por fase

Cada fase exporta una función `handle(state, action) => state`. El reducer principal solo hace:

```typescript
export function applyAction(state: GameState, action: GameAction): GameState {
    if (state.gamePhase === 'PREPARATION') {
        return handlePreparation(state, action);
    }
    return handleGame(state, action);
}

function handlePreparation(state, action) {
    switch (state.preparationPhase) {
        case 'IDENTITY_SELECTION': return handleIdentity(state, action);
        case 'ROLL':               return handleRoll(state, action);
        case 'DEPLOYMENT':         return handleDeployment(state, action);
    }
}

function handleGame(state, action) {
    switch (action.type) {
        case 'MOVE_UNIT':   return handleMove(state, action);
        case 'ATTACK_UNIT': return handleAttack(state, action);
        case 'USE_CARD':    return handleCard(state, action);
        case 'END_TURN':    return handleEndTurn(state, action);
    }
}
```

### `combat/` — Sistema de combate

Separado del reducer para poder testearlo y reutilizarlo:

- **resolver.ts**: orquesta los pasos del combate (docs: 5 pasos)
- **hit.ts**: cálculo de dificultad (6 + distancia para arqueros, 7 para melee, etc.)
- **damage.ts**: daño base + modificadores (buffs, habilidades, crítico)
- **counter.ts**: contraataque por fallo, condiciones de rango

### `identities/` vs `effects/` — Dos sistemas separados

| | Cartas de identidad | Cartas de efecto |
|---|---|---|
| Propósito | Habilidades del General y global | Buffs/debuffs/counters temporales |
| Persistencia | Toda la partida | 1-2 turnos |
| Estructura | Special (coste PA) + Global (pasiva) | Buff/Debuff/Counter con duración |
| Implementación | Cada una en su archivo (`identities/effects/`) | Registro en `effects/registry.ts` |

Ambos producen `Modifier[]` como salida. El sistema de modifiers es el mismo para ambos.

### `units/` — Stats y habilidades

- **factory.ts**: `createUnit()` con stats base
- **stats.ts**: tabla de stats por clase (única fuente de verdad)
- **abilities.ts**: cada habilidad es una función que recibe `(state, unit, target?)` y devuelve modificaciones al estado o acciones válidas

---

## Flujo de datos

```
Acción del jugador
       │
       ▼
  reducer.ts (orquesta)
       │
       ├─► phases/     (preparación: identity → roll → deploy)
       │
       └─► actions/    (juego: move → attack → card → end turn)
               │
               ├─► movement/   (coste, validación)
               ├─► combat/     (resolver ataque)
               │     ├─► hit.ts
               │     ├─► damage.ts
               │     └─► counter.ts
               ├─► modifiers/  (aplicar/expirar buffs)
               └─► effects/    (resolver carta de efecto)
```

---

## Ventajas de esta organización

1. **Archivos pequeños y enfocados** — cada archivo < 100 líneas
2. **Testeable** — cada módulo se prueba de forma aislada
3. **Extensible** — añadir una nueva identidad = crear un archivo en `identities/effects/`
4. **Serializable** — los modifiers son datos planos, el estado entero se puede JSON.stringify
5. **Depurable** — el registro de modifiers permite ver qué está afectando a cada stat
6. **Coincide con el diseño** — la estructura del código refleja la estructura de las reglas
