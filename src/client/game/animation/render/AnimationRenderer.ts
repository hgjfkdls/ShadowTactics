import type { HexCoord } from '@shared';

export interface AnimationRenderer {
  updateUnitPosition(unitId: string, position: HexCoord): void;
  showDamageNumber(targetId: string, amount: number): void;
  showHealNumber(targetId: string, amount: number): void;
  playEffect(effect: string, position: HexCoord): void;
  resetUnitPosition(unitId: string): void;
  clearAllPositions(): void;
  updateUnitAngle(unitId: string, angleDeg: number): void;
  resetUnitAngle(unitId: string): void;
  setUnitRotation(unitId: string, fromAngle: number, toAngle: number, duration: number): void;
  clearUnitRotation(unitId: string): void;
}
