# Sistema de Debug

## Propósito
Sistema de logging y visualización de eventos de depuración: conexiones socket, acciones enviadas, estados recibidos. Útil para desarrollo y troubleshooting.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `DebugStore.ts` | Singleton pub/sub: almacena eventos de debug |
| `DebugEntry.tsx` | Renderizado de un evento individual (expandible) |
| `DebugPanel.tsx` | Panel con lista scrollable de eventos |
| `useDebugLog.ts` | Hook React que se suscribe al store |

## Tipos de Eventos
| Tipo | Descripción |
|---|---|
| `SOCKET_CONNECT` | Conexión/desconexión del socket |
| `ACTION_SENT` | Acción enviada al servidor |
| `STATE_RECEIVED` | Nuevo estado recibido del servidor |

## Flujo de Datos
```
useGameState: llama debugStore.add({ type: 'ACTION_SENT', ... })
socket.ts:      llama debugStore.add({ type: 'SOCKET_CONNECT', ... })
  │
  ▼
DebugStore (singleton)
  ├── Almacena en array interno
  ├── Notifica a suscriptores
  └── Máximo: mantiene últimos eventos
  │
  ▼
useDebugLog → DebugPanel → DebugEntry (expandible con JSON)
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `GameAction`, `GameState` | Motor | Tipos para payloads de eventos |

## Acoplamiento
- **Muy bajo**: sistema completamente opcional
- DebugStore es un singleton plano (sin React)
- No depende de ningún sistema del juego (solo tipos compartidos)
- Es importado imperativamente por useGameState y socket.ts
- DebugPanel es un componente independiente renderizado condicionalmente
