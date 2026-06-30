[docs](../docs.md) > [arquitectura](./index.md) > servidor

# 8. Diagramas técnicos

## 8.1 Diagrama de secuencia: Partida completa

```mermaid
sequenceDiagram
    participant C1 as Jugador 1
    participant C2 as Jugador 2
    participant S as Servidor (3000)
    participant SH as Shared Reducer
    participant RP as Report
    participant WB as Web (3001)

    Note over C1,WB: Matchmaking
    C1->>S: JOIN_GAME { gameId, userId, matchType }
    S->>S: getRoom(gameId) → crear/obtener
    S->>S: room.join(socketId, userId)
    S-->>C1: ROLE { role: "player", playerId: "p1" }
    S-->>C1: STATE (estado inicial)

    C2->>S: JOIN_GAME { gameId, userId, matchType }
    S->>S: room.join(socketId, userId)
    S-->>C2: ROLE { role: "player", playerId: "p2" }
    S-->>C2: STATE

    Note over S: Ambos conectados
    S->>C1: BOTH_PLAYERS_READY
    S->>C2: BOTH_PLAYERS_READY
    S->>WB: POST /api/games/start (cancelar timeout matchmaking)

    Note over C1,C2: FASE DE PREPARACIÓN

    C1->>S: ACTION { type: "SELECT_IDENTITY", cardId: "robin_hood" }
    S->>SH: applyAction(state, action)
    SH-->>S: newState
    S-->>C1: STATE
    S-->>C2: STATE

    C2->>S: ACTION { type: "SELECT_IDENTITY", cardId: "espartano" }
    S->>SH: applyAction(state, action)
    SH-->>S: newState (preparationPhase → ROLL)
    S-->>C1: STATE
    S-->>C2: STATE

    C1->>S: ACTION { type: "ROLL_DICE" }
    C2->>S: ACTION { type: "ROLL_DICE" }
    S->>SH: applyAction(state, action) ×2
    SH-->>S: newState (preparationPhase → DEPLOYMENT)
    S-->>C1: STATE
    S-->>C2: STATE

    loop 12 pasos de despliegue
        C1->>S: ACTION { type: "DEPLOY_UNIT", unitId, position }
        C2->>S: ACTION { type: "DEPLOY_UNIT", unitId, position }
    end

    Note over S: gamePhase → GAME
    Note over C1,C2: COMIENZA EL JUEGO (turno 1)

    loop turnos alternados
        Note over C1: Turno de Jugador 1
        C1->>S: ACTION { type: "MOVE_UNIT", unitId, to }
        S->>SH: handleMove(state, action)
        SH-->>S: newState
        S-->>C1: STATE
        S-->>C2: STATE

        C1->>S: ACTION { type: "ATTACK_UNIT", unitId, targetId }
        S->>SH: handleAttack → resolveAttack
        SH-->>S: newState (con resultados)
        S-->>C1: STATE
        S-->>C2: STATE

        C1->>S: ACTION { type: "END_TURN" }
        S->>SH: handleEndTurn(state, action)
        SH-->>S: newState (turno +1)
        S-->>C1: STATE
        S-->>C2: STATE

        Note over C2: Turno de Jugador 2
        C2->>S: ACTION { type: "MOVE_UNIT", ... }
        C2->>S: ACTION { type: "ATTACK_UNIT", ... }
        C2->>S: ACTION { type: "END_TURN" }
    end

    Note over C1,C2: FIN DE LA PARTIDA
    C1->>S: ACTION { type: "ATTACK_UNIT", targetId: "general_enemigo" }
    S->>SH: handleAttack → checkGeneralKilled
    SH-->>S: newState (gamePhase → GAME_OVER)
    S->>S: Inyectar GAME_OVER action
    S->>RP: submitReport(finalState, actions)
    RP->>RP: computeReport()
    RP->>WB: POST /api/games/report
    WB-->>RP: 200 { status: "ok" }
    S-->>C1: STATE (GAME_OVER)
    S-->>C2: STATE (GAME_OVER)
```

## 8.2 Diagrama de flujo: Pipeline de acción

```mermaid
flowchart LR
    A["socket.on('ACTION')"] --> B{"room.isPlayer()?"}
    B -->|"No"| C["Ignorar"]
    B -->|"Sí"| D["room.handleAction()"]
    D --> E["Registrar ActionRecord<br/>(index, phase, turn, time)"]
    E --> F["¿DEPLOY_UNIT?"]
    F -->|"Sí"| G["Capturar InitialDeployment"]
    F -->|"No"| H["applyAction(state, action)"]
    G --> H
    H --> I["applyActionInner()"]
    I --> J{"Estado cambió?"}
    J -->|"No"| K["Devolver estado original"]
    J -->|"Sí"| L["Procesar lastAttackResult"]
    L --> M["¿gamePhase===GAME<br/>y hubo ataque?"]
    M -->|"Sí"| N["checkGeneralKilled()"]
    M -->|"No"| O["¿GAME + MAIN?"]
    N --> O
    O -->|"Sí"| P["refreshFormations()"]
    O -->|"No"| Q["Devolver newState"]
    P --> Q
    Q --> R["currentState = newState"]
    R --> S{"gamePhase ===<br/>GAME_OVER?"}
    S -->|"Sí"| T["Inyectar GAME_OVER action"]
    T --> U["onGameOverCallback()"]
    S -->|"No"| V["¿Snapshot?"]
    U --> V
    V -->|"Sí"| W["Guardar StateSnapshot"]
    V -->|"No"| X["Emitir STATE a la sala"]
    W --> X
```

