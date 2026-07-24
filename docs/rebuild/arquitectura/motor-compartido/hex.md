# Sistema Hex (Coordenadas Hexagonales)

## Propósito
Implementación del sistema de coordenadas axiales para el tablero hexagonal. Proporciona operaciones matemáticas fundamentales: distancia, vecinos, rangos, dirección, y mapa hexagonal.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `shared/hex/coord.ts` | Tipo HexCoord { q, r }, axial operations |
| `shared/hex/distance.ts` | hexDistance(), hexDistanceSquared() |
| `shared/hex/directions.ts` | Direcciones cardinales y diagonales, angleTo, rotate |
| `shared/hex/map.ts` | HexMap: mapa de hex → valor con get/set/has |
| `shared/hex/neighbors.ts` | hexNeighbors(), hexNeighbor() |
| `shared/hex/range.ts` | hexRange(), hexRing(), hexSpiral() |
| `shared/hex/index.ts` | Re-export público |

## Coordenadas (coord.ts)
```typescript
interface HexCoord { q: number; r: number; }
```
Sistema axial pointy-top. El tablero tiene radio 5 (hexágonos con |q| + |r| + |q+r| ≤ 5).

## Funciones Principales
| Función | Propósito |
|---|---|
| `hexDistance(a, b)` | Distancia Manhattan en grid hexagonal |
| `hexNeighbors(hex)` | 6 vecinos inmediatos |
| `hexNeighbor(hex, direction)` | Vecino en dirección específica |
| `hexRange(center, radius)` | Todos los hex en radio |
| `hexRing(center, radius)` | Hex en el borde de un radio (anillo) |
| `hexSpiral(center, radius)` | Hex en espiral desde el centro |
| `angleTo(from, to)` | Ángulo entre dos hex (para dirección visual) |
| `HexMap` | Map con key string `${q},${r}` para lookup O(1) |

## Dependencias
| Dependencia | Tipo |
|---|---|
| Ninguna | — |

## Acoplamiento
- **Nulo**: cero dependencias internas o externas
- **Altamente referenciado**: todo el motor compartido, el servidor, y el cliente usan tipos y funciones hex
- Es el subsistema más puro y portable de todo el proyecto
