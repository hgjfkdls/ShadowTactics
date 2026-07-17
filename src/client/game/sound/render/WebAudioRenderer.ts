import type { SoundOptions, SoundLayer } from '../types';
import type { SoundRenderer } from './SoundRenderer';

export class WebAudioRenderer implements SoundRenderer {
  private ctx: AudioContext | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private masterGain: GainNode | null = null;
  private layerGains: Map<SoundLayer, GainNode> = new Map();
  private activeSources: AudioBufferSourceNode[] = [];
  private paused: boolean = false;
  private pausedLayers: Set<SoundLayer> = new Set();
  private resumed = false;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      for (const layer of ['music', 'sfx', 'voice'] as SoundLayer[]) {
        const gain = this.ctx.createGain();
        gain.gain.value = 1;
        gain.connect(this.masterGain);
        this.layerGains.set(layer, gain);
      }

      if (!this.resumed) {
        const resume = () => {
          if (this.ctx!.state === 'suspended') this.ctx!.resume();
          this.resumed = true;
          document.removeEventListener('click', resume);
          document.removeEventListener('touchstart', resume);
          document.removeEventListener('keydown', resume);
        };
        document.addEventListener('click', resume);
        document.addEventListener('touchstart', resume);
        document.addEventListener('keydown', resume);
      }
    }
    return this.ctx;
  }

  async load(url: string): Promise<void> {
    if (this.bufferCache.has(url)) return;
    try {
      const response = await fetch(url);
      if (!response.ok) { console.warn(`[WebAudioRenderer] HTTP ${response.status} for ${url}`); return; }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('audio/')) { console.warn(`[WebAudioRenderer] Non-audio response for ${url}: ${contentType}`); return; }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ensureCtx().decodeAudioData(arrayBuffer);
      this.bufferCache.set(url, audioBuffer);
    } catch (e) {
      console.warn(`[WebAudioRenderer] Failed to load ${url}:`, e);
    }
  }

  async play(url: string, layer: SoundLayer, options: SoundOptions = {}): Promise<() => void> {
    const ctx = this.ensureCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    if (!this.bufferCache.has(url)) {
      try { await this.load(url); } catch (e) {
        console.warn(`[WebAudioRenderer] Failed to load ${url}:`, e);
        return () => {};
      }
    }
    const buffer = this.bufferCache.get(url);
    if (!buffer) { console.warn(`[WebAudioRenderer] Buffer not found for ${url}`); return () => {}; }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (options.loop) source.loop = true;

    const layerGain = this.layerGains.get(layer);
    if (!layerGain) return () => {};

    const volGain = ctx.createGain();
    volGain.gain.value = options.volume ?? 1;
    source.connect(volGain);
    volGain.connect(layerGain);

    if (options.rate) source.playbackRate.value = options.rate;
    source.start(0);

    this.activeSources.push(source);
    source.onended = () => {
      this.activeSources = this.activeSources.filter(s => s !== source);
    };

    return () => { try { source.stop(); } catch {} };
  }

  setMasterVolume(volume: number): void { if (this.masterGain) this.masterGain.gain.value = volume; }

  setLayerVolume(layer: SoundLayer, volume: number): void {
    const gain = this.layerGains.get(layer);
    if (gain) gain.gain.value = volume;
  }

  pauseAll(): void {
    this.paused = true;
    if (this.ctx) this.ctx.suspend();
  }

  resumeAll(): void {
    this.paused = false;
    if (this.ctx) this.ctx.resume();
  }

  pauseLayer(layer: SoundLayer): void {
    this.pausedLayers.add(layer);
    const gain = this.layerGains.get(layer);
    if (gain) gain.gain.value = 0;
  }

  resumeLayer(layer: SoundLayer): void {
    this.pausedLayers.delete(layer);
    const gain = this.layerGains.get(layer);
    if (gain) gain.gain.value = 1;
  }

  dispose(): void {
    this.activeSources.forEach(s => { try { s.stop(); } catch {} });
    if (this.ctx) this.ctx.close();
  }
}
