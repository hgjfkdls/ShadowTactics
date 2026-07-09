import type { GameState, Unit } from '../../state';
import type { CardConfig } from './types';
import type { ConfigEffect } from '../ability-config/types';
import { addModifier } from '../../modifiers/engine';
import { updateUnit, isWithinBounds } from '../../utils';
import { processEffects } from '../../effects/processEffects';

function resolveTarget(
    target: string | undefined,
    playerId: string,
    otherPlayerId: string,
    targetId?: string,
): { tgtPlayer: string | null; tgtUnit: string | null } {
    switch (target) {
        case 'self': return { tgtPlayer: playerId, tgtUnit: null };
        case 'opponent': return { tgtPlayer: otherPlayerId, tgtUnit: null };
        case 'ally': return targetId ? { tgtPlayer: playerId, tgtUnit: targetId } : { tgtPlayer: null, tgtUnit: null };
        case 'enemy': return targetId ? { tgtPlayer: otherPlayerId, tgtUnit: targetId } : { tgtPlayer: null, tgtUnit: null };
        default: return { tgtPlayer: null, tgtUnit: null };
    }
}

function applyConfigEffect(
    state: GameState,
    effect: ConfigEffect,
    playerId: string,
    otherPlayerId: string,
    configId: string,
    targetId?: string,
): GameState {
    const e = effect as any;
    const { tgtPlayer, tgtUnit } = resolveTarget(e.target, playerId, otherPlayerId, targetId);
    if (!tgtPlayer && e.target !== 'self' && e.target !== 'ally' && e.target !== 'opponent') return state;

    switch (e.type) {
        case 'modifierPush': {
            if (e.stat === 'bloqueo' && tgtUnit && state.activeModifiers.some(m => m.stat === 'bloqueo' && m.targetId === tgtUnit && m.remainingTurns > 0)) return state;
            return addModifier(state, tgtPlayer, tgtUnit, e.stat ?? '', e.value ?? 1, e.operator ?? 'ADD', e.remainingTurns ?? 0, e.remainingUses, 'card', configId);
        }
        case 'stateChange': {
            const val = e.value ?? 1;
            const cur = state.players[tgtPlayer!]?.actionPoints ?? 0;
            return { ...state, players: { ...state.players, [tgtPlayer!]: { ...state.players[tgtPlayer!], actionPoints: Math.max(0, cur + val) } } };
        }
        case 'flagPop': {
            if (!tgtUnit) return state;
            const u = state.units[tgtUnit];
            if (!u) return state;
            return updateUnit(state, tgtUnit, (u2: Unit) => ({ ...u2, flags: (u2.flags ?? []).filter(f => !(e.flags ?? []).includes(f)) }));
        }
        case 'flagPush': {
            if (!tgtUnit) return state;
            return updateUnit(state, tgtUnit, (u2: Unit) => ({ ...u2, flags: [...new Set([...(u2.flags ?? []), ...(e.flags ?? [])])] }));
        }
        default: return state;
    }
}

export function applyCardEffects(
    state: GameState,
    config: CardConfig,
    playerId: string,
    targetId?: string,
): GameState {
    let s = state;
    const other = playerId === 'p1' ? 'p2' : 'p1';

    for (const effect of config.effects) {
        const typed = effect as ConfigEffect;
        if (typed.type === 'modifierPush' || typed.type === 'stateChange' || typed.type === 'flagPop' || typed.type === 'flagPush') {
            s = applyConfigEffect(s, typed, playerId, other, config.id, targetId);
        } else {
            // Legacy CardEffect types (addModifier, setUnitFlag, directAP, etc.)
            const cardEffect = effect as any;
            switch (cardEffect.type) {
                case 'addModifier': {
                    const scope = cardEffect.targetScope ?? 'self';
                    let tp: string | null, tu: string | null;
                    if (scope === 'self') { tp = playerId; tu = null; }
                    else if (scope === 'other') { tp = other; tu = null; }
                    else if (scope === 'unit_ally') { if (!targetId) break; tp = playerId; tu = targetId; }
                    else if (scope === 'unit_enemy') { if (!targetId) break; tp = other; tu = targetId; }
                    else break;
                    if (cardEffect.stat === 'bloqueo' && tu && s.activeModifiers.some(m => m.stat === 'bloqueo' && m.targetId === tu && m.remainingTurns > 0)) break;
                    s = addModifier(s, tp, tu, cardEffect.stat!, cardEffect.value!, cardEffect.operator ?? 'ADD', cardEffect.remainingTurns ?? 0, cardEffect.remainingUses, 'card', config.id);
                    break;
                }
                case 'setUnitFlag': {
                    if (!targetId) break;
                    const flag = cardEffect.flag!;
                    const v = cardEffect.flagValue ?? 1;
                    s = updateUnit(s, targetId, (u: any) => ({ ...u, [flag]: (u[flag] ?? 0) + v }));
                    break;
                }
                case 'directAP': {
                    const cur = s.players[playerId]?.actionPoints ?? 0;
                    s = { ...s, players: { ...s.players, [playerId]: { ...s.players[playerId], actionPoints: cur + (cardEffect.value ?? 1) } } };
                    break;
                }
                case 'removeDebuffs': {
                    s = { ...s, activeModifiers: s.activeModifiers.filter(m => m.sourcePlayerId !== playerId) };
                    break;
                }
                case 'stealCard': break;
                case 'reflect': break;
            }
        }
    }
    return s;
}
