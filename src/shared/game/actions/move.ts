import type { GameState, PlayerId } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { pipeState, isHexOccupied, isWithinBounds, updateUnit } from '../utils';
import { getMovementCost } from '../movement';
import { getPlayerAP, consumeAP, updateUnitPos } from './helpers';
import { consumeModifier, addModifier } from '../modifiers/engine';


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
    const hasSurcharge = (unit.fuegoCoberturaCharges ?? 0) > 0;
    if (hasSurcharge) {
        cost += 1;
    }
    // Modificadores de cartas (SET, ADD, MUL sobre movementCost)
    const movementMods = state.activeModifiers.filter(
        m => m.stat === 'movementCost' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0
    );
    for (const m of movementMods) {
        if (m.operator === 'SET') cost = m.value;
        else if (m.operator === 'ADD') cost += m.value;
        else if (m.operator === 'MUL') cost *= m.value;
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
        (s) => updateUnit(s, unit.id, (u) => ({ ...u, movedThisTurn: true, performedActionThisTurn: true })),
        (s) => hasSurcharge ? updateUnit(s, unit.id, (u) => ({ ...u, fuegoCoberturaCharges: (u.fuegoCoberturaCharges ?? 0) - 1 })) : s,
    );

    // Consumir modificador de movementCost
    s = consumeModifier(s, playerId, 'movementCost', 1);

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
    if (hasSurcharge) moveModsStr.push('Penalización fuego cobertura: +1 PA');
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
                    cardName: 'Voz de mando',
                    cardType: 'BUFF' as const,
                    targetId: unit.id,
                    targetClass: unit.class,
                    details: '+1 ataque, +1 defensa',
                    paCost: 0,
                    sourceClass: 'general',
                    sourceIdentity: 'Comandante Supremo',
                }],
                nextHistoryId: s.nextHistoryId + 1,
            };
        }
    }

    return s;
}
