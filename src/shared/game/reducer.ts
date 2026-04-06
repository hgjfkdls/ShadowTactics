/**
 * File        : C:\Users\Alvaro\Documents\proyectos\ShadowTactics\src\shared\game\reducer.ts
 * Autor       : Alvaro Cabedo
 * Fecha       : 2026-04-05
 * Descripcion : 
 */

import { GameState } from './state';
import { GameAction } from './actions';
import { hexDistance } from '../hex';
import { rollDice } from './utils';
import { PlayerId } from './state';
import { Unit } from './state';
import { HexCoord } from '../hex';

export function applyAction(
    state: GameState,
    action: GameAction
): GameState {
    switch (action.type) {
        case 'MOVE_UNIT': {
            const playerId = action.playerId;

            //Fase y turno
            if (state.turnPhase !== 'ACTION') return state;
            if (playerId !== state.activePlayer) return state;

            //Unidad válida
            const unit = state.units[action.unitId];

            if (!unit) return state;
            if (unit.owner !== playerId) return state;

            //Reglas de tablero
            const from = unit.position;
            const to = action.to;
            const distance = hexDistance(from, to);

            if (!isWithinBounds(to)) return state;
            if (distance !== 1) return state;
            if (isHexOccupied(state, to, unit.id)) return state;

            //Reglas de recurso
            const ap = getPlayerAP(state, playerId);
            const cost = getMovementCost(state, unit, to);
            if (ap < cost) return state;

            return pipeState(
                state,
                (s) => consumeAP(s, playerId, cost),
                (s) =>
                    updateUnit(s, unit.id, (u) => ({
                        ...u,
                        position: to
                    }))
            );
        }

        case 'ATTACK_UNIT': {
            const playerId = action.playerId;

            //Fase y turno
            if (state.turnPhase !== 'ACTION') return state;
            if (playerId !== state.activePlayer) return state;

            //Unidades válidas
            const unit = state.units[action.unitId];
            const target = state.units[action.targetId];
            if (!unit || !target) return state;

            //Ownership
            if (unit.owner !== playerId) return state;
            if (target.owner === playerId) return state;

            const from = unit.position;
            const to = target.position;

            //Reglas de tablero
            const distance = hexDistance(from, to);
            if (distance > unit.range) return state;

            //Reglas de recurso
            const ap = getPlayerAP(state, playerId);
            const cost = getAttackCost(unit);
            if (ap < cost) return state;

            //RNG
            const { roll, seed: newSeed } = rollDice(state.rngSeed, 12);

            const canCounter = distance <= target.range;
            
            // FALLO
            if (roll < unit.difficulty) {
                return pipeState(
                    state,
                    (s) => applyRNG(s, newSeed),
                    (s) => consumeAP(s, playerId, cost),
                    (s) => {
                        if (!canCounter) return s;

                        const damage = getCounterDamage(target);
                        return dealDamage(s, unit.id, damage);
                    }
                );
            }
            // ÉXITO
            return pipeState(
                state,
                (s) => applyRNG(s, newSeed),
                (s) => consumeAP(s, playerId, cost),
                (s) => dealDamage(s, target.id, unit.attack)
            );
        }

        case 'END_TURN': {
            const currentPlayer = state.activePlayer;
            const currentAP = getPlayerAP(state, currentPlayer);

            const nextPlayer = getNextPlayer(state);

            const carryOver = Math.floor(currentAP / 2);

            let newState = {
                ...state,
                turn: state.turn + 1,
                activePlayer: nextPlayer,
                players: {
                    ...state.players,
                    [currentPlayer]: {
                        ...state.players[currentPlayer],
                        carryOver
                    }
                }
            };

            return applyTurnStart(newState, nextPlayer);
        }
    }
}

//STATE
function pipeState(state: GameState, ...fns: Array<(s: GameState) => GameState>): GameState {
    return fns.reduce((acc, fn) => fn(acc), state);
}

//TURNO
function getNextPlayer(state: GameState) {
    // por ahora simple (luego se extiende)
    return state.activePlayer === 'p1' ? 'p2' : 'p1';
}

function applyTurnStart(state: GameState, playerId: PlayerId): GameState {
    const baseAP = 5;
    const player = state.players[playerId];

    const totalAP = Math.min(baseAP + player.carryOver, 10);

    return {
        ...state,
        players: {
            ...state.players,
            [playerId]: {
                actionPoints: totalAP,
                carryOver: 0
            }
        }
    };
}

//ACTION POINTS
function getPlayerAP(state: GameState, playerId: PlayerId) {
    return state.players[playerId]?.actionPoints ?? 0;
}

function consumeAP(state: GameState, playerId: PlayerId, amount: number = 1): GameState {
    const player = state.players[playerId];

    return {
        ...state,
        players: {
            ...state.players,
            [playerId]: {
                ...player,
                actionPoints: player.actionPoints - amount
            }
        }
    };
}

//MOVIMIENTO
function getMovementCost(state: GameState, unit: Unit, to: HexCoord): number {
    return unit.movementCost;
}

function isHexOccupied(state: GameState, position: HexCoord, excludeUnitId?: string): boolean {
    return Object.values(state.units).some(
        (u) =>
            u.id !== excludeUnitId &&
            u.position.q === position.q &&
            u.position.r === position.r
    );
}

function isWithinBounds(pos: HexCoord): boolean {
    const max = 5; // o lo que definas como tamaño del mapa
    return (
        Math.abs(pos.q) <= max &&
        Math.abs(pos.r) <= max &&
        Math.abs(-pos.q - pos.r) <= max
    );
}

function updateUnit(state: GameState, unitId: string, updater: (unit: any) => any): GameState {
    const unit = state.units[unitId];
    if (!unit) return state;

    return {
        ...state,
        units: {
            ...state.units,
            [unitId]: updater(unit)
        }
    };
}

//COMBATE
function killUnit(state: GameState, unitId: string): GameState {
    const unit = state.units[unitId];
    if (!unit) return state;

    const { [unitId]: _, ...remainingUnits } = state.units;

    return {
        ...state,
        units: remainingUnits,
        graveyard: {
            ...state.graveyard,
            [unitId]: unit
        }
    };
}

function dealDamage(state: GameState, unitId: string, damage: number): GameState {
    const unit = state.units[unitId];
    if (!unit) return state;

    const newHp = unit.hp - damage;

    let newState = updateUnit(state, unitId, (u) => ({
        ...u,
        hp: newHp
    }));

    if (newHp <= 0) {
        newState = killUnit(newState, unitId);
    }

    return newState;
}

function getCounterDamage(unit: Unit): number {
    switch (unit.class) {
        case 'archer':
            return 2;
        default:
            return 3;
    }
}

function getAttackCost(unit: Unit): number {
    return 1; // simple por ahora
}

function applyRNG(state: GameState, newSeed: number): GameState {
    return {
        ...state,
        rngSeed: newSeed
    };
}





