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

## Principio de diseño fundamental

**La capa de animaciones NO debe depender del motor gráfico.**

Hoy el juego renderiza en SVG, mañana podría ser WebGL (PixiJS/Three.js) o Canvas. El sistema de animaciones debe estar diseñado para que el motor gráfico sea un detalle intercambiable.

Para lograrlo, se separan tres responsabilidades:

```
AnimationEngine (timing/colas)          → solo lógica temporal, sin imports de render
     │
     ▼
AnimationRenderer (interfaz abstracta)  → interface que cualquier motor implementa
     │
     ├─► SvgRenderer (hoy)              → manipula elementos SVG
     └─► GlRenderer (futuro)            → manipula WebGL sprites
```

## Estado ideal

```
@client/game/animation/
  AnimationContext.tsx    → contexto + provider
  AnimationEngine.ts      → procesador de cola (sin imports de render)
  types.ts                → tipos de animación (datos, no visuales)
  render/
    AnimationRenderer.ts  → interfaz abstracta del renderer
    SvgRenderer.tsx       → implementación SVG (hoy)
    GlRenderer.tsx        → implementación WebGL (futuro)
  tween.ts                → funciones de interpolación (opcional)
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
    ├─► onStep(frame)         → event: { time, progress }
    ├─► onComplete()          → siguiente animación en cola
    │
    ▼
AnimationRenderer (interfaz)
    │
    ├─► updateUnitPosition(unitId, hex)     → mueve token visual
    ├─► showDamageNumber(targetId, amount)  → muestra número flotante
    ├─► showHealNumber(targetId, amount)    → muestra curación
    ├─► playEffect(effect, position)        → partícula/efecto
    └─► playAttackAnimation(attacker, target) → animación de ataque
```

## Tipos de animación

Los tipos de animación deben ser **datos puros**, sin referencias al motor gráfico:

```typescript
// types.ts
export type Animation = {
  id: string;
  type: 'move' | 'attack' | 'counter' | 'damage' | 'heal' | 'particle' | 'wait';
  duration: number;        // ms totales
  // Datos específicos por tipo:
  unitId?: string;
  targetId?: string;
  path?: HexCoord[];
  amount?: number;
  effect?: string;
  position?: HexCoord;
};
```

## Migración

### Fase 1: AnimationRenderer (interfaz abstracta)

```typescript
// render/AnimationRenderer.ts
export interface AnimationRenderer {
  updateUnitPosition(unitId: string, position: HexCoord): void;
  showDamageNumber(targetId: string, amount: number): void;
  showHealNumber(targetId: string, amount: number): void;
  playEffect(effect: string, position: HexCoord): void;
  playAttackAnimation(attackerId: string, targetId: string): Promise<void>;
  resetUnitPosition(unitId: string): void;
}
```

### Fase 2: SvgRenderer (implementación concreta)

```typescript
// render/SvgRenderer.tsx
export class SvgRenderer implements AnimationRenderer {
  constructor(private setAnimPositions: (pos: Record<string, HexCoord>) => void) {}

  updateUnitPosition(unitId: string, position: HexCoord): void {
    // Escribe en animPositions → UnitsLayer lee para renderizar
    this.setAnimPositions(prev => ({ ...prev, [unitId]: position }));
  }

  resetUnitPosition(unitId: string): void {
    this.setAnimPositions(prev => {
      const next = { ...prev };
      delete next[unitId];
      return next;
    });
  }

  // Resto de métodos...
}
```

**Proteger**: `animPositions` debe mantener la misma interfaz `Record<string, HexCoord>` que UnitsLayer espera.

### Fase 3: AnimationEngine (solo timing)

```typescript
// AnimationEngine.ts
export class AnimationEngine {
  private queue: Animation[] = [];
  private current: Animation | null = null;
  private frameId: number = 0;

  constructor(private renderer: AnimationRenderer) {}

  enqueue(anim: Animation): void {
    this.queue.push(anim);
    if (!this.current) this.processNext();
  }

  private processNext(): void {
    this.current = this.queue.shift() ?? null;
    if (!this.current) return;
    this.runAnimation(this.current);
  }

  private runAnimation(anim: Animation): void {
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / anim.duration, 1);

      // Emitir frame actual — la implementación concreta decide cómo renderizar
      this.onFrame?.(anim, progress);

      if (progress < 1) {
        this.frameId = requestAnimationFrame(tick);
      } else {
        this.onComplete?.(anim);
        this.current = null;
        this.processNext();
      }
    };

    // Animación tipo move: interpola posición
    if (anim.type === 'move' && anim.path && anim.unitId) {
      const startPos = anim.path[0];
      const endPos = anim.path[anim.path.length - 1];
      // requestAnimationFrame loop que interpola
      this.frameId = requestAnimationFrame(tick);
    }

    // Animación tipo attack: reproduce y espera
    if (anim.type === 'attack') {
      this.renderer.playAttackAnimation(anim.unitId!, anim.targetId!)
        .then(() => this.processNext());
    }

    // Animación tipo damage/heal: muestra número + wait
    if (anim.type === 'damage') {
      this.renderer.showDamageNumber(anim.targetId!, anim.amount!);
      setTimeout(() => this.processNext(), anim.duration);
    }
  }

  onFrame?: (anim: Animation, progress: number) => void;
  onComplete?: (anim: Animation) => void;

  clear(): void {
    this.queue = [];
    cancelAnimationFrame(this.frameId);
    this.current = null;
  }
}
```

