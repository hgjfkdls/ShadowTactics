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
        path?: HexCoord[];      // para Cabalgar_2 (recorrido de 2-3 hex)
    }

    | {
        type: 'PASS_COUNTER';
        playerId: PlayerId;
    }

    | {
        type: 'DISCARD_CARD';
        playerId: PlayerId;
        cardId: CardId;
    }

    // TESTING — automatically completes preparation + deployment, jumps to GAME
    | {
        type: 'SIMULATE_PREPARATION';
        playerId: PlayerId;
    }

    // AVANCE (pasiva) — ocupar o rechazar posición del enemigo eliminado
    | {
        type: 'OCCUPY_POSITION';
        playerId: PlayerId;
        accept: boolean;
    }

    // HABILIDAD DE IDENTIDAD — ej: Robin Hood «En la mira»
    | {
        type: 'IDENTITY_ABILITY';
        playerId: PlayerId;
        targetId: UnitId;
    }

    // ESPARTANO — Lanza y escudo
    | {
        type: 'ESPARTANO_CHOICE';
        playerId: PlayerId;
        choice: 'range' | 'defense';
    }

    // COMANDANTE SUPREMO — Plan de batalla
    | {
        type: 'COMANDANTE_CHOICE';
        playerId: PlayerId;
        choice: 'attack' | 'defense';
    }

    // RESULTADO DE ATAQUE — Continuar (ambos jugadores)
    | {
        type: 'CONTINUE_ATTACK_RESULT';
        playerId: PlayerId;
    }

    // RENDIRSE
    | {
        type: 'SURRENDER';
        playerId: PlayerId;
    };