## 8.3 Diagrama de secuencia: Desconexión y timeout

```mermaid
sequenceDiagram
    participant C1 as Jugador A
    participant S as Servidor
    participant C2 as Jugador B
    participant RP as Report

    C1--xS: Desconexión
    S->>S: room.onPlayerDisconnect(p1)
    S->>S: disconnectedAt = Date.now()
    S->>C2: OPPONENT_DISCONNECTED { playerId: "p1" }
    S->>C2: STATE (con flag disconnectedAt)

    alt Reconexión exitosa (antes de 60s)
        C1->>S: JOIN_GAME { gameId, userId, matchType }
        S->>S: room.onPlayerReconnect("p1")
        S->>C2: OPPONENT_RECONNECTED { playerId: "p1" }
        S->>C1: STATE (estado actual)
        Note over C1,C2: Partida continúa
    else Timeout alcanzado (60s)
        Note over S: setTimeout se ejecuta
        S->>S: applyAction({ type: "SURRENDER", playerId: "p1" })
        S->>S: gameOverReason = "disconnect"
        S->>S: Inyectar GAME_OVER
        S->>RP: submitReport()
        S->>C2: STATE (GAME_OVER)
        Note over C2: Jugador B gana por desconexión
    end
```

## 8.4 Diagrama de flujo: Reporte post-partida

```mermaid
flowchart TD
    A["onGameOverCallback(finalState)"] --> B["room.getHistory()"]
    B --> C["getUserIdMapping()"]
    C --> D["submitReport(gameId, finalState,<br/>history.actions, userIdMapping,<br/>matchType, history.initialDeployments)"]
    
    D --> E["computeReport()"]
    E --> F{"¿p1UserId && p2UserId<br/>&& winner?"}
    F -->|"No"| G["return null → abortar"]
    F -->|"Sí"| H["Computar classStats<br/>(desde state.units + attackResults)"]
    H --> I["Computar identityStats<br/>(kills, damage, abilityUses, cardsPlayed)"]
    I --> J["Computar performance<br/>(score 0-100 con 10 métricas)"]
    J --> K["Construir payload JSON"]
    
    K --> L["Enviar POST a REPORT_API_URL"]
    L --> M{"¿Respuesta OK?"}
    M -->|"Sí"| N["✅ Reportado exitosamente"]
    M -->|"No"| O{"¿quedan reintentos?"}
    O -->|"Sí"| P["Esperar backoff<br/>(1s, 5s, 15s)"]
    P --> L
    O -->|"No"| Q["❌ Todos los reintentos fallaron"]
    
    N --> R["return true"]
    Q --> R
    
    subgraph "Cómputo de performance"
        S1["winBonus (20%)<br/>¿Ganó?"]
        S2["hitRate (10%)<br/>Aciertos / total"]
        S3["damageTradeRatio (15%)<br/>Daño inf./recibido"]
        S4["survivalRate (15%)<br/>Unidades vivas"]
        S5["killParticipation (10%)<br/>Bajas del jugador / total"]
        S6["counterEfficiency (5%)<br/>Contra. infligido/recibido"]
        S7["cardsPlayedPerTurn (5%)<br/>Cartas / turnos"]
        S8["generalProtection (5%)<br/>1 - (daño a general / total)"]
        S9["firstBlood (5%)<br/>¿Primera baja?"]
        S10["comeback (5%)<br/>Ganar con más bajas"]
    end
```

## 8.5 Diagrama de flujo: Reconexión

```mermaid
sequenceDiagram
    participant C as Cliente
    participant S as Servidor
    participant GR as GameRoom

    C->>S: JOIN_GAME { gameId, userId, matchType }
    S->>GR: getRoom(gameId)
    S->>GR: room.join(socketId, userId)
    
    alt Es el primer jugador
        GR-->>C: ROLE { role: "player", playerId: "p1" }
    else Es el segundo jugador
        GR-->>C: ROLE { role: "player", playerId: "p2" }
        GR->>GR: Verificar si el oponente está desconectado
        alt Oponente desconectado
            GR->>GR: onPlayerReconnect()
            S->>Sala: OPPONENT_RECONNECTED
        end
        S->>Sala: BOTH_PLAYERS_READY
    else Ya hay 2 jugadores
        GR-->>C: ROLE { role: "spectator" }
    end

    S->>C: STATE (estado actual)
    Note over C: El cliente recibe el estado<br/>completo al reconectar
```

## 8.6 Diagrama de entidad-relación (memoria)

```mermaid
erDiagram
    GameRoom ||--o{ ActionRecord : contiene
    GameRoom ||--o{ StateSnapshot : contiene
    GameRoom ||--o{ InitialDeployment : contiene
    GameRoom ||--|| GameState : tiene
    GameRoom ||--o{ PlayerSlot : tiene
    GameRoom ||--o{ Spectator : tiene

    GameState ||--o{ Unit : unidades_vivas
    GameState ||--o{ Unit : unidades_muertas
    GameState ||--o{ GameHistoryEntry : historial
    GameState ||--o{ AttackResult : resultados_ataque
    GameState ||--o{ ModifierInstance : modificadores

    Unit }o--|| PlayerSlot : dueno

    ActionRecord }o--|| GameAction : accion

    PlayerSlot }o--|| Socket : socket_conectado
```
