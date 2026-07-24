# Sistema de Preparación

## Propósito
Orquesta las pantallas de pre-partida: selección de identidad, lanzamiento de dados, revelación de identidades, resultados de dados, y despliegue de unidades.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `PreparationScreen.tsx` | Controlador de fase: renderiza sub-pantalla según `preparationPhase` |
| `IdentitySelection.tsx` | Selección de carta de identidad (6 cartas, elegir 1) |
| `DiceRoll.tsx` | Animación de dados |
| `RevealScreen.tsx` | Muestra ambas identidades seleccionadas |
| `RollResults.tsx` | Resultados del lanzamiento de dados |
| `DeploymentScreen.tsx` | Pantalla de despliegue de unidades |
| `DeploymentPanel.tsx` | Panel lateral con pool de unidades desplegables |
| `DeploymentUnitPool.tsx` | Entrada individual de unidad desplegable |
| `identityData.ts` | Datos estáticos de identidades para UI |

## Flujo de Datos
```
state.preparationPhase
  │
  ├── IDENTITY_SELECTION → IdentitySelection
  │     └── sendAction({ type: 'SELECT_IDENTITY', ... })
  │
  ├── ROLL / ROLL_RESULT → DiceRoll / RollResults
  │     └── sendAction({ type: 'ROLL_DICE' })
  │
  ├── REVEAL → RevealScreen (overlay)
  │     └── sendAction({ type: 'DISMISS_REVEAL' })
  │
  └── DEPLOYMENT → DeploymentScreen (con Board)
        └── sendAction({ type: 'DEPLOY_UNIT', ... })
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `GameState`, `GameAction` | Estado | Datos de juego y acciones |
| `Board`, `HexTile` | Tablero | Despliegue en el tablero |
| `@shared` | Motor | Tipos, identidades |

## Acoplamiento
- **Bajo**: sistema de preparación es una hoja (leaf) en el árbol de dependencias
- Depende del Estado pero no de Animación, Sonido, Temas, ni Keybindings
- DeploymentScreen usa el componente Board (tablero) para mostrar el hex grid
- Las pantallas son renderizadas condicionalmente por `App.tsx` según `preparationPhase`
