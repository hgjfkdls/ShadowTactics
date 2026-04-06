/**
 * File        : C:\Users\Alvaro\Documents\proyectos\ShadowTactics\src\shared\game\state.ts
 * Autor       : Alvaro Cabedo
 * Fecha       : 2026-04-05
 * Descripcion : 
 */

import { HexCoord, HexMap } from '../hex';

export type PlayerId = string;
export type UnitId = string;
export type CardId = string;

export type Unit = {
    id: UnitId;
    owner: PlayerId;
    position: HexCoord;
    attack: number;
    hp: number;
    difficulty: number;
    range: number;
    movementCost: number;
    class: 'archer' | 'infantry' | 'lancer' | 'cavalry' | 'general';
};

export type GameState = {
    turn: number;
    activePlayer: PlayerId;
    turnPhase: 'DRAW' | 'MAIN' | 'COUNTER' | 'ACTION';
    
    map: HexMap;
    units: Record<UnitId, Unit>;
    graveyard: Record<UnitId, Unit>;

    rngSeed: number;
    players: Record<PlayerId, PlayerResources>;
};

export type PlayerResources = {
    actionPoints: number;
    carryOver: number;
};