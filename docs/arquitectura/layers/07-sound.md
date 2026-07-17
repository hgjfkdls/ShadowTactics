# Capa Sound — Estrategia de implementación

## Principio de diseño

**La capa de sonido NO debe depender del motor de audio.** Hoy Web Audio API, mañana podría ser Howler.js, FMOD o un mix. El motor de audio es un detalle intercambiable.

```
SoundEngine (timing/colas/volumen)     → solo lógica, sin imports de audio
     │
     ▼
SoundRenderer (interfaz abstracta)     → interface que cualquier backend implementa
     │
     ├─► WebAudioRenderer (hoy)        → Web Audio API (navegador)
     ├─► HowlerRenderer (opcional)     → Howler.js si se necesita más features
     └─► NullRenderer (testing)        → silencio, para tests
```

## Estructura

```
@client/game/sound/
  SoundContext.tsx       → contexto + provider
  SoundEngine.ts         → gestor de colas, prioridad, volumen (sin imports de audio)
  types.ts               → tipos de sonido (eventos, no archivos)
  render/
    SoundRenderer.ts     → interfaz abstracta
    WebAudioRenderer.ts  → implementación Web Audio API
    NullRenderer.ts      → implementación silenciosa (tests)
  assets.ts              → mapeo de eventos → archivos de audio
```

## Tipos

```typescript
// types.ts
export type SoundEvent = 
  | 'ui_click'
  | 'ui_confirm'
  | 'ui_cancel'
  | 'ui_error'
  | 'ui_select_unit'
  | 'move'
  | 'attack'
  | 'hit'
  | 'miss'
  | 'critical'
  | 'counterattack'
  | 'kill'
  | 'general_kill'
  | 'heal'
  | 'shield'
  | 'buff'
  | 'debuff'
  | 'ability_activate'
  | 'card_play'
  | 'counter_play'
  | 'turn_start'
  | 'turn_end'
  | 'victory'
  | 'defeat'
  | 'roll_dice'
  | 'deploy_unit'
  | 'meditation'
  | 'whirlwind'
  | 'charge'
  | 'ride';

export type SoundPriority = 'low' | 'normal' | 'high' | 'interrupt';

export type SoundOptions = {
  volume?: number;           // 0-1 (hereda del global)
  rate?: number;             // playback rate (0.5-2)
  pan?: number;              // stereo pan (-1 left, 1 right)
  priority?: SoundPriority;
  allowOverlap?: boolean;    // false = detiene sonido anterior del mismo tipo
  cooldown?: number;         // ms mínimo entre reproducciones del mismo tipo
};

export type SoundInstance = {
  id: string;
  event: SoundEvent;
  startedAt: number;
  options: SoundOptions;
};
```

## Interfaz del renderer

```typescript
// render/SoundRenderer.ts
export interface SoundRenderer {
  /** Carga un archivo de audio y lo mantiene en memoria */
  load(url: string): Promise<void>;
  /** Reproduce un sonido. Devuelve función para detenerlo. */
  play(url: string, options?: SoundOptions): Promise<() => void>;
  /** Cambia volumen global (0-1) */
  setMasterVolume(volume: number): void;
  /** Pausa/reanuda todos los sonidos */
  pauseAll(): void;
  resumeAll(): void;
  /** Descarta recursos */
  dispose(): void;
}
```

## SoundEngine

El engine gestiona colas, prioridades y cooldowns. No importa el renderer directamente, solo la interfaz.

