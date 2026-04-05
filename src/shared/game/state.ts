import { HexCoord, HexMap } from '../hex';

export type PlayerId = string;
export type UnitId = string;

export type Unit = {
    id: UnitId;
    owner: PlayerId;
    position: HexCoord;
    movement: number;
};

export type GameState = {
    turn: number;
    activePlayer: PlayerId;
    map: HexMap;
    units: Record<UnitId, Unit>;
};