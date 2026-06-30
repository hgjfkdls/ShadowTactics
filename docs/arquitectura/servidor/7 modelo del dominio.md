[docs](../docs.md) > [arquitectura](./index.md) > servidor

# 7. Modelo del dominio

## Entidades principales

### GameState

**Archivo**: `src/shared/game/state.ts`

Es el estado completo de una partida en un momento dado. Es inmutable — cada acción produce un nuevo `GameState`.

```typescript
type GameState = {
    // Flujo
    turn: number;
    activePlayer: PlayerId;          // 'p1' | 'p2'
    gamePhase: 'PREPARATION' | 'GAME' | 'GAME_OVER';
    winner?: PlayerId;
    gameOverReason?: 'general_killed' | 'surrender' | 'disconnect';
    preparationPhase: 'IDENTITY_SELECTION' | 'ROLL' | 'DEPLOYMENT' | 'DONE';
    turnPhase: 'DRAW' | 'MAIN' | 'COUNTER';

    // Mapa
    map: HexMap;                     // { radius: 5 }
    centerHex: HexCoord;             // { q: 0, r: 0 }

    // Unidades
    units: Record<UnitId, Unit>;     // Vivas
    graveyard: Record<UnitId, Unit>; // Muertas

    // RNG
    rngSeed: number;

    // Jugadores
    players: Record<PlayerId, PlayerResources>;

    // Preparación
    diceRolls: Record<PlayerId, number | undefined>;
    deploymentOrder?: PlayerId[];
    deploymentStep: number;
    deploymentCount: number;

    // Mazos
    effectDeck: CardId[];
    effectDiscard: CardId[];
    identityDeck: CardId[];

    // Modificadores
    activeModifiers: ModifierInstance[];
    nextModifierId: number;

    // Historiales
    gameHistory: GameHistoryEntry[];
    nextHistoryId: number;
    attackResults: AttackResult[];
};
```

### Unit

```typescript
type Unit = {
    id: UnitId;                      // 'u1', 'u2', ..., 'u26'
    owner: PlayerId;
    position: HexCoord;
    attack: number;                  // Daño base
    hp: number;                      // HP actual
    difficulty: number;              // Dificultad para atacar
    range: number;                   // Rango de ataque
    movementCost: number;            // PA por hexágono
    class: 'archer' | 'infantry' | 'cavalry' | 'lancer' | 'general';
    abilities?: string[];            // IDs de habilidades activas/pasivas
    // Flags de habilidades usadas en este turno
    movedThisTurn?: boolean;
    attackedThisTurn?: boolean;
    usedCabalgar?: boolean;
    usedCarga?: boolean;
    // ... más flags específicos de habilidades
};
```

### PlayerResources

```typescript
type PlayerResources = {
    actionPoints: number;            // PA actuales
    carryOver: number;               // PA arrastrados del turno anterior
    cardsInHand?: CardId[];          // Cartas en mano (máx 3 + 1 en DRAW)

    // Identidad
    identityCards?: CardId[];        // 3 cartas al inicio
    selectedIdentity?: CardId;       // Identidad elegida
    revealedIdentity?: boolean;

    // Seguimiento de identidad por turno
    pendingIdentityTarget?: boolean; // Robin Hood
    pendingEspartanoChoice?: boolean;
    globalPresionActive?: boolean;   // Capitán de la Guardia
    pendingPlanBatalla?: boolean;    // Comandante Supremo
    // ... más flags

    // Despliegue
    unitsToDeploy?: { unitId: UnitId; unitClass: Unit['class'] }[];
    deployedUnits?: UnitId[];

    // Conexión
    disconnectedAt?: number;
};
```

### GameAction

**Archivo**: `src/shared/game/action-types.ts`

Unión discriminada de 18 tipos de acción:

```typescript
type GameAction =
    // Preparación
    | { type: 'SELECT_IDENTITY'; playerId: PlayerId; cardId: CardId }
    | { type: 'ROLL_DICE'; playerId: PlayerId }
    | { type: 'DEPLOY_UNIT'; playerId: PlayerId; unitId: UnitId; position: HexCoord }

    // Juego
    | { type: 'MOVE_UNIT'; playerId: PlayerId; unitId: UnitId; to: HexCoord }
    | { type: 'ATTACK_UNIT'; playerId: PlayerId; unitId: UnitId; targetId: UnitId }
    | { type: 'END_TURN'; playerId: PlayerId }
    | { type: 'USE_CARD'; playerId: PlayerId; cardId: CardId; targetId?: UnitId }
    | { type: 'USE_ABILITY'; playerId: PlayerId; unitId: UnitId; abilityId: string; targetId?: UnitId; to?: HexCoord; path?: HexCoord[] }
    | { type: 'PASS_COUNTER'; playerId: PlayerId }
    | { type: 'DISCARD_CARD'; playerId: PlayerId; cardId: CardId }
    | { type: 'IDENTITY_ABILITY'; playerId: PlayerId; targetId: UnitId }
    | { type: 'ESPARTANO_CHOICE'; playerId: PlayerId; choice: 'range' | 'defense' }
    | { type: 'COMANDANTE_CHOICE'; playerId: PlayerId; choice: 'attack' | 'defense' }
    | { type: 'OCCUPY_POSITION'; playerId: PlayerId; accept: boolean }
    | { type: 'CONTINUE_ATTACK_RESULT'; playerId: PlayerId }

    // Fin de partida
    | { type: 'SURRENDER'; playerId: PlayerId }

    // Sistema
    | { type: 'SIMULATE_PREPARATION'; playerId: PlayerId }
    | { type: 'GAME_OVER'; reason: string; winner: PlayerId };
```

