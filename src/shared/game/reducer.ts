import type { GameState, HexCoord, PlayerId } from './state';
import type { GameAction } from './action-types';
import { handleIdentity, handleRoll, handleDeployment, handleEndTurn } from './phases';
import { handleMove, handleAttack, handleCard, handleAbility, handlePassCounter, handleDiscard, handleIdentityAbility } from './actions/index';
import { simulatePreparation } from './phases/simulate';
import { updateUnit } from './utils';
import { applyFormationModifiers } from './formations';
import { addModifier } from './modifiers/engine';

function setGameOver(state: GameState, winner: PlayerId, reason: 'general_killed' | 'surrender' | 'disconnect'): GameState {
    return {
        ...state,
        gamePhase: 'GAME_OVER',
        winner,
        gameOverReason: reason,
    };
}

function checkGeneralKilled(state: GameState): GameState {
    if (state.gamePhase !== 'GAME') return state;
    const p1General = Object.values(state.units).find(u => u.owner === 'p1' && u.class === 'general');
    const p2General = Object.values(state.units).find(u => u.owner === 'p2' && u.class === 'general');
    if (!p1General && p2General) return setGameOver(state, 'p2', 'general_killed');
    if (p1General && !p2General) return setGameOver(state, 'p1', 'general_killed');
    if (!p1General && !p2General) return setGameOver(state, state.activePlayer === 'p1' ? 'p2' : 'p1', 'general_killed');
    return state;
}

function refreshFormations(state: GameState): GameState {
    let s = state;
    for (const pid of ['p1', 'p2']) {
        s = applyFormationModifiers(s, pid);
    }
    return s;
}

export function applyAction(state: GameState, action: GameAction): GameState {
    let result = applyActionInner(state, action);
    if (result === state) return result;

    const hadAttack = !!result.lastAttackResult;

    // Post-procesar resultado de ataque: agregar al historial si hay uno nuevo
    if (result.lastAttackResult) {
        const newR = result.lastAttackResult;
        const exists = (result.attackResults ?? []).some(r =>
            r.attackerId === newR.attackerId && r.targetId === newR.targetId &&
            r.die1 === newR.die1 && r.die2 === newR.die2
        );
        result = { ...result, lastAttackResult: undefined };
        if (!exists) {
            const turnNum = result.turn;
            const countThisTurn = (result.attackResults ?? []).filter(r => r.turn === turnNum).length;
            const targetKilled = !!result.graveyard[newR.targetId];
            const attackerKilled = !!result.graveyard[newR.attackerId];
            const elapsed = result.gameStartTime ? Math.floor((Date.now() - result.gameStartTime) / 1000) : 0;
            result = {
                ...result,
                attackResults: [...(result.attackResults ?? []), {
                    ...newR, turn: turnNum, attackInTurn: countThisTurn + 1,
                    targetKilled, attackerKilled, elapsed,
                }],
            };
        }
    }

    if (result.gamePhase === 'GAME' && hadAttack) {
        result = checkGeneralKilled(result);
    }

    // Si el juego terminó pero no hay razón (ej: killUnit en helpers), asignarla
    if (result.gamePhase === 'GAME_OVER' && !result.gameOverReason) {
        result = { ...result, gameOverReason: 'general_killed' };
    }

    if (result.gamePhase === 'GAME' && result.turnPhase === 'MAIN') {
        return refreshFormations(result);
    }
    return result;
}

