# Sistema de Timer

## Propósito
Gestiona los temporizadores de fase del juego. Determina qué timer debe correr según el estado actual, ejecuta auto-acciones cuando expira, y notifica ticks a los clientes.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `src/server/GameRoom.ts` (sección timer, ~260 líneas) | evaluateTimer, startTimer, stopTimer, refreshTimer, fireAutoAction |
| `src/shared/game/timer.ts` | Tipos TimerPhase, TimerInfo |

## Responsabilidades

### Evaluación de Timer
`evaluateTimer()` examina `currentState` y determina el timer activo:
- `IDENTITY_SELECTION`: esperar selección de identidad
- `ROLL`: esperar lanzamiento de dados
- `ROLL_RESULT`: tiempo para ver resultados
- `REVEAL`: tiempo para ver identidades reveladas
- `DEPLOYMENT`: tiempo para desplegar unidades
- `DISCARD`: descartar carta si mano > 3
- `COUNTER`: tiempo para jugar contra-carta
- `TURN`: tiempo del turno principal
- Pausa en COUNTER/TURN si hay acción identidad o elección pendiente

### Auto-Acciones
`fireAutoAction(info)` se ejecuta cuando un timer expira:
- `IDENTITY_SELECTION`: selecciona identidad aleatoria
- `ROLL`: hace roll automático
- `ROLL_RESULT`: avanza a DEPLOYMENT
- `REVEAL`: marca reveal como manejado
- `DEPLOYMENT`: despliega unidades bot con heurística
- `DISCARD`: descarta carta aleatoria
- `COUNTER`: auto PASS_COUNTER
- `TURN`: resuelve elecciones pendientes, ejecuta END_TURN

### Ciclo de Vida
```
evaluateTimer() → TimerInfo o null
  │
startTimer(info)
  ├── setInterval(1s) → onTimerTick (broadcast a clientes)
  └── setTimeout(duration) → fireAutoAction(info)
  │
refreshTimer()
  ├── Compara timer esperado vs actual
  ├── Preserva remaining de TURN al entrar/salir de COUNTER
  └── Inicia nuevo timer si cambió
  │
stopTimer()
  └── Limpia intervals y timeouts
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `GameState`, `TimerInfo`, `TimerPhase` | Motor | Tipos y estado |
| `GameRoom.handleAction()` | Interna | Ejecutar auto-acciones |
| `GameRoom.onTimerTick` | Callback | Notificar clientes |

## Acoplamiento
- **Muy alto** con GameRoom: el timer está embebido en la misma clase y conoce íntimamente la máquina de estados del juego
- **Alto** con el Motor Compartido (TimerPhase, TimerInfo)
- Cualquier cambio en las fases del juego requiere actualizar `evaluateTimer()`
