/**
 * File        : C:\Users\Alvaro\Documents\proyectos\ShadowTactics\src\shared\game\actions.ts
 * Autor       : Alvaro Cabedo
 * Fecha       : 2026-04-05
 * Descripcion : 
 */

import { HexCoord } from '../hex';
import { UnitId, PlayerId, CardId } from './state';

export type GameAction =

    // PREPARATION
    | {
        type: 'SELECT_IDENTITY';
        playerId: PlayerId;
        cardId: CardId;
    }

    | {
        type: 'ROLL_DICE';
        playerId: PlayerId;
    }

    | {
        type: 'DEPLOY_UNIT';
        playerId: PlayerId;
        unitId: UnitId;
        position: HexCoord;
        class: 'archer' | 'infantry' | 'lancer' | 'cavalry' | 'general';
    }

    // GAMEPLAY
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
    }

    | {
        type: 'USE_CARD';
        playerId: PlayerId;
        cardId: CardId;
        targetId?: UnitId;
    }

    | {
        type: 'USE_ABILITY';
        playerId: PlayerId;
        unitId: UnitId;
        abilityId: string;
        targetId?: UnitId;
        to?: HexCoord;          // para Cabalgar (posición destino)
    }

    | {
        type: 'PASS_COUNTER';
        playerId: PlayerId;
    }

    | {
        type: 'DISCARD_CARD';
        playerId: PlayerId;
        cardId: CardId;
    };