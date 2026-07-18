import type { Animation, AnimationLayer } from './types';
import type { AnimationRenderer } from './render/AnimationRenderer';

export type LayerHandlers = {
  onStart?: (anim: Animation) => void;
  onComplete?: (anim: Animation) => void;
  onQueueEmpty?: () => void;
};

export class AnimationEngine {
  private queues: Map<string, Animation[]> = new Map();
  private active: Map<string, boolean> = new Map();
  private handlers: Map<string, LayerHandlers> = new Map();
  private frameIds: Map<string, number> = new Map();
  private currentAnim: Map<string, Animation> = new Map();
  private renderer: AnimationRenderer | null = null;
  private _isAnimating = false;
  private allLayers: string[] = [];

  onStart?: (anim: Animation) => void;
  onComplete?: (anim: Animation) => void;
  onQueueEmpty?: () => void;

  setRenderer(renderer: AnimationRenderer) {
    this.renderer = renderer;
  }

  setHandler(layer: string, handler: LayerHandlers) {
    this.handlers.set(layer, handler);
  }

  private getHandler(layer: string): LayerHandlers {
    return this.handlers.get(layer) ?? this.handlers.get(layer.startsWith('fx') ? 'fx' : 'ui') ?? {};
  }

  get isAnimating(): boolean {
    return this._isAnimating;
  }

  enqueue(anim: Animation, layer?: string, replace?: boolean): void {
    const l = layer ?? 'fx';
    if (replace && this.active.get(l)) {
      cancelAnimationFrame(this.frameIds.get(l) ?? 0);
      const oldAnim = this.currentAnim.get(l);
      if (oldAnim) {
        this.getHandler(l).onComplete?.(oldAnim);
        this.onComplete?.(oldAnim);
      }
      this.active.set(l, false);
      this.currentAnim.delete(l);
      this.queues.set(l, []);
    }
    if (!this.queues.has(l)) this.allLayers.push(l);
    const q = this.queues.get(l) ?? [];
    q.push(anim);
    this.queues.set(l, q);
    if (!this.active.get(l)) this.processNext(l);
  }

  enqueueMultiple(anims: Animation[], layer?: string, replace?: boolean): void {
    const l = layer ?? 'fx';
    if (replace && this.active.get(l)) {
      cancelAnimationFrame(this.frameIds.get(l) ?? 0);
      const oldAnim = this.currentAnim.get(l);
      if (oldAnim) {
        this.getHandler(l).onComplete?.(oldAnim);
        this.onComplete?.(oldAnim);
      }
      this.active.set(l, false);
      this.currentAnim.delete(l);
      this.queues.set(l, []);
    }
    if (!this.queues.has(l)) this.allLayers.push(l);
    const q = this.queues.get(l) ?? [];
    q.push(...anims);
    this.queues.set(l, q);
    if (!this.active.get(l)) this.processNext(l);
  }

  skipAll(): void {
    for (const l of this.allLayers) {
      this.queues.set(l, []);
      cancelAnimationFrame(this.frameIds.get(l) ?? 0);
      this.active.set(l, false);
      const oldAnim = this.currentAnim.get(l);
      if (oldAnim) {
        this.getHandler(l).onComplete?.(oldAnim);
        this.onComplete?.(oldAnim);
      }
      this.currentAnim.delete(l);
    }
    this.renderer?.clearAllPositions();
    this._isAnimating = false;
  }

  clear(): void {
    this.skipAll();
  }

  private processNext(layer: string): void {
    const q = this.queues.get(layer) ?? [];
    const anim = q.shift();
    this.queues.set(layer, q);
    if (!anim) {
      this.active.set(layer, false);
      this._isAnimating = [...this.active.values()].some(v => v);
      this.getHandler(layer).onQueueEmpty?.();
      this.onQueueEmpty?.();
      return;
    }

    this.active.set(layer, true);
    this.currentAnim.set(layer, anim);
    this._isAnimating = true;
    this.getHandler(layer).onStart?.(anim);
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
      this.finish(anim, layer);
    }
  }

  private scheduleFinish(anim: Animation, layer: string, delay: number): void {
    this.frameIds.set(layer, window.setTimeout(() => this.finish(anim, layer), delay));
  }

  private runMove(anim: Animation, layer: string): void {
    const path = anim.path!;
    const totalSegments = path.length - 1;
    let currentSegment = 0;
    let segmentStartTime = 0;
    const segmentDuration = anim.duration / totalSegments;

    this.renderer?.updateUnitPosition(anim.unitId!, path[0]);

    const tick = (now: number) => {
      if (currentSegment >= totalSegments) {
        this.renderer?.resetUnitPosition(anim.unitId!);
        this.finish(anim, layer);
        return;
      }

      if (segmentStartTime === 0) segmentStartTime = now;

      const elapsed = now - segmentStartTime;
      const t = Math.min(elapsed / segmentDuration, 1);

      const from = path[currentSegment];
      const to = path[currentSegment + 1];
      const q = from.q + (to.q - from.q) * t;
      const r = from.r + (to.r - from.r) * t;

      this.renderer?.updateUnitPosition(anim.unitId!, { q, r });

      if (t >= 1) {
        currentSegment++;
        segmentStartTime = 0;
      }

      this.frameIds.set(layer, requestAnimationFrame(tick));
    };

    this.frameIds.set(layer, requestAnimationFrame(tick));
  }

  private finish(anim: Animation, layer: string): void {
    cancelAnimationFrame(this.frameIds.get(layer) ?? 0);
    this.currentAnim.delete(layer);
    this.getHandler(layer).onComplete?.(anim);
    this.onComplete?.(anim);
    this.processNext(layer);
  }
}
