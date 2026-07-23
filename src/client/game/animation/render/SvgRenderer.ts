import type { HexCoord } from '@shared';
import type { AnimationRenderer } from './AnimationRenderer';
import { angleDiff } from '@shared/hex/directions';

export class SvgRenderer implements AnimationRenderer {
  private positions: Record<string, HexCoord> = {};
  private angles: Record<string, number> = {};
  private animFrameIds: Record<string, number> = {};
  private posListeners: Array<(pos: Record<string, HexCoord>) => void> = [];
  private angleListeners: Array<(angle: Record<string, number>) => void> = [];

  constructor(private damageOverlay: (targetId: string, amount: number, isHeal?: boolean) => void) {}

  onPositionsChange(cb: (pos: Record<string, HexCoord>) => void): () => void {
    this.posListeners.push(cb);
    return () => { this.posListeners = this.posListeners.filter(l => l !== cb); };
  }

  onAnglesChange(cb: (angle: Record<string, number>) => void): () => void {
    this.angleListeners.push(cb);
    return () => { this.angleListeners = this.angleListeners.filter(l => l !== cb); };
  }

  private notifyPos() {
    const pos = { ...this.positions };
    this.posListeners.forEach(cb => cb(pos));
  }

  private notifyAngle() {
    const angle = { ...this.angles };
    this.angleListeners.forEach(cb => cb(angle));
  }

  updateUnitPosition(unitId: string, position: HexCoord): void {
    this.positions[unitId] = position;
    this.notifyPos();
  }

  resetUnitPosition(unitId: string): void {
    delete this.positions[unitId];
    this.notifyPos();
  }

  clearAllPositions(): void {
    for (const id of Object.keys(this.animFrameIds)) {
      cancelAnimationFrame(this.animFrameIds[id]);
    }
    this.animFrameIds = {};
    this.positions = {};
    this.angles = {};
    this.notifyPos();
    this.notifyAngle();
  }

  showDamageNumber(targetId: string, amount: number): void {
    this.damageOverlay(targetId, amount, false);
  }

  showHealNumber(targetId: string, amount: number): void {
    this.damageOverlay(targetId, amount, true);
  }

  playEffect(_effect: string, _position: HexCoord): void {
  }

  getPositions(): Record<string, HexCoord> {
    return { ...this.positions };
  }

  updateUnitAngle(unitId: string, angleDeg: number): void {
    this.angles[unitId] = angleDeg;
    this.notifyAngle();
  }

  resetUnitAngle(unitId: string): void {
    delete this.angles[unitId];
    this.notifyAngle();
  }

  setUnitRotation(unitId: string, fromAngle: number, toAngle: number, duration: number): void {
    if (this.animFrameIds[unitId]) {
      cancelAnimationFrame(this.animFrameIds[unitId]);
    }

    this.angles[unitId] = fromAngle;
    this.notifyAngle();

    const start = performance.now();
    const diff = angleDiff(fromAngle, toAngle);

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      this.angles[unitId] = fromAngle + diff * t;
      this.notifyAngle();

      if (t < 1) {
        this.animFrameIds[unitId] = requestAnimationFrame(tick);
      } else {
        delete this.animFrameIds[unitId];
      }
    };

    this.animFrameIds[unitId] = requestAnimationFrame(tick);
  }

  clearUnitRotation(unitId: string): void {
    if (this.animFrameIds[unitId]) {
      cancelAnimationFrame(this.animFrameIds[unitId]);
      delete this.animFrameIds[unitId];
    }
  }
}