```typescript
// SoundEngine.ts
export class SoundEngine {
  private activeSounds: Map<string, SoundInstance> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private masterVolume: number = 1;
  private muted: boolean = false;

  constructor(private renderer: SoundRenderer) {}

  setMasterVolume(v: number): void { this.masterVolume = v; this.renderer.setMasterVolume(v); }
  toggleMute(): void { this.muted = !this.muted; this.muted ? this.renderer.pauseAll() : this.renderer.resumeAll(); }
  get isMuted(): boolean { return this.muted; }

  async play(event: SoundEvent, options: SoundOptions = {}): Promise<void> {
    if (this.muted) return;
    if (this.isOnCooldown(event, options)) return;
    if (!options.allowOverlap && this.activeSounds.has(event)) return;
    if (options.priority === 'interrupt') this.stopByPriority('low');

    const url = getSoundUrl(event);
    if (!url) return;

    this.setCooldown(event, options);
    const stop = await this.renderer.play(url, options);
    const instance: SoundInstance = { id: `${event}_${Date.now()}`, event, startedAt: Date.now(), options };
    this.activeSounds.set(event, instance);
    // Auto-remove when done
    setTimeout(() => this.activeSounds.delete(event), 1000);
  }

  private isOnCooldown(event: SoundEvent, options: SoundOptions): boolean {
    if (!options.cooldown) return false;
    const lastPlayed = this.cooldowns.get(event);
    if (!lastPlayed) return false;
    return Date.now() - lastPlayed < options.cooldown;
  }

  private setCooldown(event: SoundEvent, options: SoundOptions): void {
    if (options.cooldown) this.cooldowns.set(event, Date.now());
  }

  private stopByPriority(priority: 'low'): void {
    for (const [event, instance] of this.activeSounds) {
      if (instance.options.priority === 'low') {
        // signal stop
        this.activeSounds.delete(event);
      }
    }
  }

  async preloadAll(events: SoundEvent[]): Promise<void> {
    const urls = events.map(getSoundUrl).filter(Boolean) as string[];
    await Promise.all(urls.map(url => this.renderer.load(url)));
  }

  dispose(): void { this.renderer.dispose(); }
}
```

## Mapa de eventos → assets

```typescript
// assets.ts
const SOUND_MAP: Partial<Record<SoundEvent, string>> = {
  ui_click: '/sounds/ui/click.mp3',
  ui_confirm: '/sounds/ui/confirm.mp3',
  ui_cancel: '/sounds/ui/cancel.mp3',
  ui_select_unit: '/sounds/ui/select.mp3',
  move: '/sounds/game/move.mp3',
  attack: '/sounds/game/attack.mp3',
  hit: '/sounds/game/hit.mp3',
  miss: '/sounds/game/miss.mp3',
  critical: '/sounds/game/critical.mp3',
  counterattack: '/sounds/game/counter.mp3',
  kill: '/sounds/game/kill.mp3',
  general_kill: '/sounds/game/general_kill.mp3',
  heal: '/sounds/game/heal.mp3',
  buff: '/sounds/game/buff.mp3',
  debuff: '/sounds/game/debuff.mp3',
  card_play: '/sounds/game/card.mp3',
  turn_start: '/sounds/game/turn_start.mp3',
  victory: '/sounds/game/victory.mp3',
  defeat: '/sounds/game/defeat.mp3',
  roll_dice: '/sounds/game/dice.mp3',
  charge: '/sounds/game/charge.mp3',
  ride: '/sounds/game/ride.mp3',
};

export function getSoundUrl(event: SoundEvent): string | undefined {
  return SOUND_MAP[event];
}
```

## WebAudioRenderer

```typescript
// render/WebAudioRenderer.ts
export class WebAudioRenderer implements SoundRenderer {
  private ctx: AudioContext;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private masterGain: GainNode;
  private activeSources: AudioBufferSourceNode[] = [];

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
  }

  async load(url: string): Promise<void> {
    if (this.bufferCache.has(url)) return;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.bufferCache.set(url, audioBuffer);
  }

  async play(url: string, options: SoundOptions = {}): Promise<() => void> {
    if (!this.bufferCache.has(url)) await this.load(url);
    const buffer = this.bufferCache.get(url)!;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = (options.volume ?? 1) * this.masterGain.gain.value;
    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    if (options.rate) source.playbackRate.value = options.rate;
    source.start(0);

    this.activeSources.push(source);
    source.onended = () => {
      this.activeSources = this.activeSources.filter(s => s !== source);
    };

    return () => { try { source.stop(); } catch {} };
  }

  setMasterVolume(volume: number): void { this.masterGain.gain.value = volume; }
  pauseAll(): void { this.ctx.suspend(); }
  resumeAll(): void { this.ctx.resume(); }

  dispose(): void {
    this.activeSources.forEach(s => { try { s.stop(); } catch {} });
    this.ctx.close();
  }
}
```

