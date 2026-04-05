import { HexCoord, HexMap } from '../hex';

export type PlayerId = string;
export type UnitId = string;

export type Unit = {
    id: UnitId;
    owner: PlayerId;
    position: HexCoord;
    attack: number;
    hp: number;
    difficulty: number;
    range: number;
    movement: number;
    class: 'archer' | 'infantry' | 'lancer' | 'cavalry' | 'general';
};

export type GameState = {
    turn: number;
    activePlayer: PlayerId;
    map: HexMap;
    units: Record<UnitId, Unit>;
};