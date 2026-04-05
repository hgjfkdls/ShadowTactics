import { HexCoord } from '../hex';
import { UnitId } from './state';

export type GameAction =
    | {
        type: 'MOVE_UNIT';
        unitId: UnitId;
        to: HexCoord;
    }
    | {
        type: 'ATTACK_UNIT';
        unitId: UnitId;
        targetId: UnitId;
    }
    | {
        type: 'END_TURN';
    };