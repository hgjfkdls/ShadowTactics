import type { HexCoord } from '@shared';
import type { AnimationRenderer } from './AnimationRenderer';

export interface ThreeRendererEvent {
  type: 'damage' | 'heal' | 'effect';
  targetId?: string;
  amount?: number;
  effect?: string;
  position?: HexCoord;
}

export class ThreeRenderer implements AnimationRenderer {
  private positions: Record<string, HexCoord> = {};
  private listeners: Array<(pos: Record<string, HexCoord>) => void> = [];
  private eventListeners: Array<(evt: ThreeRendererEvent) => void> = [];

  onPositionsChange(cb: (pos: Record<string, HexCoord>) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  onEvent(cb: (evt: ThreeRendererEvent) => void): () => void {
    this.eventListeners.push(cb);
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== cb);
    };
  }

  private notifyPositions() {
    const pos = { ...this.positions };
    this.listeners.forEach(cb => cb(pos));
  }

  private notifyEvent(evt: ThreeRendererEvent) {
    this.eventListeners.forEach(cb => cb(evt));
  }

  updateUnitPosition(unitId: string, position: HexCoord): void {
    this.positions[unitId] = position;
    this.notifyPositions();
  }

  resetUnitPosition(unitId: string): void {
    delete this.positions[unitId];
    this.notifyPositions();
  }

  clearAllPositions(): void {
    this.positions = {};
    this.notifyPositions();
  }

  showDamageNumber(targetId: string, amount: number): void {
    this.notifyEvent({ type: 'damage', targetId, amount });
  }

  showHealNumber(targetId: string, amount: number): void {
    this.notifyEvent({ type: 'heal', targetId, amount });
  }

  playEffect(effect: string, position: HexCoord): void {
    this.notifyEvent({ type: 'effect', effect, position });
  }

  getPositions(): Record<string, HexCoord> {
    return { ...this.positions };
  }
}