**Proteger**: `requestAnimationFrame` es la API estándar de browser para timing. No depende de SVG ni WebGL.

### Fase 4: AnimationContext y provider

```typescript
// AnimationContext.tsx
const AnimationContext = createContext<{
  enqueue: (anim: Animation) => void;
  isAnimating: boolean;
  skipAll: () => void;
}>(null);

export function AnimationProvider({ children, renderer }: { children: ReactNode; renderer: AnimationRenderer }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const engineRef = useRef(new AnimationEngine(renderer));

  // Conectar engine a React state
  useEffect(() => {
    const engine = engineRef.current;
    engine.onFrame = () => { /* actualizar estado si es necesario */ };
    engine.onComplete = () => { /* verificar cola */ };
  }, []);

  return (
    <AnimationContext.Provider value={{ enqueue: engineRef.current.enqueue.bind(engineRef.current), isAnimating, skipAll: engineRef.current.clear.bind(engineRef.current) }}>
      {children}
    </AnimationContext.Provider>
  );
}
```

### Fase 5: Migrar Cabalgar

Actualmente en `HexBoard.tsx` — ~60 líneas de setTimeout + refs + animPath/animStep.

**Nuevo**: 

```typescript
const { enqueue } = useAnimation();

// Después de enviar la acción:
enqueue({
  id: `move_${unitId}_${Date.now()}`,
  type: 'move',
  unitId,
  path: [unit.position, ...cabalgarPath],
  duration: 700 * cabalgarPath.length,
});
```

El engine se encarga del timing. El SvgRenderer actualiza `animPositions`. UnitsLayer sigue leyendo `animPositions` igual que hoy. **No cambia nada en UnitsLayer.**

### Fase 6: Attack/Effect animations

Cuando ocurre un ataque, desde `useHexClick` o los handlers:

```typescript
enqueue({ id: `atk_${Date.now()}`, type: 'attack', unitId: attackerId, targetId, duration: 300 });
enqueue({ id: `dmg_${Date.now()}`, type: 'damage', targetId, amount: result.damage, duration: 500 });
if (result.counterDamage > 0) {
  enqueue({ id: `cnt_${Date.now()}`, type: 'counter', unitId: targetId, targetId: attackerId, duration: 300 });
  enqueue({ id: `dmg2_${Date.now()}`, type: 'damage', targetId: attackerId, amount: result.counterDamage, duration: 500 });
}
```

**Proteger**: La secuencia debe ser atacante → daño → (contra → daño contra). El engine procesa en orden FIFO.

## Cómo soportar WebGL en el futuro

Cuando se quiera migrar a WebGL:

1. Crear `GlRenderer.tsx` que implemente `AnimationRenderer`:
   ```typescript
   export class GlRenderer implements AnimationRenderer {
     constructor(private pixiApp: PIXI.Application) {}
     updateUnitPosition(unitId: string, position: HexCoord): void {
       // Mover sprite de PixiJS
       const sprite = this.pixiApp.stage.getChildByName(unitId);
       if (sprite) sprite.position = axialToScreen(position);
     }
     // ...
   }
   ```

2. Reemplazar el provider:
   ```typescript
   <AnimationProvider renderer={new GlRenderer(pixiApp)}>
   ```

3. **No se toca** `AnimationEngine`, `AnimationContext`, `types.ts`, ni ningún handler que encola animaciones.

## Interacciones críticas a proteger

| Interacción | Estado actual | Migración |
|-------------|--------------|-----------|
| Cabalgar step-by-step | setTimeout 700ms en HexBoard | Mover a AnimationEngine + SvgRenderer |
| Bloqueo de input durante animación | `disableInput` prop | Mantener, engine lo setea |
| UnitsLayer renderPos | `animPositions` prop | Mantener misma interfaz |
| Confirmación de Cabalgar | Modal inline + setAnimPath | Mover a GameModals + enqueue |
| Ataque instantáneo | Sin animación | Agregar animación opcional (no bloqueante) |
| **UnitsLayer** | Lee `animPositions` para renderPos | **No cambia** — recibe datos, no importa el motor |

## Notas de diseño

1. **Las animaciones no deben afectar el estado del juego.** Son puramente visuales. El estado se actualiza cuando llega la respuesta del servidor/estado compartido.
2. **El engine debe poder omitir animaciones** si el jugador las desactiva (settings). En ese caso, `onComplete` se llama inmediatamente.
3. **Las animaciones deben poder interrumpirse** si el jugador hace clic en "Saltar" o si se desconecta.
4. **Los tiempos de animación deben ser configurables** (normal, rápido, instantáneo).
5. **El sistema debe ser graphics-engine agnostic.** `AnimationEngine` solo importa `types.ts`. `AnimationRenderer` es una interfaz. La implementación concreta (`SvgRenderer`/`GlRenderer`) se inyecta desde afuera.
6. **Pruebas unitarias**: `AnimationEngine` se puede testear sin DOM ni SVG, solo con un mock de `AnimationRenderer`.
