import type { SoundOptions, SoundLayer } from '../types';

export interface SoundRenderer {
  load(url: string): Promise<void>;
  play(url: string, layer: SoundLayer, options?: SoundOptions): Promise<() => void>;
  setMasterVolume(volume: number): void;
  /** Volumen por layer (0-1). Capa no especificada hereda del master. */
  setLayerVolume(layer: SoundLayer, volume: number): void;
  pauseAll(): void;
  resumeAll(): void;
  /** Pausa/reanuda solo un layer */
  pauseLayer(layer: SoundLayer): void;
  resumeLayer(layer: SoundLayer): void;
  dispose(): void;
}
