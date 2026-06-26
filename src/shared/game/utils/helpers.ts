import type { GameState, Unit, UnitId, PlayerId, HexCoord } from '../state';
import { hexDistance } from '../../hex';
import { addModifier } from '../modifiers/engine';

export function isHexOccupied(state: GameState, position: HexCoord, excludeUnitId?: string): boolean {
    return Object.values(state.units).some(
        (u) =>
            u.id !== excludeUnitId &&
            u.position.q === position.q &&
            u.position.r === position.r
    );
}

export function isWithinBounds(pos: HexCoord, radius?: number): boolean {
    const max = radius ?? 5;
    const s = -pos.q - pos.r;
    return (
        Math.abs(pos.q) <= max &&
        Math.abs(pos.r) <= max &&
        Math.abs(s) <= max
    );
}

export function updateUnit(state: GameState, unitId: string, updater: (unit: Unit) => Unit): GameState {
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

export function killUnit(state: GameState, unitId: string, killerId?: string): GameState {
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
        }

        // Camino del guerrero (Samurái): +1 PA si kill a distancia 1, 1 vez por turno
        const killerUnit = state.units[killerId];
        const killerOwner = killerUnit?.owner;
        if (killerOwner && killerOwner !== unit.owner) {
            const dist = hexDistance(killerUnit.position, unit.position);

            // Camino del guerrero (Samurái): +1 PA si kill a distancia 1, 1 vez por turno
            const samIdentity = state.players[killerOwner]?.selectedIdentity ?? '';
            if (samIdentity.startsWith('samurai') && !state.players[killerOwner]?.caminoDelGuerreroUsedThisTurn && dist === 1) {
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
                    if (u) newState = addModifier(newState, u.owner, u.id, 'difficulty', 1, 'ADD', 0, 1);
                }
            }
        }
    }
    return newState;
}

export function dealDamage(state: GameState, unitId: string, damage: number): GameState {
    const unit = state.units[unitId];
    if (!unit) return state;
    const newHp = unit.hp - damage;
    let newState = updateUnit(state, unitId, (u) => ({ ...u, hp: newHp }));
    if (newHp <= 0) {
        newState = killUnit(newState, unitId);
    }
    return newState;
}

export function countPlayerClasses(state: GameState, playerId: PlayerId): Record<Unit['class'], number> {
    const counts: Record<Unit['class'], number> = {
        archer: 0, infantry: 0, lancer: 0, cavalry: 0, general: 0
    };
    Object.values(state.units)
        .filter(unit => unit.owner === playerId)
        .forEach(unit => { counts[unit.class]++; });
    return counts;
}

export function isNearAnyAlliedUnit(
    state: GameState, playerId: PlayerId, position: HexCoord, distance: number = 2
): boolean {
    return Object.values(state.units)
        .filter(unit => unit.owner === playerId)
        .some(unit => hexDistance(unit.position, position) <= distance);
}
