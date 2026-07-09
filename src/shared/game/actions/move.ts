import type { GameState, PlayerId } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { pipeState, isHexOccupied, isWithinBounds, updateUnit } from '../utils';
import { getMovementCost } from '../movement';
import { getPlayerAP, consumeAP, updateUnitPos } from './helpers';
import { consumeModifier, addModifier, getModifierSum } from '../modifiers/engine';


export function handleMove(state: GameState, action: GameAction): GameState {
    if (action.type !== 'MOVE_UNIT') return state;

    const playerId = action.playerId;
    if (playerId !== state.activePlayer) return state;

    const unit = state.units[action.unitId];
    if (!unit || unit.owner !== playerId) return state;

    // Bloqueado por Confusión o Desenvainado veloz (por unidad específica)
    if (state.activeModifiers.some(m => (m.stat === 'bloqueo' || m.stat === 'inmovil') && m.targetId === unit.id && m.remainingTurns >= 0 && (m.remainingUses === undefined || m.remainingUses > 0))) return state;

    const to = action.to;
    const distance = hexDistance(unit.position, to);
    if (!isWithinBounds(to, state.map.radius)) return state;
    if (distance !== 1) return state;
    if (isHexOccupied(state, to, unit.id)) return state;

    const ap = getPlayerAP(state, playerId);
    let cost = getMovementCost(unit, to);
    // Modificadores de cartas (SET, ADD, MUL sobre movementCost)
    const movementMods = state.activeModifiers.filter(
        m => m.stat === 'movementCost' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0
    );
    let hasSet = false;
    for (const m of movementMods) {
        if (m.operator === 'SET') { cost = m.value; hasSet = true; }
        else if (m.operator === 'ADD') cost += m.value;
        else if (m.operator === 'MUL') cost *= m.value;
    }
    // actionCost se suma después de los modifiers de movementCost (a menos que SET haya overrideado todo)
    if (!hasSet) {
        cost += getModifierSum(state, playerId, unit.id, 'actionCost');
    }

    if (ap < cost) return state;

    // Voz de mando (Comandante Supremo): si no es el general y el bono está listo
    const identity = state.players[playerId]?.selectedIdentity ?? '';
    const isGeneral = unit.class === 'general';
    const vozDeMando = identity.startsWith('comandante_supremo') && state.players[playerId]?.vozDeMandoReady;
    const useVozBonus = !isGeneral && vozDeMando;
    if (useVozBonus) {
        cost = 0;
    }

    let s = pipeState(
        state,
        (s) => consumeAP(s, playerId, cost),
        (s) => updateUnitPos(s, unit.id, to),
        (s) => updateUnit(s, unit.id, (u) => ({ ...u, flags: [...new Set([...(u.flags ?? []), 'move', 'performed_action'])] })),
    );

    // Consumir modificadores de coste
    s = consumeModifier(s, playerId, 'movementCost', 1);
    s = consumeModifier(s, playerId, 'actionCost', 1);

    const baseCost = getMovementCost(unit, to);
    const moveModsStr: string[] = [];
    if (cost !== baseCost) {
        const movementMods = state.activeModifiers.filter(
            m => m.stat === 'movementCost' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0
        );
        for (const m of movementMods) {
            moveModsStr.push(`Coste: ${m.operator} ${m.value}${m.source && m.sourceName ? ` (${m.source}: ${m.sourceName})` : ''}`);
        }
    }
    const actionCostMods = state.activeModifiers.filter(
        m => m.stat === 'actionCost' && m.targetId === unit.id && m.sourcePlayerId === playerId && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0
    );
    for (const m of actionCostMods) {
        moveModsStr.push(`${m.sourceName ?? 'Acción'}: +${m.value} PA`);
    }
    if (useVozBonus) moveModsStr.push('Voz de mando: coste 0');

    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId,
            type: 'move' as const,
            unitId: unit.id,
            unitClass: unit.class,
            from: unit.position,
            to,
            cost,
            baseCost,
            modifiers: moveModsStr,
            configId: 'movimiento',
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };

    // Voz de mando (Comandante Supremo)
    if (identity.startsWith('comandante_supremo')) {
        if (isGeneral && !state.players[playerId]?.vozDeMandoReady) {
            // General se movió → activar bono
            s = {
                ...s,
                players: {
                    ...s.players,
                    [playerId]: { ...s.players[playerId], vozDeMandoReady: true },
                },
            };
        } else if (useVozBonus) {
            // Aliado usó el bono → consumir y dar +1 ataque y +1 defensa adicionales
            s = updateUnit(s, unit.id, (u) => ({ ...u, usedVozDeMando: true, vozDeMandoAttackBonus: 1, vozDeMandoDefenseBonus: 1 }));
            s = {
                ...s,
                players: {
                    ...s.players,
                    [playerId]: { ...s.players[playerId], vozDeMandoReady: false },
                },
                gameHistory: [...s.gameHistory, {
                    id: `h${s.nextHistoryId}`,
                    turn: s.turn,
                    actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                    playerId,
                    type: 'card' as const,
                    cardId: 'voz_de_mando',
                    cardName: 'ability.voz_de_mando.name',
                    cardType: 'BUFF' as const,
                    targetId: unit.id,
                    targetClass: unit.class,
                    details: '+1 ataque, +1 defensa',
                    paCost: 0,
                    sourceClass: 'general',
                    sourceIdentityKey: 'comandante_supremo',
                }],
                nextHistoryId: s.nextHistoryId + 1,
            };
        }
    }

    return s;
}
