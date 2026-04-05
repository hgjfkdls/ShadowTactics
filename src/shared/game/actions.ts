import { HexCoord } from '../hex';
import { UnitId } from './state';

export type GameAction =
    | {
        type: 'MOVE_UNIT';
        unitId: UnitId;
        to: HexCoord;
    }
    | {
        type: 'END_TURN';
    };