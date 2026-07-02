import type { SoundEvent, SoundOptions, SoundInstance, SoundLayer } from './types';
import type { SoundRenderer } from './render/SoundRenderer';
import { getSoundUrl } from './assets';

export class SoundEngine {
  private activeSounds: Map<string, SoundInstance> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private masterVolume: number = 1;
  private layerVolumes: Record<SoundLayer, number> = { music: 0.5, sfx: 1, voice: 1 };
  private muted: boolean = false;

  constructor(private renderer: SoundRenderer) {}

  setMasterVolume(v: number): void {
    this.masterVolume = v;
    this.renderer.setMasterVolume(v);
  }

  getMasterVolume(): number { return this.masterVolume; }

  setLayerVolume(layer: SoundLayer, v: number): void {
    this.layerVolumes[layer] = v;
    this.renderer.setLayerVolume(layer, v);
  }

  getLayerVolume(layer: SoundLayer): number { return this.layerVolumes[layer]; }

  toggleMute(): void {
    this.muted = !this.muted;
    this.muted ? this.renderer.pauseAll() : this.renderer.resumeAll();
  }

  get isMuted(): boolean { return this.muted; }

  async play(event: SoundEvent, options: SoundOptions = {}): Promise<void> {
    if (this.muted) return;
    if (this.isOnCooldown(event, options)) return;

    const layer = options.layer ?? 'sfx';

    if (!options.allowOverlap && this.activeSounds.has(event)) return;

    // Voice: one at a time (interrupt previous)
    if (layer === 'voice') {
      for (const [k, inst] of this.activeSounds) {
        if (inst.layer === 'voice') this.activeSounds.delete(k);
      }
    }

    const url = getSoundUrl(event);
    if (!url) return;

    this.setCooldown(event, options);
    const stop = await this.renderer.play(url, layer, {
      ...options,
      volume: (options.volume ?? 1) * this.layerVolumes[layer],
    });
    const instance: SoundInstance = {
      id: `${event}_${Date.now()}`,
      event,
      layer,
      startedAt: Date.now(),
      options,
    };
    this.activeSounds.set(event, instance);
    setTimeout(() => this.activeSounds.delete(event), 500);
  }

  private isOnCooldown(event: SoundEvent, options: SoundOptions): boolean {
    if (!options.cooldown) return false;
    const lastPlayed = this.cooldowns.get(event);
    if (!lastPlayed) return false;
    return Date.now() - lastPlayed < options.cooldown;
  }

  private setCooldown(event: SoundEvent, options: SoundOptions): void {
    if (options.cooldown && options.cooldown > 0) {
      this.cooldowns.set(event, Date.now());
    }
  }

  pauseLayer(layer: SoundLayer): void { this.renderer.pauseLayer(layer); }
  resumeLayer(layer: SoundLayer): void { this.renderer.resumeLayer(layer); }

  async preloadAll(events: SoundEvent[]): Promise<void> {
    const urls = events.map(getSoundUrl).filter(Boolean) as string[];
    await Promise.all(urls.map(url => this.renderer.load(url)));
  }

  dispose(): void { this.renderer.dispose(); }
}
