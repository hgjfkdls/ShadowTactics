import type { Animation, AnimationLayer } from './types';
import type { AnimationRenderer } from './render/AnimationRenderer';

export type LayerHandlers = {
  onStart?: (anim: Animation) => void;
  onComplete?: (anim: Animation) => void;
  onQueueEmpty?: () => void;
};

const LAYERS: AnimationLayer[] = ['fx', 'ui', 'sfx'];

export class AnimationEngine {
  private queues: Record<AnimationLayer, Animation[]> = { fx: [], ui: [], sfx: [] };
  private active: Record<AnimationLayer, boolean> = { fx: false, ui: false, sfx: false };
  private handlers: Record<AnimationLayer, LayerHandlers> = { fx: {}, ui: {}, sfx: {} };
  private frameIds: Record<AnimationLayer, number> = { fx: 0, ui: 0, sfx: 0 };
  private renderer: AnimationRenderer | null = null;
  private _isAnimating = false;

  onStart?: (anim: Animation) => void;
  onComplete?: (anim: Animation) => void;
  onQueueEmpty?: () => void;

  setRenderer(renderer: AnimationRenderer) {
    this.renderer = renderer;
  }

  setHandler(layer: AnimationLayer, handler: LayerHandlers) {
    this.handlers[layer] = handler;
  }

  get isAnimating(): boolean {
    return this._isAnimating;
  }

  enqueue(anim: Animation, layer?: AnimationLayer): void {
    const l = layer ?? 'fx';
    this.queues[l].push(anim);
    if (!this.active[l]) this.processNext(l);
  }

  enqueueMultiple(anims: Animation[], layer?: AnimationLayer): void {
    const l = layer ?? 'fx';
    this.queues[l].push(...anims);
    if (!this.active[l]) this.processNext(l);
  }

  skipAll(): void {
    for (const l of LAYERS) {
      this.queues[l] = [];
      cancelAnimationFrame(this.frameIds[l]);
      this.active[l] = false;
    }
    this.renderer?.clearAllPositions();
    this._isAnimating = false;
  }

  clear(): void {
    this.skipAll();
  }

  private processNext(layer: AnimationLayer): void {
    const anim = this.queues[layer].shift();
    if (!anim) {
      this.active[layer] = false;
      this._isAnimating = LAYERS.some(l => this.active[l]);
      this.handlers[layer].onQueueEmpty?.();
      this.onQueueEmpty?.();
      return;
    }

    this.active[layer] = true;
    this._isAnimating = true;
    this.handlers[layer].onStart?.(anim);
    this.onStart?.(anim);

    if (anim.type === 'move' && anim.path && anim.unitId && anim.path.length >= 2) {
      this.runMove(anim, layer);
    } else if (anim.type === 'damage' && anim.targetId) {
      this.renderer?.showDamageNumber(anim.targetId, anim.amount ?? 0);
      this.scheduleFinish(anim, layer, anim.duration);
    } else if (anim.type === 'heal' && anim.targetId) {
      this.renderer?.showHealNumber(anim.targetId, anim.amount ?? 0);
      this.scheduleFinish(anim, layer, anim.duration);
    } else if (anim.type === 'wait' || anim.type === 'speech' || anim.type === 'flipCard') {
      this.scheduleFinish(anim, layer, anim.duration);
    } else {
      // attack, counter, particle — no blocking
      this.finish(anim, layer);
    }
  }

  private scheduleFinish(anim: Animation, layer: AnimationLayer, delay: number): void {
    this.frameIds[layer] = window.setTimeout(() => this.finish(anim, layer), delay);
  }

  private runMove(anim: Animation, layer: AnimationLayer): void {
    const path = anim.path!;
    const totalSteps = path.length;
    let step = 0;
    const stepDuration = anim.duration / totalSteps;

    const tick = () => {
      if (step >= totalSteps) {
        this.renderer?.resetUnitPosition(anim.unitId!);
        this.finish(anim, layer);
        return;
      }
      this.renderer?.updateUnitPosition(anim.unitId!, path[step]);
      step++;
      this.frameIds[layer] = window.setTimeout(tick, stepDuration);
    };

    tick();
  }

  private finish(anim: Animation, layer: AnimationLayer): void {
    cancelAnimationFrame(this.frameIds[layer]);
    this.handlers[layer].onComplete?.(anim);
    this.onComplete?.(anim);
    this.processNext(layer);
  }
}
