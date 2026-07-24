# Sistema de Movimiento

## Propósito
Cálculo del costo de movimiento de las unidades. Actualmente es un costo fijo por clase.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `movement/cost.ts` | `getMovementCost()` |
| `movement/index.ts` | Re-export |

## Implementación
```typescript
export function getMovementCost(unit: Unit): number {
  return unit.movementCost; // Costo fijo por clase (1-2 hexágonos)
}
```

El costo de movimiento está definido en las estadísticas base de cada clase (arch `units/stats.ts`):
- Arquero: 2
- Infantería: 1
- Caballería: 1
- Lancero: 1
- General: 1

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state` (Unit) | State |

## Acoplamiento
- **Muy bajo**: solo depende del tipo Unit de state.ts
- **Nadie depende de este sistema**: el costo de movimiento se usa inline en el handler de habilidades
- Es el subsistema más simple y desacoplado del motor
