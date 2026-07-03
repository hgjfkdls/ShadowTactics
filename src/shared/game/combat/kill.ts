import type { GameState, Unit, UnitId } from '../state';
import { hexDistance } from '../../hex';
import { addModifier } from '../modifiers/engine';
import { updateUnit } from '../utils/helpers';
import { ABILITY_CONFIG } from '../data/ability-config';

function killUnit(state: GameState, unitId: string, killerId?: string): GameState {
    const unit = state.units[unitId];
    if (!unit) return state;
    const { [unitId]: _, ...remainingUnits } = state.units;
    let newState: GameState = {
        ...state,
        units: remainingUnits,
        graveyard: {
            ...state.graveyard,
            [unitId]: unit
        }
    };
    if (unit.class === 'general') {
        newState = {
            ...newState,
            gamePhase: 'GAME_OVER',
            winner: unit.owner === 'p1' ? 'p2' : 'p1'
        };
    }
    // Karma (Monje Shaolin): la unidad que eliminó a esta recibe 2 de daño
    if (!killerId) {
        const lastAttack = state.lastAttackResult;
        if (lastAttack && lastAttack.targetId === unitId) {
            killerId = lastAttack.attackerId;
        }
    }
    if (killerId) {
        const identity = state.players[unit.owner]?.selectedIdentity ?? '';
        if (identity.startsWith('monje_shaolin')) {
            newState = dealDamage(newState, killerId, 2);
            newState = {
                ...newState,
                karmaEntryToAppend: {
                    id: `h${newState.nextHistoryId}`,
                    turn: newState.turn,
                    actionNumber: 0, // will be set when appended
                    playerId: unit.owner,
                    type: 'attack' as const,
                    attackerId: unit.id,
                    targetId: killerId,
                    die1: 0, die2: 0, total: 0,
                    difficulty: 0, baseDifficulty: 0,
                    hit: true,
                    damage: 2,
                    baseAttack: 0,
                    counterDamage: 0,
                    attackerClass: unit.class,
                    targetClass: newState.units[killerId]?.class ?? 'general',
                    attackName: 'Karma',
                    modifiers: ['Monje Shaolin: daño reflejado al asesino'],
                    paCost: 0,
                },
            };
        }

        // Camino del guerrero (Samurái): +1 PA si kill a distancia 1, 1 vez por turno
        const killerUnit = state.units[killerId];
        const killerOwner = killerUnit?.owner;
        if (killerOwner && killerOwner !== unit.owner) {
            const dist = hexDistance(killerUnit.position, unit.position);

            const samIdentity = state.players[killerOwner]?.selectedIdentity ?? '';
            if (samIdentity.startsWith('samurai') && !state.players[killerOwner]?.caminoDelGuerreroUsedThisTurn && dist === 1) {
                const cfg = ABILITY_CONFIG['camino_del_guerrero'];
                newState = {
                    ...newState,
                    lastCaminoDelGuerrero: true,
                    players: {
                        ...newState.players,
                        [killerOwner]: {
                            ...newState.players[killerOwner],
                            actionPoints: (newState.players[killerOwner]?.actionPoints ?? 0) + 1,
                            caminoDelGuerreroUsedThisTurn: true,
                        },
                    },
                    gameHistory: [...newState.gameHistory, {
                        id: `h${newState.nextHistoryId}`,
                        turn: newState.turn,
                        actionNumber: newState.gameHistory.filter((h: any) => h.turn === newState.turn).length + 1,
                        playerId: killerOwner,
                        type: 'card' as const,
                        cardId: 'camino_del_guerrero',
                        cardName: cfg?.nameKey ?? 'Camino del guerrero',
                        cardType: 'BUFF' as const,
                        details: '+1 PA',
                        paCost: 0,
                        sourceClass: killerUnit.class,
                        sourceIdentityKey: 'samurai',
                        configId: 'camino_del_guerrero',
                    }],
                    nextHistoryId: newState.nextHistoryId + 1,
                };
            }

            // Terror (Furia del Tirano): enemigos adyacentes al asesino reciben +1 dificultad
            const tiranoIdentity = state.players[killerOwner]?.selectedIdentity ?? '';
            if (tiranoIdentity.startsWith('furia_tirano') && dist === 1) {
                const terrorTargets = new Set<string>();
                for (const u of Object.values(newState.units)) {
                    if (u.owner === killerOwner) continue;
                    if (hexDistance(killerUnit.position, u.position) === 1 || hexDistance(unit.position, u.position) === 1) {
                        terrorTargets.add(u.id);
                    }
                }
                for (const uid of terrorTargets) {
                    const u = newState.units[uid];
                    if (u) newState = addModifier(newState, u.owner, u.id, 'difficulty', 1, 'ADD', 0, 1, 'ability', 'Terror');
                }
            }
        }
    }
    return newState;
}

export function dealDamage(state: GameState, unitId: string, damage: number, killerId?: string): GameState {
    const unit = state.units[unitId];
    if (!unit) return state;

    // Consumir escudo del aura antes que HP
    const shield = unit.auraShield ?? 0;
    if (shield >= damage) {
        return updateUnit(state, unitId, (u) => ({ ...u, auraShield: shield - damage }));
    }
    const remaining = damage - shield;

    const newHp = unit.hp - remaining;
    let newState = updateUnit(state, unitId, (u) => ({ ...u, hp: newHp, auraShield: 0 }));
    if (newHp <= 0) {
        newState = killUnit(newState, unitId, killerId);
    }
    return newState;
}
