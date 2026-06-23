[docs](../docs.md) > frontend > pantalla-preparacion

# Pantalla de preparación

Pantalla que se muestra tras unirse a una sala (`gameId` seteado) y antes de
la partida. Se encarga de la selección de identidad y la tirada de dados.
El despliegue ocurre en el tablero (HexBoard en modo `DEPLOYMENT`).

## Estado

```
gamePhase === 'PREPARATION'
```

Dentro de PREPARATION hay 3 subfases. Esta pantalla maneja las 2 primeras;
el despliegue se realiza en el tablero (HexBoard en modo `DEPLOYMENT`).

| Subfase | preparationPhase | Dónde se maneja |
|---------|------------------|-----------------|
| Selección de identidad | `IDENTITY_SELECTION` | PreparationScreen |
| Tirada de dados | `ROLL` | PreparationScreen |
| Despliegue | `DEPLOYMENT` | HexBoard (modo despliegue) |

## Arquitectura

```mermaid
flowchart LR
    A["gameId seteado<br/>gamePhase = PREPARATION"] --> B{Pantalla de preparación}
    B --> C[IDENTITY_SELECTION]
    C --> D[ROLL]
    D --> E["HexBoard<br/>(modo DEPLOYMENT)"]
    E --> F["HexBoard<br/>(modo GAME / juego normal)"]

    subgraph B["PreparationScreen<br/>(solo IDENTITY + ROLL)"]
        direction LR
        P["Router: IDENTITY_SELECTION | ROLL"]
    end
```

El componente `App.tsx` renderiza condicionalmente:

```
gameId === null                     → Lobby
gamePhase === PREPARATION
  ├─ IDENTITY_SELECTION | ROLL      → PreparationScreen
  └─ DEPLOYMENT                     → HexBoard (modo despliegue)
gamePhase === GAME                  → HexBoard (modo juego)
gamePhase === GAME_OVER             → HexBoard (congelado + overlay)
```

### Código en App.tsx

```typescript
{gameId ? (
    state?.gamePhase === 'PREPARATION'
        && state.preparationPhase !== 'DEPLOYMENT' ? (
        <PreparationScreen state={state} sendAction={sendAction} role={role} />
    ) : (
        <div className="grid grid-cols-[320px_1fr]">
            {state ? (
                <HexBoard
                    state={state}
                    sendAction={sendAction}
                    phase={state.gamePhase === 'PREPARATION' ? 'DEPLOYMENT' : 'GAME'}
                />
            ) : (
                <div>Waiting for game state…</div>
            )}
            <DebugPanel />
        </div>
    )
) : /* lobby */}
```

El tablero recibe un prop `phase` para cambiar de comportamiento entre despliegue
y juego normal.

---

## 1. Subfase: IDENTITY_SELECTION

**Estado:** `preparationPhase === 'IDENTITY_SELECTION'`

Cada jugador ve sus 3 cartas de identidad y elige 1.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Shadow Tactics                   [sala-123 · p1]  Leave    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              Selecciona tu identidad                        │
│              ──────────────────────                         │
│                                                             │
│     ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│     │          │    │          │    │          │           │
│     │ Robin    │    │ Francoti │    │ Dios     │           │
│     │ Hood     │    │ rador    │    │ Trueno   │           │
│     │          │    │          │    │          │           │
│     │ Arquero  │    │ Arquero  │    │ Infanter │           │
│     │          │    │          │    │          │           │
│     └──────────┘    └──────────┘    └──────────┘           │
│                                                             │
│                     [ Confirmar selección ]                 │
│                                                             │
│              Esperando a que el oponente elija...           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Elementos

| Elemento | Tipo | Comportamiento |
|----------|------|---------------|
| Título | Texto | "Selecciona tu identidad" |
| 3 cartas de identidad | Grid horizontal | Muestra `identityCards[]` con nombre + clase |
| Carta seleccionada | Highlight borde | Click → selecciona esa carta (solo 1) |
| Botón "Confirmar selección" | `button` | Deshabilitado hasta elegir carta. Emite `SELECT_IDENTITY { cardId }` |
| Estado del rival | Texto | "Esperando a que el oponente elija..." o "Oponente listo" |
| Transición automática | — | Cuando ambos confirman → `revealedIdentity = true`, avanza a ROLL |

### Estados de cada carta

- **default** — opaca, click para seleccionar
- **selected** — borde brillante, fondo ligeramente iluminado
- **confirmed** — aparece check, se deshabilita el click

### Flujo

```
1. Llega STATE con preparationPhase = 'IDENTITY_SELECTION'
     y identityCards = [card1, card2, card3]
2. Renderizar las 3 cartas
3. Jugador clicka una → se marca como seleccionada
4. Botón "Confirmar selección" se habilita
5. Jugador confirma → sendAction({ type: 'SELECT_IDENTITY', cardId })
6. Estado local: muestra "Esperando oponente..." + carta seleccionada
7. Ambos jugadores confirmaron → preparationPhase cambia a 'ROLL'
```

### Datos necesarios del estado

```typescript
state.players[playerId].identityCards  // string[] — 3 card IDs
state.players[playerId].selectedIdentity  // string | undefined
state.players[playerId].revealedIdentity  // boolean
```

---

## 2. Subfase: ROLL

**Estado:** `preparationPhase === 'ROLL'`

