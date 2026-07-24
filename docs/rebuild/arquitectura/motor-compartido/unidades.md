# Sistema de Unidades

## Propósito
Creación de unidades, definición de estadísticas base por clase, y funciones de consulta sobre unidades en el tablero.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `units/factory.ts` | `createUnit()`: crea una unidad desde stats de clase + habilidades |
| `units/stats.ts` | `BASE_STATS`: stats base por clase, `UnitClass` |
| `units/queries.ts` | `countPlayerClasses()`, `isNearAnyAlliedUnit()` |
| `units/index.ts` | Re-export |

## Estadísticas Base por Clase
| Clase | PA | HP | Ataque | Defensa | Movimiento |
|---|---|---|---|---|---|
| Arquero | 3 | 12 | 6 | 3 | 2 |
| Infantería | 2 | 16 | 6 | 1 | 1 |
| Caballería | 3 | 14 | 7 | 1 | 1 |
| Lancero | 3 | 14 | 7 | 1 | 1 |
| General | 4 | 20 | 6 | 1 | 1 |

## Funciones

### createUnit(state, class, owner, position, unitId?)
Crea una unidad con:
- Stats base de la clase (modificables por identidad)
- Habilidades de clase desde `data/abilities.ts` (CLASS_ABILITIES)
- Flags iniciales
- Estado de dirección (frente al enemigo por defecto)

### countPlayerClasses(state, playerId, class?)
Cuenta unidades de un jugador (por clase opcionalmente).

### isNearAnyAlliedUnit(state, unitId, range?)
Determina si hay unidades aliadas cerca (para reglas de moral/apoyo).

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state` | State |
| `./data/abilities` (CLASS_ABILITIES) | Habilidades |

## Acoplamiento
- **Bajo**: solo depende de state y data/abilities
- `createUnit()` es usado por deployment (fase de despliegue) y por test/evaluación de IA
- `BASE_STATS` es usado abundantemente por combate, pasivas, effects, y ability-config handler
