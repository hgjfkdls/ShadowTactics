[docs](../docs.md) > [arquitectura](./index.md) > servidor

# 10. Máquinas de estado

## 10.1 Máquina de estados principal: GamePhase

El juego tiene 3 fases principales con transiciones deterministas.

```mermaid
stateDiagram-v2
    [*] --> PREPARATION
    
    state PREPARATION {
        [*] --> IDENTITY_SELECTION
        IDENTITY_SELECTION --> ROLL: Ambos jugadores seleccionaron
        ROLL --> ROLL: Empate (repetir)
        ROLL --> DEPLOYMENT: Ambos jugadores lanzaron
        DEPLOYMENT --> DEPLOYMENT: Colocar unidad
        DEPLOYMENT --> [*]: 12 pasos completados
    }
    
    PREPARATION --> GAME: Despliegue completado
    
    state GAME {
        [*] --> DRAW: Inicio de turno
        DRAW --> DRAW: Mano > 3 (esperar descarte)
        DRAW --> MAIN: Mano ≤ 3
        MAIN --> COUNTER: Jugar carta (oponente puede contrajugar)
        MAIN --> MAIN: Mover, atacar, usar habilidad
        MAIN --> DRAW: END_TURN (pasa al otro jugador)
        COUNTER --> MAIN: Pasar o resolver contrajuego
    }
    
    GAME --> GAME_OVER: General eliminado / Rendición / Desconexión
    
    GAME_OVER --> [*]: Reporte enviado, sala eliminada
```

### Transiciones

| Desde | Hasta | Condición | Handler |
|-------|-------|-----------|---------|
| `IDENTITY_SELECTION` | `ROLL` | Ambos `selectedIdentity` definidos | `handleIdentity` |
| `ROLL` | `ROLL` | Empate (`p1Roll === p2Roll`) | `handleRoll` |
| `ROLL` | `DEPLOYMENT` | Ambos dados lanzados | `handleRoll` |
| `DEPLOYMENT` | `DEPLOYMENT` | Unidades restantes en el paso | `handleDeployment` |
| `DEPLOYMENT` | `GAME` | `deploymentStep >= 12` | `handleDeployment` → `applyTurnStart` |
| `GAME` | `GAME_OVER` | General muerto / SURRENDER / disconnect timeout | `checkGeneralKilled` / `applyAction` / `onPlayerDisconnect` |

## 10.2 Máquina de estados: Turno

```mermaid
stateDiagram-v2
    [*] --> DRAW: applyTurnStart()
    
    DRAW --> DRAW: Robar carta, si mano > 3
    
    state DRAW {
        [*] --> drawCard()
        drawCard --> discard: mano > 3
        drawCard --> main: mano ≤ 3
    }
    
    discard --> MAIN: DESCATAR_CARTA y mano ≤ 3
    discard --> DRAW: DESCATAR_CARTA pero mano sigue > 3
    
    MAIN --> MAIN: MOVE_UNIT / ATTACK_UNIT / USE_ABILITY
    MAIN --> COUNTER: USE_CARD (el oponente puede contrajugar)
    MAIN --> DRAW: END_TURN (carryOver AP, incrementar turno, cambiar activePlayer)
    
    COUNTER --> MAIN: PASS_COUNTER / Panacea / Ladrón / Espejo
```

### Transiciones de turno

| Desde | Hasta | Acción | Handler |
|-------|-------|--------|---------|
| `DRAW` | `DRAW` | `DISCARD_CARD` y mano aún > 3 | `handleDiscard` |
| `DRAW` | `MAIN` | `DISCARD_CARD` y mano ≤ 3 | `handleDiscard` |
| `MAIN` | `MAIN` | `MOVE_UNIT`, `ATTACK_UNIT`, `USE_ABILITY` | handlers respectivos |
| `MAIN` | `COUNTER` | `USE_CARD` (entra en fase de contrajuego) | `handleCard` |
| `MAIN` | `DRAW` | `END_TURN` (cambia `activePlayer`, incrementa `turn`) | `handleEndTurn` → `applyTurnStart` |
| `COUNTER` | `MAIN` | `PASS_COUNTER` (resolver carta) | `handlePassCounter` |

## 10.3 Máquina de estados: Despliegue

```mermaid
stateDiagram-v2
    [*] --> Step0: order[0] coloca 1 unidad
    
    Step0 --> Step1
    Step1 --> Step2: order[1] coloca 2 unidades
    Step2 --> Step3: order[0] coloca 2
    Step3 --> Step4: order[1] coloca 2
    Step4 --> Step5: order[0] coloca 2
    Step5 --> Step6: order[1] coloca 2
    Step6 --> Step7: order[0] coloca 2
    Step7 --> Step8: order[1] coloca 2
    Step8 --> Step9: order[0] coloca 2
    Step9 --> Step10: order[1] coloca 2
    Step10 --> Step11: order[0] coloca 2
    Step11 --> [*]: order[1] coloca 1 → fin

    note right of Step0
        order[0] = menor dado
        order[1] = mayor dado
    end note
```

### Reglas de validación por step

| Regla | Aplica a |
|-------|----------|
| Primera unidad debe estar a distancia 2 del centro | Step 0 del jugador |
| Unidades siguientes deben estar cerca (≤2) de un aliado | Steps ≥ 1 |
| Máximo 3 unidades por clase | Todos los steps |
| Exactamente 1 general por jugador | Obligatorio |
| Si no hay general desplegado, step 10 debe ser general | Step 10 |

## 10.4 Máquina de estados: Identidad

```mermaid
stateDiagram-v2
    [*] --> Waiting: Jugador A debe seleccionar
    
    Waiting --> Waiting: Jugador A selecciona, Jugador B aún no
    Waiting --> Reveal: Ambos han seleccionado
    
    Reveal --> [*]: Identidades reveladas, preparación → ROLL

    state Waiting {
        [*] --> p1_selected: Jugador 1 elige
        p1_selected --> [*]: Jugador 2 elige
    }
```

## 10.5 Máquina de estados: Juego de cartas (COUNTER)

```mermaid
stateDiagram-v2
    [*] --> CARD_PLAYED: Jugador activo juega USE_CARD
    
    CARD_PLAYED --> CARD_PLAYED: Oponente juega contra carta
    
    state CARD_PLAYED {
        [*] --> esperando_respuesta
        
        esperando_respuesta --> panacea: Contrarrestar debuff
        esperando_respuesta --> ladron: Robar carta
        esperando_respuesta --> espejo: Reflejar debuff
        esperando_respuesta --> pass: Pasar contrajuego
    end
    
    panacea --> [*]: Carta resuelta sin debuff
    ladron --> [*]: Carta robada, efecto anulado
    espejo --> [*]: Debuff reflejado al emisor
    pass --> [*]: Carta original resuelta

    note right of CARD_PLAYED
        Solo cartas DEBUFF entran en COUNTER.
        Cartas BUFF se resuelven inmediatamente.
    end note
```

## 10.6 Máquina de estados: Conexión

```mermaid
stateDiagram-v2
    [*] --> CONNECTED: Socket conectado
    
    CONNECTED --> JOINING: JOIN_GAME recibido
    JOINING --> PLAYING: Ambos jugadores conectados
    PLAYING --> DISCONNECTED: Socket se desconecta
    DISCONNECTED --> PLAYING: Reconexión antes de 60s (onPlayerReconnect)
    DISCONNECTED --> GAME_OVER: Timeout 60s alcanzado (auto-surrender)
    GAME_OVER --> [*]: Reporte enviado, sala eliminada
    PLAYING --> GAME_OVER: Juego termina normalmente
```
