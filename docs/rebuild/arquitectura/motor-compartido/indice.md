# Motor Compartido — Índice de Sistemas

## Visión General

El Motor Compartido es el núcleo del juego: contiene todas las reglas, tipos, y lógica de juego en TypeScript puro, sin dependencias externas ni efectos secundarios. Corre idéntico en cliente y servidor, garantizando consistencia.

Sigue un patrón **Redux-like**: una acción (`GameAction`) entra al reducer (`applyAction`) y produce un nuevo estado (`GameState`). Los subsistemas se organizan por dominio (combate, modificadores, fases, etc.).

```
GameAction
  │
  ▼
applyAction(state, action)
  │
  ├── Preparación → phases/identity, roll, deployment
  ├── USE_CARD → actions/card.ts → data/card-config/ → modifiers/engine
  ├── USE_ABILITY → data/ability-config/handler/ → combat/ + effects/ + modifiers/
  ├── END_TURN → phases/turn.ts → modifiers + passive + formations + aura + card
  └── Otras → inline en reducer
```

## Subsistemas

| Documento | Descripción | Ruta |
|---|---|---|
| [State + Reducer](state.md) | Estado central, tipos de acción, reducer principal | `state.ts`, `action-types.ts`, `reducer.ts`, `init.ts` |
| [Combate](combate.md) | Resolución de ataques: dificultad, daño, contraataques | `combat/` |
| [Modificadores](modificadores.md) | Buffs/debuffs temporales con turnos/usuos | `modifiers/` |
| [Selección](seleccion.md) | Cálculo de rangos, filtrado de blancos | `board/selection.ts` |
| [Fases](fases.md) | Manejo de fases del juego | `phases/` |
| [Cartas](cartas.md) | Mazo, robo, uso, contraataque | `actions/card.ts`, `data/card-config/` |
| [Habilidades](habilidades.md) | Configuración y ejecución de habilidades | `data/ability-config/` |
| [Efectos](efectos.md) | Procesador de efectos config-driven | `effects/processEffects.ts` |
| [Pasivas](pasivas.md) | Evaluación de habilidades pasivas | `passive.ts` |
| [Unidades](unidades.md) | Creación, estadísticas, consultas | `units/` |
| [Formaciones](formaciones.md) | Detección de formaciones tácticas | `formations.ts` |
| [Aura](aura.md) | Aura de mando del general | `aura.ts` |
| [Movimiento](movimiento.md) | Costo de movimiento | `movement/cost.ts` |
| [Hex](hex.md) | Sistema de coordenadas hexagonales | `shared/hex/` |
| [Datos](datos.md) | Definiciones estáticas | `data/abilities.ts`, `identities.ts`, `modifier-config.ts` |
| [i18n](i18n.md) | Internacionalización | `shared/i18n/` |

## Acoplamiento Interno

- **state.ts** es el sistema más referenciado: todos los demás lo importan
- **modifiers/engine.ts** es el segundo hub: ~15 subsistemas lo importan
- **data/ability-config/** es transversal: usado por combate, fases, handler, efectos, selección
- **passive.ts** tiene un ciclo de dependencia tipo-only con `combat/ability-effects.ts`
- **movement/cost.ts** y **timer.ts** son los más desacoplados (dependencias mínimas)
