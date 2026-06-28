import type { HexCoord } from '@shared';
import type { AnimationRenderer } from './AnimationRenderer';

export class SvgRenderer implements AnimationRenderer {
  private positions: Record<string, HexCoord> = {};
  private listeners: Array<(pos: Record<string, HexCoord>) => void> = [];

  constructor(private damageOverlay: (targetId: string, amount: number, isHeal?: boolean) => void) {}

  onPositionsChange(cb: (pos: Record<string, HexCoord>) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    const pos = { ...this.positions };
    this.listeners.forEach(cb => cb(pos));
  }

  updateUnitPosition(unitId: string, position: HexCoord): void {
    this.positions[unitId] = position;
    this.notify();
  }

  resetUnitPosition(unitId: string): void {
    delete this.positions[unitId];
    this.notify();
  }

  clearAllPositions(): void {
    this.positions = {};
    this.notify();
  }

  showDamageNumber(targetId: string, amount: number): void {
    this.damageOverlay(targetId, amount, false);
  }

  showHealNumber(targetId: string, amount: number): void {
    this.damageOverlay(targetId, amount, true);
  }

  playEffect(_effect: string, _position: HexCoord): void {
    // Future: particle system
  }

  getPositions(): Record<string, HexCoord> {
    return { ...this.positions };
  }
}