## Layers de audio simultáneos

El sistema soporta 3 layers independientes que se reproducen en paralelo:

| Layer | Uso | Volumen default | Comportamiento |
|-------|-----|-----------------|----------------|
| `music` | Música de fondo | 0.5 | Loop, crossfade, un solo tema a la vez |
| `sfx` | Efectos de sonido | 1.0 | Múltiples simultáneos, cooldown por evento |
| `voice` | Voces de personaje | 1.0 | Uno a la vez (interrumpe el anterior) |

Cada layer tiene su propio `GainNode` en WebAudioRenderer, con volumen independiente:

```
                    ┌─► musicGain ─┐
                    ├─► sfxGain ───┤
MasterGain ────────┼─► voiceGain ─┼─► Destination
                    └──────────────┘
```

```typescript
// Uso desde cualquier componente
const { play, setLayerVolume } = useSound();

// Música de fondo (loop)
play('victory', { layer: 'music', loop: true, volume: 0.3 });

// Efecto (layer por defecto: sfx)
play('hit', { cooldown: 100 });

// Voz de personaje (interrumpe voz anterior)
play('charge', { layer: 'voice' });

// Ajustar volumen de música sin afectar efectos
setLayerVolume('music', 0.3);
```

## Hook para reproducción automática

```typescript
// useGameSounds.ts — conecta eventos del juego con sonidos
export function useGameSounds() {
  const { play } = useSound();
  const state = useGameState(); // del game context

  // Reaccionar a gameHistory
  useEffect(() => {
    const lastEntry = state.gameHistory[state.gameHistory.length - 1];
    if (!lastEntry) return;

    switch (lastEntry.type) {
      case 'attack':
        if (lastEntry.hit) {
          play(lastEntry.damage > 0 ? 'hit' : 'miss');
          if (lastEntry.critical) play('critical');
        } else {
          play('miss');
        }
        if (lastEntry.targetKilled || lastEntry.attackerKilled) play('kill');
        break;
      case 'move':
        play('move');
        break;
      case 'card':
        play('card_play');
        break;
    }
  }, [state.gameHistory.length]);

  // Reaccionar a game phase
  useEffect(() => {
    if (state.gamePhase === 'GAME_OVER') {
      play(state.winner === state.activePlayer ? 'victory' : 'defeat');
    }
  }, [state.gamePhase]);
}
```

## NullRenderer (testing)

```typescript
// render/NullRenderer.ts
export class NullRenderer implements SoundRenderer {
  async load(_url: string): Promise<void> {}
  async play(_url: string, _options?: SoundOptions): Promise<() => void> {
    return () => {};
  }
  setMasterVolume(_volume: number): void {}
  pauseAll(): void {}
  resumeAll(): void {}
  dispose(): void {}
}
```

## Integración con App

```typescript
// App.tsx
const engine = useMemo(() => new SoundEngine(new WebAudioRenderer()), []);
// Pre-cargar sonidos críticos al inicio
useEffect(() => { engine.preloadAll(['ui_click', 'ui_confirm', 'attack', 'hit', 'move']); }, []);

<SoundProvider engine={engine}>
  <GameApp />
</SoundProvider>
```

## Pruebas

- `SoundEngine` se testea con `NullRenderer` — sin audio real
- `WebAudioRenderer` requiere mock de `AudioContext` (Jest)
- Cooldowns y prioridades se verifican con reloj simulado

## Dependencias con otras capas

| Capa | Interacción |
|------|-------------|
| Actions | `useGameSounds` hook escucha `gameHistory` y reproduce sonidos automáticamente |
| UI | Componentes pueden llamar `play('ui_click')` mediante `useSound()` |
| Animation | Sonidos se reproducen en paralelo a animaciones (no bloquean la cola) |
| Labels | Sin dependencia — los sonidos no usan texto |
