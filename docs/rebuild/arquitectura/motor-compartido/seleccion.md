# Sistema de Selección

## Propósito
Cálculo de rangos en el tablero hexagonal, filtrado de blancos válidos, y generación de highlights para habilidades, movimientos, y ataques.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `board/selection.ts` | getHexesInRange, filterTargets, getAbilityHighlights, isValidTarget |
| `board/collision.ts` | isHexOccupied, isWithinBounds |

## Funciones Principales

### getHexesInRange(center, range, mode)
Calcula hexágonos en rango según modo:
- `around`: todos los hex en distancia ≤ range
- `star`: solo en línea recta cardinal
- `front`: solo al frente (según dirección)
- `wave`: patrón de onda

### filterTargets(hexes, state, filter, sourceUnit)
Filtra hexágonos según condiciones:
- `unit`: solo ocupados por unidades
- `empty`: solo vacíos
- `enemy`: solo unidades enemigas
- `ally`: solo unidades aliadas
- `self`: solo la propia unidad
- `hp`: condición de HP (max, min, percent)
- `adjacent`: solo adyacentes
- `movementPath`: camino de movimiento válido

### getAbilityHighlights(state, unitId, abilityConfig, playerId)
Genera los hexágonos destacados para una habilidad:
- Combina range + target filter
- Aplica validaciones adicionales (costo, flags, restricciones)

### isValidTarget(state, hex, targetFilter, sourceUnit, abilityConfig?)
Verifica si un hex es blanco válido para una acción específica.

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state` | State |
| `../hex` (hexDistance, hexNeighbors, etc.) | Hex |
| `./data/ability-config/types` | Habilidades (tipos de target/range) |
| `./data/ability-config` | Habilidades (ABILITY_CONFIG) |
| `./utils` | Utilidades |

## Acoplamiento
- **Medio**: depende de state, hex, y ability-config
- **Alto** con ability-config: conoce AbilityRange, AbilityTarget, y las configs de habilidades
- Es usado por el cliente (Board.tsx) y por el servidor (handler de habilidades)
- `selection.ts` es grande (345 líneas) y maneja múltiples responsabilidades (rango, filtro, highlights)
