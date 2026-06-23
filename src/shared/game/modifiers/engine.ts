import type { GameState, PlayerId, UnitId } from '../state';
import type { ModifierInstance } from './types';
import { updateUnit, dealDamage } from '../utils';

function nextId(state: GameState): { id: number; state: GameState } {
    const id = state.nextModifierId;
    return { id, state: { ...state, nextModifierId: id + 1 } };
}

export function addModifier(
    state: GameState,
    targetPlayerId: PlayerId | null,  // null = global
    targetUnitId: UnitId | null,
    stat: string,
    value: number,
    operator: 'ADD' | 'MUL' | 'SET',
    remainingTurns: number,
    remainingUses?: number
): GameState {
    const { id, state: s } = nextId(state);
    const mod: ModifierInstance = {
        id: `mod_${id}`,
        sourcePlayerId: targetPlayerId ?? '',
        stat,
        value,
        operator,
        remainingTurns,
        remainingUses,
    };
    return { ...s, activeModifiers: [...s.activeModifiers, mod] };
}

export function getModifierSum(
    state: GameState,
    targetPlayerId: PlayerId | null,
    targetUnitId: UnitId | null,
    stat: string
): number {
    return state.activeModifiers
        .filter(m => m.stat === stat && !isExpired(m))
        .reduce((sum, m) => {
            if (m.operator === 'ADD') return sum + m.value;
            if (m.operator === 'MUL') return sum * (m.value);
            if (m.operator === 'SET') return m.value;
            return sum;
        }, 0);
}

function isExpired(m: ModifierInstance): boolean {
    return m.remainingTurns < 0 || (m.remainingUses !== undefined && m.remainingUses <= 0);
}

export function consumeModifier(
    state: GameState,
    targetPlayerId: PlayerId | null,
    stat: string,
    amount: number = 1
): GameState {
    const idx = state.activeModifiers.findIndex(
        m => m.stat === stat && !isExpired(m) && (m.remainingUses === undefined || m.remainingUses > 0)
    );
    if (idx === -1) return state;

    const mod = state.activeModifiers[idx];
    const newUses = mod.remainingUses !== undefined ? mod.remainingUses - amount : undefined;

    if (newUses !== undefined && newUses <= 0) {
        const mods = [...state.activeModifiers];
        mods.splice(idx, 1);
        return { ...state, activeModifiers: mods };
    }

    const mods = [...state.activeModifiers];
    mods[idx] = { ...mod, remainingUses: newUses };
    return { ...state, activeModifiers: mods };
}

export function removeModifier(state: GameState, id: string): GameState {
    return { ...state, activeModifiers: state.activeModifiers.filter(m => m.id !== id) };
}

export function removePlayerDebuffs(state: GameState, playerId: PlayerId): GameState {
    return {
        ...state,
        activeModifiers: state.activeModifiers.filter(m => m.sourcePlayerId !== playerId)
    };
}

export function modifierExists(state: GameState, stat: string): boolean {
    return state.activeModifiers.some(m => m.stat === stat && !isExpired(m));
}

// Para Espejo: recordar quién puso el último debuff
export function getLastDebuffSource(state: GameState): PlayerId | null {
    const debuffs = state.activeModifiers.filter(m =>
        ['movementCost', 'damage', 'attackCost', 'blocked', 'ap'].includes(m.stat)
    );
    if (debuffs.length === 0) return null;
    return debuffs[debuffs.length - 1].sourcePlayerId;
}

export function processModifiersAtTurnStart(state: GameState, playerId: PlayerId): GameState {
    let mods = state.activeModifiers
        .map(m => {
            // Decrementar remainingTurns para modificadores que aplican al jugador
            if (m.remainingTurns > 0) {
                return { ...m, remainingTurns: m.remainingTurns - 1 };
            }
            return m;
        })
        .filter(m => m.remainingTurns >= 0);

    // Limpiar expirados
    mods = mods.filter(m => !(m.remainingUses !== undefined && m.remainingUses <= 0));

    let newState: GameState = { ...state, activeModifiers: mods };

    // Aplicar modificadores de AP al jugador
    const apMod = getModifierSum(newState, playerId, null, 'ap');
    if (apMod !== 0) {
        const player = newState.players[playerId];
        if (player) {
            newState = {
                ...newState,
                players: {
                    ...newState.players,
                    [playerId]: {
                        ...player,
                        actionPoints: Math.max(0, player.actionPoints + apMod)
                    }
                }
            };
        }
    }

    // Aplicar daño pasivo (flechas_fuego) en turnos del jugador que aplicó el DoT
    let dotMods = newState.activeModifiers;
    const passiveIndices = dotMods
        .map((m, i) => ({ m, i }))
        .filter(({ m }) =>
            m.stat === 'passiveDamage' && m.sourcePlayerId === playerId &&
            m.remainingUses !== undefined && m.remainingUses > 0 && m.targetUnitId
        );
    for (const { m, i } of passiveIndices) {
        newState = dealDamage(newState, m.targetUnitId!, m.value);
        const newUses = m.remainingUses! - 1;
        if (newUses <= 0) {
            dotMods = [...dotMods];
            dotMods.splice(i, 1);
        } else {
            dotMods = [...dotMods];
            dotMods[i] = { ...m, remainingUses: newUses };
        }
        newState = { ...newState, activeModifiers: dotMods };
    }

    return newState;
}
