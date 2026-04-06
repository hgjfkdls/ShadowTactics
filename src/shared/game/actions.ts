/**
 * File        : C:\Users\Alvaro\Documents\proyectos\ShadowTactics\src\shared\game\actions.ts
 * Autor       : Alvaro Cabedo
 * Fecha       : 2026-04-05
 * Descripcion : 
 */

import { HexCoord } from '../hex';
import { UnitId, PlayerId } from './state';

export type GameAction =
    | {
        type: 'MOVE_UNIT';
        playerId: PlayerId;
        unitId: UnitId;
        to: HexCoord;
    }
    | {
        type: 'ATTACK_UNIT';
        playerId: PlayerId;
        unitId: UnitId;
        targetId: UnitId;
    }
    | {
        type: 'END_TURN';
        playerId: PlayerId;
    };