### ActionRecord

**Archivo**: `src/server/GameRoom.ts`

Registro de cada acción ejecutada en la sala:

```typescript
type ActionRecord = {
    index: number;                   // 1-based, auto-increment
    action: GameAction;
    playerId: 'p1' | 'p2';
    phase: 'preparation' | 'game' | 'game_over';
    turn: number;                    // Turno en que ocurrió
    time: number;                    // Date.now()
};
```

### InitialDeployment

```typescript
type InitialDeployment = {
    unitId: string;
    unitClass: string;
    playerId: 'p1' | 'p2';
    position: { q: number; r: number };
    step: number;
};
```

### GameHistoryEntry

Entrada en el historial visual de la partida. Cinco variantes discriminadas por `type`:

```typescript
type GameHistoryEntry =
    | AttackEntry    // type: 'attack'  — dados, daño, hit, kill
    | MoveEntry      // type: 'move'    — coordenadas origen/destino, coste
    | CardEntry      // type: 'card'    — nombre, tipo, target
    | AbilityEntry   // type: 'ability' — nombre, daño, target, sourceClass
    | PhaseEntry;    // type: 'phase'   — turn_start, turn_end, draw, etc.
```

### ModifierInstance

**Archivo**: `src/shared/game/modifiers/types.ts`

```typescript
type ModifierInstance = {
    id: string;
    sourcePlayerId: string;
    targetId?: string;          // undefined = global (para AP)
    stat: string;               // 'attack' | 'damage' | 'movementCost' | 'ap' | 'difficulty' | 'attackCost' | ...
    value: number;
    operator: 'ADD' | 'MUL' | 'SET';
    remainingTurns: number;
    remainingUses?: number;
    source: 'card' | 'ability' | 'identity';
    sourceName: string;
};
```

### Clases de unidad

| Clase | Ataque | HP | Dificultad | Rango | Coste mov. | Habilidades |
|-------|--------|----|-----------|-------|------------|-------------|
| Archer | 3 | 12 | 6 | 3 | 2 | blanco_facil, patada_acrobatica, fuego_cobertura, accion_evasiva |
| Infantry | 2 | 16 | 6 | 1 | 1 | resistencia, linea_defensiva, presion, avance |
| Cavalry | 3 | 14 | 7 | 1 | 1 | romper_filas, cabalgar, carga, doble_ataque |
| Lancer | 3 | 14 | 7 | 1 | 1 | anti_caballeria, formacion_defensiva, doble_ataque, ventaja_alcance |
| General | 4 | 20 | 6 | 1 | 1 | (ninguna por defecto — las otorga la identidad) |

### Identidades

Cada jugador elige una identidad al inicio de la partida. La identidad modifica al general:

| Identidad | Clase del general | Habilidades que otorga |
|-----------|-------------------|----------------------|
| Robin Hood | Archer | en_la_mira |
| Francotirador | Archer | — |
| Dios del Trueno | Infantry | rayo_celestial |
| Capitán de la Guardia | Infantry | — |
| Caballos de Guerra | Cavalry | cabalgar_2, a_la_carga |
| Cazadores | Cavalry | — |
| Punta de Lanza | Lancer | torbellino |
| Espartano | Lancer | — |
| Monje Shaolin | General | meditacion |
| Comandante Supremo | General | — |
| Corazón de Estratega | General | posicion_estrategica |
| Inspiración Real | General | en_nombre_del_rey |
| Samurái | General | desenvainado_veloz, camino_del_guerrero |
| Furia del Tirano | General | sacrificar, terror |
| Escudo del Comandante | General | angel_guardian, proteger |

## Relaciones

```
GameRoom (1)
  ├── players[2] ── PlayerSlot { socketId, playerId, userId }
  ├── actions[*] ── ActionRecord
  ├── snapshots[*] ── StateSnapshot { actionIndex, state }
  ├── currentState (1) ── GameState
  └── initialDeployments[*] ── InitialDeployment

GameState (1)
  ├── units[*] ── Unit
  ├── graveyard[*] ── Unit (muertas)
  ├── players[2] ── PlayerResources
  ├── activeModifiers[*] ── ModifierInstance
  ├── gameHistory[*] ── GameHistoryEntry
  └── attackResults[*] ── AttackResult
```
