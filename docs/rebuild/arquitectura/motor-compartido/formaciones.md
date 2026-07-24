# Sistema de Formaciones

## Propósito
Detección de formaciones tácticas (línea y triángulo) entre unidades aliadas, y aplicación de modificadores bonus asociados.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `formations.ts` | evaluateFormations, applyFormationModifiers, applyMuroEspartanoModifiers |

## Funciones Principales

### evaluateFormations(state, playerId)
Analiza posiciones de unidades y detecta:
- **Formación de línea**: 3+ unidades en línea recta (misma fila o columna hexagonal)
- **Formación de triángulo**: 3 unidades mutuamente adyacentes

### applyFormationModifiers(state, playerId)
Asigna modificadores según la identidad activa:
- **Corazón de Estratega**: +1 defensa para unidades en línea, +1 ataque en triángulo
- Limpia y re-aplica en cada evaluación

### applyMuroEspartanoModifiers(state, playerId)
- **Espartano**: lanceros adyacentes reciben +1 ataque

## Flujo de Datos
```
applyTurnStart (phases/turn.ts)
  │  applyFormationModifiers(state, playerId)
  │    ├── evaluateFormations(state, playerId)
  │    ├── removeModifier para formaciones previas
  │    └── addModifier si cumple condiciones
  │
  └── applyMuroEspartanoModifiers(state, playerId)
        └── addModifier para lanceros adyacentes
```

```
reducer.ts (post-process)
  └── refreshFormations(state) → re-evalúa al cambiar posiciones
```

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state` | State |
| `../hex` (hexDistance, hexNeighbors) | Hex |
| `./modifiers/engine` (addModifier, removeModifier) | Modificadores |

## Acoplamiento
- **Bajo**: solo 3 dependencias
- Es llamado desde `phases/turn.ts` (inicio de turno) y `reducer.ts` (post-procesamiento)
- No es usado por ningún otro subsistema