Cada jugador tira 2d6 para determinar orden de despliegue y jugador activo.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Shadow Tactics                   [sala-123 · p1]  Leave    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    Tirada de dados                          │
│                    ──────────────                           │
│                                                             │
│                    ┌───────────┐                            │
│                    │  🎲  🎲   │                            │
│                    │   4   5   │                            │
│                    │   = 9    │                            │
│                    └───────────┘                            │
│                                                             │
│                    [  Tirar dados  ]                        │
│                                                             │
│              Tu resultado: 9                                 │
│              Oponente: 7                                    │
│              → Tú eres el jugador activo                    │
│              → El oponente despliega primero                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Elementos

| Elemento | Tipo | Comportamiento |
|----------|------|---------------|
| Título | Texto | "Tirada de dados" |
| Dados animados | Visual | 2 dados con animación de tirada (opcional) |
| Resultado propio | Display | Suma de 2d6 después de tirar |
| Resultado del rival | Display | "Esperando..." o el resultado |
| Botón "Tirar dados" | `button` | Emite `ROLL_DICE`. Se deshabilita tras la tirada |
| Indicador de empate | Overlay/mensaje | "¡Empate! Volver a tirar" → botón se re-habilita |
| Resumen final | Texto | Tras resolución: quién es activo, quién despliega primero |

### Estados de la subfase

| Estado | Visibilidad |
|--------|-------------|
| Sin tirar | Botón "Tirar dados" habilitado |
| Tiró propio, espera rival | Botón deshabilitado, muestra resultado propio + "Esperando oponente..." |
| Ambos tiraron, no empate | Muestra ambos resultados + quién es activo. Transición automática a DEPLOYMENT |
| Empate | Mensaje "¡Empate!" + botón se re-habilita |

### Flujo

```
1. preparationPhase cambia a 'ROLL'
2. Jugador ve botón "Tirar dados"
3. Click → sendAction({ type: 'ROLL_DICE' })
4. state.diceRolls se actualiza
5. Si el otro jugador ya tiró:
     a. Empate: se resetean ambos → volver a tirar
     b. No empate: mostrar resultado, esperar 2-3s, avanza a DEPLOYMENT
6. Si el otro no ha tirado: mostrar "Esperando oponente..."
```

### Datos necesarios del estado

```typescript
state.diceRolls  // Record<PlayerId, number | undefined>
state.preparationPhase  // 'ROLL' | ...
// Tras resolución:
state.deploymentOrder  // PlayerId[]
state.activePlayer  // PlayerId
```



---

## Integración en App.tsx

El cambio principal en `App.tsx` es añadir un render condicional para la fase
PREPARATION:

```typescript
// Actual:
{gameId ? (
    <div className="grid grid-cols-[320px_1fr]">
        {state ? (
            <HexBoard state={state} sendAction={sendAction} />
        ) : (
            <div>Waiting for game state…</div>
        )}
    </div>
) : /* lobby */}

// Propuesto:
{gameId ? (
    state?.gamePhase === 'PREPARATION' ? (
        <PreparationScreen state={state} sendAction={sendAction} role={role} />
    ) : (
        <div className="grid grid-cols-[320px_1fr]">
            {state ? (
                <HexBoard state={state} sendAction={sendAction} />
            ) : (
                <div>Waiting for game state…</div>
            )}
        </div>
    )
) : /* lobby */}
```

El componente `PreparationScreen` contiene un router interno:

```typescript
function PreparationScreen({ state, sendAction, role }) {
    switch (state.preparationPhase) {
        case 'IDENTITY_SELECTION':
            return <IdentitySelection state={state} sendAction={sendAction} />;
        case 'ROLL':
            return <DiceRoll state={state} sendAction={sendAction} />;
        case 'DEPLOYMENT':
            return <DeploymentBoard state={state} sendAction={sendAction} />;
    }
}
```

---

## Archivos del cliente

| Archivo | Propósito |
|---------|-----------|
| `src/client/prep/PreparationScreen.tsx` | Componente contenedor, router interno por `preparationPhase` |
| `src/client/prep/IdentitySelection.tsx` | Subfase: selección de carta de identidad |
| `src/client/prep/DiceRoll.tsx` | Subfase: tirada de 2d6 |

El despliegue se maneja dentro de `HexBoard.tsx` (modo `DEPLOYMENT`) — ver
[`docs/frontend/descripcion.md`](./descripcion.md#tablero-hexboard).

---

## Transiciones entre subfases

| Desde | Hacia | Dónde | Condición |
|-------|-------|-------|-----------|
| IDENTITY_SELECTION | ROLL | PreparationScreen | Ambos jugadores tienen `selectedIdentity` seteado |
| ROLL | DEPLOYMENT | PreparationScreen → HexBoard | Ambos jugadores tiraron, sin empate |
| DEPLOYMENT | GAME | HexBoard | Step 11 completado (última unidad colocada) |

Todas las transiciones son automáticas — el servidor cambia `preparationPhase`
o `gamePhase` y el `STATE` recibido en el cliente causa el re-render.

---

## Estados de carga

Durante PREPARATION pueden darse estados sin datos del servidor:

| Estado | Qué se muestra |
|--------|----------------|
| `state === null` tras join | "Cargando partida..." con spinner |
| Conexión perdida durante PREPARATION | "Conexión perdida — reconectando..." |
| Rival desconectado | "El oponente se ha desconectado" + botón "Volver al lobby" |
