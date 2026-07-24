# Sistema de Tablero

## Propósito
Renderiza el tablero hexagonal como SVG, gestiona la interacción del jugador (clic, hover, teclado), y coordina la visualización de unidades, animaciones, y estados de selección.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `src/client/game/board/Board.tsx` | Orquestador principal: renderiza SVG, maneja teclado, computa rangos y blancos |
| `src/client/game/board/HexTile.tsx` | Renderiza un hexágono individual con estados visuales |
| `src/client/game/board/UnitsLayer.tsx` | Renderiza fichas de unidades, HP bars, tooltips |
| `src/client/game/board/UnitTooltip.tsx` | Tooltip flotante con datos de unidad |
| `src/client/game/board/SpeechBubble.tsx` | Burbuja de diálogo sobre unidades |
| `src/client/game/board/hexMath.ts` | Conversión axial-to-pixel, puntos del polígono |
| `src/client/game/board/useViewport.ts` | Estado de pan/zoom |
| `src/client/game/board/useSelection.ts` | Máquina de estados de selección (useReducer) |
| `src/client/game/board/BoadrInteractionContext.tsx` | Contexto de interacción (nota: typo "Boadr" en original) |
| `src/client/game/board/handlers/useHexClick.ts` | Handler central de clics (desplegar, mover, atacar, habilidad, carta) |
| `src/client/game/board/hooks/useGameEvents.ts` | Reacciona al historial de juego → encola animaciones |
| `src/client/game/board/movementRange.ts` | Cálculo de rango de movimiento |

## Flujo de Datos
```
Estado global (GameState)
  │
  ▼
Board.tsx
  ├── Computa rangos (movimiento, ataque, habilidades) vía motor compartido
  ├── Determina hexágonos reachable/attackable/selected/hovered
  ├── Renderiza HexTile × N + UnitsLayer
  │
  ▼
useHexClick(hex)
  ├── Determina modo de interacción (seleccionar unidad, mover, atacar, habilidad, carta)
  ├── Valida acción localmente
  ├── Llama sendAction(action)
  └── Feedback visual inmediato
  │
  ▼
useGameEvents(history)
  └── Encola animaciones (mover, rotar, daño, muerte, etc.)
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `useAnimation()` | Animación | Posiciones animadas, encolar animaciones |
| `useKeyBindings()` | Keybindings | Atajos de teclado (D, Q, Space, W/E/R, Escape) |
| `useSound()` | Sonido | Reproducir sonidos contextuales |
| `@shared/game/board/selection` | Motor | Cálculo de rangos y blancos |
| `@shared/game/data/ability-config` | Motor | Config de habilidades para highlights y targeting |
| `@shared/game/utils` | Motor | isHexOccupied, isWithinBounds |
| `@shared/hex` | Motor | Coordenadas, distancias, direcciones |

## Acoplamiento
- **Muy alto** con el sistema de Animación (lee/escribe posiciones animadas directamente)
- **Alto** con el sistema de Estado (depende de GameState para todo)
- **Alto** con el Motor Compartido (selection, ability-config, utils, hex)
- **Medio** con el sistema de Sonido y Keybindings
- **Internamente complejo**: Board.tsx integra múltiples subsistemas (SVG, interacción, animación, teclado, tooltips)
