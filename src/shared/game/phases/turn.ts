import type { GameState, Unit } from '../state';
import type { GameAction } from '../action-types';
import { drawCard } from '../actions/card';
import { updateUnit } from '../utils';
import { processModifiersAtTurnStart } from '../modifiers/engine';

export function handleEndTurn(state: GameState, action: GameAction): GameState {
    if (action.type !== 'END_TURN') return state;
    if (action.playerId !== state.activePlayer) return state;
    if (state.turnPhase !== 'MAIN') return state;

    const currentPlayer = state.activePlayer;
    const currentAP = state.players[currentPlayer]?.actionPoints ?? 0;
    const nextPlayer = state.activePlayer === 'p1' ? 'p2' : 'p1';
    const carryOver = Math.floor(currentAP / 2);

    // Rotar flags de movimiento: movedThisTurn → didMovePreviousTurn
    // Limpiar cargas de Fuego de cobertura al final del turno
    let units = { ...state.units };
    for (const id of Object.keys(units)) {
        const u = units[id];
        if (u.owner === currentPlayer) {
            units[id] = {
                ...u,
                didMovePreviousTurn: u.movedThisTurn ?? false,
                movedThisTurn: false,
                fuegoCoberturaCharges: undefined,
            };
        }
    }

    const newState: GameState = {
        ...state,
        units,
        turn: state.turn + 1,
        activePlayer: nextPlayer,
        turnPhase: 'DRAW',
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

function resetUnitTracking(unit: Unit): Unit {
    return {
        ...unit,
        timesDamagedThisTurn: 0,
        attackedThisTurn: false,
        movedThisTurn: false,
        usedCarga: false,
        usedCabalgar: false,
        usedVentajaAlcance: false,
        usedDobleAtaque: false,
        usedDisparoRapido: false,
        usedFuegoCobertura: false,
        usedAccionEvasiva: false,
        hasCargaBonus: false,
    };
}

export function applyTurnStart(state: GameState, playerId: string): GameState {
    const baseAP = 5;
    const player = state.players[playerId];
    const totalAP = Math.min(baseAP + player.carryOver, 8);

    // Resetear tracking de habilidades para las unidades del jugador activo
    let units = { ...state.units };
    for (const id of Object.keys(units)) {
        const u = units[id];
        if (u.owner === playerId) {
            units[id] = resetUnitTracking(u);
        }
    }

    let newState: GameState = {
        ...state,
        units,
        turnPhase: 'DRAW',
        players: {
            ...state.players,
            [playerId]: {
                ...player,
                actionPoints: totalAP,
                carryOver: 0
            }
        }
    };

    // Robar carta
    newState = drawCard(newState, playerId);

    // Procesar modificadores activos (decrementar turnos, aplicar AP, limpiar expirados)
    newState = processModifiersAtTurnStart(newState, playerId);

    // Si la mano supera 3 cartas, el jugador debe descartar antes de salir de DRAW
    const handSize = newState.players[playerId]?.cardsInHand?.length ?? 0;
    if (handSize > 3) {
        return { ...newState, turnPhase: 'DRAW' };
    }

    // Pasar a MAIN phase — el jugador puede jugar cartas/habilidades
    newState = { ...newState, turnPhase: 'MAIN' };

    return newState;
}
