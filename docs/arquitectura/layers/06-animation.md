# Capa Animation — Estrategia de migración

## Estado actual

No hay un sistema de animaciones. Las únicas "animaciones" son implementaciones inline y ad-hoc:

| Tipo | Código | Mecanismo |
|------|--------|-----------|
| Movimiento Cabalgar/Cabalgar_2 | `HexBoard.tsx` ~60 líneas | `setTimeout` con ref, `animPath`/`animStep`/`animStartPos`/`animUnitId`, renderizado condicional en `UnitsLayer` |
| Ataque | Ninguna | Sin animación — el daño se aplica instantáneamente |
| Curaciones/Heals | Ninguna | Sin animación |
| Partículas | Ninguna | No implementado |

El código actual de animación de cabalgar está disperso:

- **Estado**: `animPath`, `animStartPos`, `animUnitId`, `animStep`, `animStepRef`, `animTimerRef` — todos en `HexBoard.tsx`
- **Lógica**: `useEffect` que avanzan `animStep` con `setTimeout(700ms)` y actualiza `animPositions`
- **Renderizado**: `animPositions` se pasa a `UnitsLayer` que lo usa para sobreescribir `renderPos`

## Estado ideal

```
@client/game/animation/
  AnimationContext.tsx    → contexto + provider
  AnimationEngine.ts      → procesador de cola
  types.ts                → tipos de animación
  tween.ts                → funciones de interpolación (opcional, futuro)
  presets.ts              → configuraciones predefinidas (duración, easing)
```

### Arquitectura

```
Acción (Move/Attack/Heal)
    │
    ▼
AnimationContext.enqueue(animation)
    │
    ▼
AnimationEngine (procesa cola secuencialmente)
    │
    ├─► onStep(unitId, position) → UnitsLayer actualiza renderPos
    ├─► onDamage(targetId, amount) → DamageNumber overlay
    ├─► onHeal(targetId, amount) → HealNumber overlay
    └─► onComplete() → siguiente animación en cola
```

## Migración

### Fase 1: Tipos y contexto

```typescript
// types.ts
export type UnitAnimation = {
  type: 'move';
  unitId: string;
  path: HexCoord[];
  duration?: number;  // ms por paso, default 700
};

export type CombatAnimation = {
  type: 'attack' | 'counter';
  attackerId: string;
  targetId: string;
};

export type EffectAnimation = {
  type: 'damage' | 'heal';
  targetId: string;
  amount: number;
};

export type ParticleAnimation = {
  type: 'particle';
  effect: string;     // 'explosion' | 'heal' | 'shield' | 'karma'
  position: HexCoord;
  duration?: number;
};

export type Animation = UnitAnimation | CombatAnimation | EffectAnimation | ParticleAnimation;
```

```typescript
// AnimationContext.tsx
const AnimationContext = createContext<{
  enqueue: (anim: Animation) => void;
  isAnimating: boolean;
  animPositions: Record<string, HexCoord>;
}>(...);

export function AnimationProvider({ children }) { ... }
export function useAnimation() { return useContext(AnimationContext); }
```

**Proteger**: `animPositions` debe tener la misma forma que el actual prop en UnitsLayer: `Record<string, HexCoord>`.

### Fase 2: Migrar Cabalgar

Actualmente en `HexBoard.tsx`:

```typescript
// Enviar acción
sendAction({ type: 'USE_ABILITY', ..., path: cabalgarPath });

// Configurar animación inline
setAnimPath(cabalgarPath);
setAnimStartPos(unit.position);
setAnimUnitId(unitId);
setAnimStep(0);
```

**Nuevo**:

```typescript
import { useAnimation } from '../animation/AnimationContext';

const { enqueue } = useAnimation();

// Enviar acción
sendAction({ type: 'USE_ABILITY', ..., path: cabalgarPath });

// Encolar animación
enqueue({ type: 'move', unitId, path: cabalgarPath });
```

### Fase 3: AnimationEngine

Engine que procesa la cola secuencialmente:

```typescript
function AnimationEngine({ queue, onStep, onComplete }: {
  queue: Animation[];
  onStep: (unitId: string, position: HexCoord) => void;
  onComplete: () => void;
}) {
  // Procesa una animación a la vez
  // Para move: avanza paso a paso con setTimeout
  // Para attack: emite onStep con posición de ataque, timeout, vuelve
  // Para damage/heal: overlay flotante con número
}
```

**Proteger**: 
- La velocidad de animación debe ser configurable (settings del juego)
- Durante la animación, el input del usuario debe estar bloqueado (ya existe `disableInput` prop en HexBoard)
- Múltiples animaciones en cola no deben solaparse

### Fase 4: Attack/Effect animations

Cuando un ataque ocurre, encolar:

```typescript
enqueue({ type: 'attack', attackerId, targetId });
setTimeout(() => {
  enqueue({ type: 'damage', targetId, amount: result.damage });
  if (result.counterDamage > 0) {
    enqueue({ type: 'counter', attackerId: targetId, targetId: attackerId });
    enqueue({ type: 'damage', targetId: attackerId, amount: result.counterDamage });
  }
}, 300);
```

**Proteger**: La secuencia debe ser: atacante → daño → (contraataque → daño contra). No debe poder solaparse con input del usuario.

### Fase 5: Partículas (futuro)

Cuando se implemente un sistema de partículas:

```typescript
enqueue({ type: 'particle', effect: 'explosion', position: target.position });
```

El renderer de partículas (p.ej., overlay PixiJS o CSS absoluto) escucha `particle` animations y las reproduce. No necesita modificar el juego.

## Interacciones críticas a proteger

| Interacción | Estado actual | Migración |
|-------------|--------------|-----------|
| Cabalgar step-by-step | setTimeout 700ms en HexBoard | Mover a AnimationEngine |
| Bloqueo de input durante animación | `disableInput` prop | Mantener, engine lo setea |
| UnitsLayer renderPos | `animPositions` prop | Mantener misma interfaz |
| Confirmación de Cabalgar | Modal inline + setAnimPath | Mover a GameModals + enqueue |
| Ataque instantáneo | Sin animación | Agregar animación opcional (no bloqueante) |

## Notas de diseño

1. **Las animaciones no deben afectar el estado del juego.** Son puramente visuales. El estado se actualiza cuando llega la respuesta del servidor/estado compartido.
2. **El engine debe poder omitir animaciones** si el jugador las desactiva (settings). En ese caso, `onComplete` se llama inmediatamente.
3. **Las animaciones deben poder interrumpirse** si el jugador hace clic en "Saltar" o si se desconecta.
4. **Los tiempos de animación deben ser configurables** (normal, rápido, instantáneo).
