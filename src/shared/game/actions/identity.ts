import type { GameState } from '../state';
import type { GameAction } from '../action-types';
import { dealDamage } from '../utils';
import { ABILITY_CONFIG } from '../data/ability-config';
import { processEffects } from '../effects';
import type { EffectContext } from '../effects';

export function handleIdentityAbility(state: GameState, action: GameAction): GameState {
    if (action.type !== 'IDENTITY_ABILITY') return state;
    if (action.playerId !== state.activePlayer) return state;

    const player = state.players[action.playerId];
    if (!player?.pendingIdentityTarget) return state;

    const target = state.units[action.targetId];
    if (!target || target.owner === action.playerId) return state;
    if (target.class === 'general') return state;

    const identityKey = player.selectedIdentity ?? '';
    const general = Object.values(state.units).find(u => u.owner === action.playerId && u.class === 'general');
    const abilityId = Object.values(ABILITY_CONFIG).find(cfg =>
        cfg.activation?.prompt && general?.abilities?.includes(cfg.id)
    )?.id;
    const cfg = abilityId ? ABILITY_CONFIG[abilityId] : ABILITY_CONFIG['en_la_mira'];
    if (!cfg) return state;

    // Process config-driven effects
    let s: GameState = state;
    if (cfg.effects) {
        const effCtx: EffectContext = {
            state: s, unit: general ?? target, timing: 'onUse',
            target: target,
            attacker: general ?? undefined,
            defender: target,
            configId: cfg.id,
        };
        s = processEffects(s, cfg.effects, effCtx);
    }

    // History entry
    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: action.playerId,
            type: 'attack' as const,
            attackerId: general?.id ?? '',
            targetId: action.targetId,
            die1: 0,
            die2: 0,
            total: 0,
            difficulty: 0,
            baseDifficulty: 0,
            hit: true,
            damage: 1,
            baseAttack: general?.attack ?? 0,
            counterDamage: 0,
            attackerClass: 'general',
            targetClass: target.class,
            attackName: `ability.${cfg.id}.name`,
            modifiers: [],
            paCost: 0,
            configId: cfg.id,
            sourceClass: 'general',
            sourceIdentityKey: identityKey,
        }],
        nextHistoryId: s.nextHistoryId + 1,
        players: {
            ...s.players,
            [action.playerId]: {
                ...s.players[action.playerId],
                pendingIdentityTarget: false,
            },
        },
    };

    return s;
}
