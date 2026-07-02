import type { SoundOptions, SoundLayer } from '../types';
import type { SoundRenderer } from './SoundRenderer';

export class NullRenderer implements SoundRenderer {
  async load(_url: string): Promise<void> {}
  async play(_url: string, _layer: SoundLayer, _options?: SoundOptions): Promise<()> {
    return () => {};
  }
  setMasterVolume(_volume: number): void {}
  setLayerVolume(_layer: SoundLayer, _volume: number): void {}
  pauseAll(): void {}
  resumeAll(): void {}
  pauseLayer(_layer: SoundLayer): void {}
  resumeLayer(_layer: SoundLayer): void {}
  dispose(): void {}
}
