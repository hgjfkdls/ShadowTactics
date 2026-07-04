import type { SoundOptions, SoundLayer } from '../types';
import type { SoundRenderer } from './SoundRenderer';

export class WebAudioRenderer implements SoundRenderer {
  private ctx: AudioContext;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private masterGain: GainNode;
  private layerGains: Map<SoundLayer, GainNode> = new Map();
  private activeSources: AudioBufferSourceNode[] = [];
  private paused: boolean = false;
  private pausedLayers: Set<SoundLayer> = new Set();

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    for (const layer of ['music', 'sfx', 'voice'] as SoundLayer[]) {
      const gain = this.ctx.createGain();
      gain.gain.value = 1;
      gain.connect(this.masterGain);
      this.layerGains.set(layer, gain);
    }
  }

  async load(url: string): Promise<void> {
    if (this.bufferCache.has(url)) return;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.bufferCache.set(url, audioBuffer);
  }

  async play(url: string, layer: SoundLayer, options: SoundOptions = {}): Promise<() => void> {
    if (!this.bufferCache.has(url)) await this.load(url);
    const buffer = this.bufferCache.get(url)!;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    if (options.loop) source.loop = true;

    const layerGain = this.layerGains.get(layer);
    if (!layerGain) return () => {};

    const volGain = this.ctx.createGain();
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

  setMasterVolume(volume: number): void { this.masterGain.gain.value = volume; }

  setLayerVolume(layer: SoundLayer, volume: number): void {
    const gain = this.layerGains.get(layer);
    if (gain) gain.gain.value = volume;
  }

  pauseAll(): void {
    this.paused = true;
    this.ctx.suspend();
  }

  resumeAll(): void {
    this.paused = false;
    this.ctx.resume();
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
    this.ctx.close();
  }
}