function applyActionInner(state: GameState, action: GameAction): GameState {

    if (state.gamePhase === 'GAME_OVER') return state;

    if (action.type === 'SIMULATE_PREPARATION') {
        if (state.gamePhase !== 'PREPARATION') return state;
        return simulatePreparation(state);
    }

    if (state.gamePhase === 'PREPARATION') {
        switch (state.preparationPhase) {
            case 'IDENTITY_SELECTION': return handleIdentity(state, action);
            case 'ROLL':               return handleRoll(state, action);
            case 'DEPLOYMENT':         return handleDeployment(state, action);
            default:                   return state;
        }
    }

    // Durante DRAW, si la mano excede 3, solo DISCARD_CARD o SURRENDER está permitido
    if (state.turnPhase === 'DRAW' && (state.players[state.activePlayer]?.cardsInHand?.length ?? 0) > 3) {
        if (action.type !== 'DISCARD_CARD' && action.type !== 'SURRENDER') return state;
        if (action.type === 'DISCARD_CARD') return handleDiscard(state, action);
    }

    // Bloquear acciones mientras hay un objetivo de identidad pendiente
    if (state.players[state.activePlayer]?.pendingIdentityTarget && action.type !== 'IDENTITY_ABILITY') {
        return state;
    }
    if (state.players[state.activePlayer]?.pendingEspartanoChoice && action.type !== 'ESPARTANO_CHOICE') {
        return state;
    }
    if (state.players[state.activePlayer]?.pendingPlanBatalla && action.type !== 'COMANDANTE_CHOICE') {
        return state;
    }

    switch (action.type) {
        case 'MOVE_UNIT':    return handleMove(state, action);
        case 'ATTACK_UNIT':  return handleAttack(state, action);
        case 'END_TURN':     return handleEndTurn(state, action);
        case 'USE_CARD':     return handleCard(state, action);
        case 'USE_ABILITY':  return handleAbility(state, action);
        case 'PASS_COUNTER': return handlePassCounter(state, action);
        case 'DISCARD_CARD': return handleDiscard(state, action);
        case 'IDENTITY_ABILITY': return handleIdentityAbility(state, action);
        case 'COMANDANTE_CHOICE': {
            if (action.playerId !== state.activePlayer) return state;
            if (!state.players[action.playerId]?.pendingPlanBatalla) return state;
            let s = { ...state, players: { ...state.players, [action.playerId]: { ...state.players[action.playerId], pendingPlanBatalla: false } } };
            const allies = Object.values(s.units).filter(u => u.owner === action.playerId);
            for (const u of allies) {
                if (action.choice === 'attack') {
                    s = addModifier(s, action.playerId, u.id, 'attack', 1, 'ADD', 0, 1);
                } else {
                    s = addModifier(s, action.playerId, u.id, 'damage', -1, 'ADD', 0, 1);
                }
            }
            return s;
        }
        case 'ESPARTANO_CHOICE': {
            if (action.playerId !== state.activePlayer) return state;
            if (!state.players[action.playerId]?.pendingEspartanoChoice) return state;
            const general = Object.values(state.units).find(u => u.owner === action.playerId && u.class === 'general');
            if (!general) return state;
            let s = { ...state, players: { ...state.players, [action.playerId]: { ...state.players[action.playerId], pendingEspartanoChoice: false } } };
            s = updateUnit(s, general.id, (u) => ({ ...u, espartanoRangeBonus: false, espartanoDefenseBonus: false }));
            if (action.choice === 'range') {
                s = updateUnit(s, general.id, (u) => ({ ...u, espartanoRangeBonus: true }));
            } else {
                s = updateUnit(s, general.id, (u) => ({ ...u, espartanoDefenseBonus: true }));
            }
            return s;
        }
        case 'CONTINUE_ATTACK_RESULT': {
            if ((state.attackResults?.length ?? 0) === 0) return state;
            return { ...state, attackResults: [] };
        }
        case 'OCCUPY_POSITION': {
            if (action.playerId !== state.activePlayer) return state;
            if (!state.pendingOccupation) return state;
            if (!action.accept) return { ...state, pendingOccupation: undefined };
            const occ = state.pendingOccupation;
            const unit = state.units[occ.unitId];
            const s = updateUnit(state, occ.unitId, (u) => ({
                ...u, position: occ.position, movedThisTurn: false, didMovePreviousTurn: false,
            }));
            const pathStr = `(${unit.position.q},${unit.position.r}) → (${occ.position.q},${occ.position.r})`;
            return {
                ...s,
                pendingOccupation: undefined,
                gameHistory: [...s.gameHistory, {
                    id: `h${s.nextHistoryId}`,
                    turn: s.turn,
                    actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                    playerId: action.playerId,
                    type: 'move' as const,
                    unitId: occ.unitId,
                    unitClass: unit?.class ?? 'general',
                    from: unit.position,
                    to: occ.position,
                    path: pathStr,
                    cost: 0,
                    baseCost: 0,
                    modifiers: [unit?.abilities?.includes('avance') ? 'Avance' : 'Desenvainado veloz'],
                }],
                nextHistoryId: s.nextHistoryId + 1,
            };
        }
        case 'SURRENDER': {
            if (state.gamePhase !== 'GAME') return state;
            const winner = action.playerId === 'p1' ? 'p2' : 'p1';
            return setGameOver(state, winner, 'surrender');
        }
        default:             return state;
    }
}
