import type { Animation } from './types';
import type { AnimationRenderer } from './render/AnimationRenderer';

export class AnimationEngine {
  private queue: Animation[] = [];
  private _isAnimating = false;
  private frameId = 0;
  private renderer: AnimationRenderer | null = null;

  onStart?: (anim: Animation) => void;
  onComplete?: (anim: Animation) => void;
  onQueueEmpty?: () => void;

  setRenderer(renderer: AnimationRenderer) {
    this.renderer = renderer;
  }

  get isAnimating(): boolean {
    return this._isAnimating;
  }

  enqueue(anim: Animation): void {
    this.queue.push(anim);
    if (!this._isAnimating) this.processNext();
  }

  enqueueMultiple(anims: Animation[]): void {
    this.queue.push(...anims);
    if (!this._isAnimating) this.processNext();
  }

  skipAll(): void {
    this.queue = [];
    cancelAnimationFrame(this.frameId);
    this.renderer?.clearAllPositions();
    this._isAnimating = false;
  }

  clear(): void {
    this.skipAll();
  }

  private processNext(): void {
    const anim = this.queue.shift();
    if (!anim) {
      this._isAnimating = false;
      this.onQueueEmpty?.();
      return;
    }

    this._isAnimating = true;
    this.onStart?.(anim);

    if (anim.type === 'move' && anim.path && anim.unitId && anim.path.length >= 2) {
      this.runMove(anim);
    } else if (anim.type === 'damage' && anim.targetId) {
      this.renderer?.showDamageNumber(anim.targetId, anim.amount ?? 0);
      setTimeout(() => this.finish(anim), anim.duration);
    } else if (anim.type === 'heal' && anim.targetId) {
      this.renderer?.showHealNumber(anim.targetId, anim.amount ?? 0);
      setTimeout(() => this.finish(anim), anim.duration);
    } else if (anim.type === 'wait') {
      setTimeout(() => this.finish(anim), anim.duration);
    } else {
      // attack, counter, particle — no blocking for now
      this.finish(anim);
    }
  }

  private runMove(anim: Animation): void {
    const path = anim.path!;
    const totalSteps = path.length;
    let step = 0;
    const stepDuration = anim.duration / totalSteps;

    const tick = () => {
      if (step >= totalSteps) {
        this.renderer?.resetUnitPosition(anim.unitId!);
        this.finish(anim);
        return;
      }
      this.renderer?.updateUnitPosition(anim.unitId!, path[step]);
      step++;
      this.frameId = window.setTimeout(tick, stepDuration);
    };

    tick();
  }

  private finish(anim: Animation): void {
    cancelAnimationFrame(this.frameId);
    this.onComplete?.(anim);
    this.processNext();
  }
}
