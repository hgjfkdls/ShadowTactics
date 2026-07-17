[docs](../../docs.md) > [arquitectura](../docs.md) > [fases](./docs.md) > 05-movimiento

[volver](./docs.md) | [prev](./04-3-counter.md) | [next](./06-combate.md)

# Acción: MOVE_UNIT

Disponible en subfase `MAIN`.

## Especificación

| Campo | Valor |
|-------|-------|
| Action type | `MOVE_UNIT` |
| Payload | `{ playerId, unitId, to: HexCoord }` |
| Costo base | `movementCost` de la unidad |
| Distancia máxima | 1 hex por acción |

## Flujo de validación

```mermaid
flowchart TD
    A[MOVE_UNIT] --> B{gamePhase === GAME?}
    B -->|No| X[Rechazar]
    B -->|Sí| C{Es activePlayer?}
    C -->|No| X
    C -->|Sí| D{Unidad existe y es del jugador?}
    D -->|No| X
    D -->|Sí| E{Unidad bloqueada?}
    E -->|Sí: modifierExists blocked| X
    E -->|No| F{Hex destino dentro<br/>del mapa?}
    F -->|No| X
    F -->|Sí| G{Distancia === 1?}
    G -->|No| X
    G -->|Sí| H{Hex destino ocupado?}
    H -->|Sí| X
    H -->|No| I{PA suficientes?}
    I -->|No| X
    I -->|Sí| J[Ejecutar movimiento]
```

## Cálculo del costo

```mermaid
flowchart LR
    A["movementCost base"] --> B{"hasMovementPenalty?"}
    B -->|Sí| C["costo × 2 (Fuego de cobertura)"]
    B -->|No| D0["costo base"]
    C --> D{"Modificador movementCost?"}
    D0 --> D
    D -->|SET a 0| E["costo = 0 (Movilidad)"]
    D -->|ADD| F["costo += valor"]
    D -->|MUL| G["costo ×= valor (Pantano)"]
    D -->|Ninguno| H["costo sin cambios"]
```

## Ejecución

```mermaid
flowchart LR
    A[Consumir PA] --> B[Actualizar posición]
    B --> C["movedThisTurn = true<br/>didMovePreviousTurn = true"]
    C --> D[Consumir modifier movementCost]
```

## Ciclo de flags de movimiento

```mermaid
flowchart LR
    subgraph "Turno N (dueño)"
        A["u1 se mueve<br/>movedThisTurn = true<br/>didMovePreviousTurn = true"] --> B["Fin del turno<br/>didMovePreviousTurn = movedThisTurn<br/>movedThisTurn = false"]
    end
    B --> C["Turno N+1 (rival)<br/>no se tocan"]
    C --> D["Turno N+2 (dueño)<br/>MAIN: consulta didMovePreviousTurn<br/>= true (se movió en turno N)"]
    D --> E["Fin del turno N+2<br/>didMovePreviousTurn = movedThisTurn<br/>(true si se movió, false si no)"]
```

| Flag | Se activa en | Se resetea en | Propósito |
|------|-------------|---------------|-----------|
| `movedThisTurn` | Movimiento (`move.ts`) | `applyTurnStart` (`turn.ts`) | Tracking intra-turno |
| `didMovePreviousTurn` | Movimiento (`move.ts`) + `handleEndTurn` (`turn.ts`) | `handleEndTurn` (`turn.ts`) | Consulta en MAIN + combate del rival |

`didMovePreviousTurn` persiste durante el turno del rival (donde se usa en combate) y durante el MAIN del dueño (donde el jugador puede consultarlo).

## Modificadores relevantes

| Modificador | Origen | Efecto |
|-------------|--------|--------|
| `movementCost SET 0` | Carta Movilidad | Primer movimiento cuesta 0 PA |
| `movementCost MUL 2` | Carta Pantano | Primer movimiento cuesta el doble |
| `blocked` | Carta Confusión | Unidad no puede moverse ni atacar |
| `hasMovementPenalty` | Habilidad Fuego de cobertura | Coste ×2 |

## Handler

`src/shared/game/actions/move.ts` → `handleMove()`
