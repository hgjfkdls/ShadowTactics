# Sistema de Animación

## Propósito
Motor de animaciones basado en colas por capas. Permite reproducir secuencias de animaciones (movimiento, rotación, daño, curación, muerte, cartas) de forma concurrente en diferentes capas.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `AnimationContext.tsx` | Provider de React que expone el motor |
| `AnimationEngine.ts` | Core: colas por capa, bucle rAF, handlers onStart/onComplete |
| `FlipCardOverlay.tsx` | Animación 3D CSS de volteo de carta |
| `types.ts` | Tipos: Animation, AnimationQueue, AnimationLayer |
| `render/AnimationRenderer.ts` | Interfaz del renderer |
| `render/SvgRenderer.ts` | Implementación SVG: actualiza posiciones/ángulos, muestra números de daño |

## Flujo de Datos
```
Componentes (Board, GameModals)
  │  enqueue(animation) / enqueueMultiple(animations)
  ▼
AnimationEngine
  │  Por capa (fx, ui, sfx, fx:unit123, ui:unit456)
  │  Procesa colas en rAF
  ▼
  ├── move: interpola posición segmento a segmento
  ├── rotate: interpola ángulo
  ├── damage/heal: muestra número flotante vía SvgRenderer
  ├── death: animación de desvanecimiento (3s)
  ├── speech: activa burbuja de diálogo
  └── flipCard: activa overlay de volteo
  │
  ▼
SvgRenderer
  ├── setUnitPosition(id, hex) → actualiza animPositions
  ├── setUnitRotation(id, angle) → actualiza animAngles
  └── damageOverlay(dmg, hex) → renderiza número
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `useSound()` | Sonido | Reproduce sonidos al iniciar animaciones (playSfx, playKey) |
| `@shared/hex` | Motor | HexCoord para interpolación de movimiento |
| `SoundLayer` | Sonido | Tipo compartido para layers de sonido |

## Acoplamiento
- **Medio** con el sistema de Sonido (anima → reproduce sonido; unidireccional)
- **Bajo** con el Motor Compartido (solo tipos de coordenadas)
- **Bien desacoplado**: `AnimationRenderer` es una interfaz, permitiendo intercambiar SvgRenderer por Canvas/WebGL
- **El Context** es un puente delgado entre el motor imperativo y React declarativo
