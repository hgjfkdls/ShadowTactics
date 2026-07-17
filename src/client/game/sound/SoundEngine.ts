import type { SoundEvent, SoundOptions, SoundInstance, SoundLayer } from './types';
import type { SoundRenderer } from './render/SoundRenderer';
import { getSoundUrl, getVoiceUrl, getSfxUrl } from './assets';

export class SoundEngine {
  private activeSounds: Map<string, { instance: SoundInstance; stop: () => void }> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private masterVolume: number = 1;
  private layerVolumes: Record<SoundLayer, number> = { music: 0.5, sfx: 1, voice: 1 };
  private muted: boolean = false;
  private voiceGen = 0;
  private voiceStop: (() => void) | null = null;

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

  /** Reproducir por SoundEvent (SFX) */
  async play(event: SoundEvent, options: SoundOptions = {}): Promise<void> {
    const url = getSoundUrl(event);
    if (!url) return;
    await this.playUrl(url, event, options);
  }

  /** Reproducir por key de sonido (voces multi-idioma) */
  async playKey(key: string, options: SoundOptions = {}): Promise<void> {
    const url = getVoiceUrl(key);
    await this.playUrl(url, key, options);
  }

  /** Reproducir SFX por clave genérica (no necesita SoundEvent) */
  async playSfx(key: string, options: SoundOptions = {}): Promise<void> {
    const url = getSfxUrl(key);
    await this.playUrl(url, key, options);
  }

  private async playUrl(url: string, id: string, options: SoundOptions): Promise<void> {
    if (this.muted) return;

    const layer = options.layer ?? 'sfx';

    // Voice layer: interrumpir y descartar voces previas (incluso durante carga)
    if (layer === 'voice') {
      this.voiceGen++;
      const myGen = this.voiceGen;
      if (this.voiceStop) { try { this.voiceStop(); } catch {} this.voiceStop = null; }

      let stop: () => void;
      try {
        stop = await this.renderer.play(url, layer, {
          ...options,
          volume: (options.volume ?? 1) * this.layerVolumes[layer],
        });
      } catch (e) {
        console.warn(`[SoundEngine] Failed to play ${id} from ${url}:`, e);
        return;
      }

      if (myGen !== this.voiceGen) return; // fue reemplazada durante carga

      this.voiceStop = stop;
      return;
    }

    // SFX / Music
    this.activeSounds.forEach((entry, k) => {
      if (entry.instance.event === id && !options.allowOverlap) {
        // mismo sonido ya activo, ignorar
      }
    });
    let stop: () => void;
    try {
      stop = await this.renderer.play(url, layer, {
        ...options,
        volume: (options.volume ?? 1) * this.layerVolumes[layer],
      });
    } catch (e) {
      console.warn(`[SoundEngine] Failed to play ${id} from ${url}:`, e);
      return;
    }
    const instance: SoundInstance = {
      id: `${id}_${Date.now()}`,
      event: id as any,
      layer, startedAt: Date.now(), options,
    };
    this.activeSounds.set(instance.id, { instance, stop });
    setTimeout(() => this.activeSounds.delete(instance.id), 1000);
  }

  stopAll(): void {
    for (const [, entry] of this.activeSounds) {
      try { entry.stop(); } catch {}
    }
    this.activeSounds.clear();
  }

  stopLayer(layer: SoundLayer): void {
    for (const [k, entry] of this.activeSounds) {
      if (entry.instance.layer === layer) {
        try { entry.stop(); } catch {}
        this.activeSounds.delete(k);
      }
    }
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

  async preloadKeys(keys: string[]): Promise<void> {
    const urls = keys.map(k => getVoiceUrl(k));
    await Promise.all(urls.map(url => this.renderer.load(url)));
  }

  dispose(): void { this.renderer.dispose(); }
}
