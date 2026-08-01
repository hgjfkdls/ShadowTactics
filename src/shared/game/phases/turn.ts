import type { GameState, Unit } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { drawCard } from '../actions/card';
import { updateUnit } from '../utils';
import { processModifiersAtTurnStart, addModifier } from '../modifiers/engine';
import { applyFormationModifiers, applyMuroEspartanoModifiers } from '../formations';
import { BASE_STATS } from '../units';
import { getAuraBuffs, AURA_CONFIG } from '../aura';
import { processTurnStartPassives, processEndTurnPassives, syncConditionalModifiers } from '../passive';
import { ABILITY_CONFIG } from '../data/ability-config';

export function handleEndTurn(state: GameState, action: GameAction): GameState {
    if (action.type !== 'END_TURN') return state;
    if (action.playerId !== state.activePlayer) return state;
    if (state.turnPhase !== 'MAIN') return state;

    const currentPlayer = state.activePlayer;
    const currentAP = state.players[currentPlayer]?.actionPoints ?? 0;
    const nextPlayer = state.activePlayer === 'p1' ? 'p2' : 'p1';
    const carryOver = Math.floor(currentAP / 2);

    // Capturar performedActionThisTurn del General antes del reset (Monje Shaolin)
    const general = Object.values(state.units).find(u => u.owner === currentPlayer && u.class === 'general');
    const generalActedThisTurn = (general?.flags ?? []).includes('performed_action');

    // Rotar flags de movimiento: flags.includes('move') → didMovePreviousTurn
    // Las flags se limpian al inicio del turno del jugador (resetUnitTracking),
    // no al final, para que blockFlags/requireFlagsAbsent funcionen entre turnos.
    let units = { ...state.units };

    for (const id of Object.keys(units)) {
        const u = units[id];
        if (u.owner === currentPlayer) {
            units[id] = {
                ...u,
                didMovePreviousTurn: (u.flags ?? []).includes('move'),
                flags: u.flags ?? [],
                espartanoRangeBonus: false,
                ataqueExtraCharges: 0,
                precisionCharges: 0,
                lastHex: undefined,
            };
        }
    }

    // Limpiar modificadores de cartas del jugador que termina su turno
    let cleanExpired = state.activeModifiers.filter(m => {
        if (m.sourcePlayerId !== currentPlayer) return true;
        if (m.stat === 'ap') return true;
        if (m.stat === 'movementCost') return false;
        if (m.stat === 'damage' && !m.targetId) return false;
        if (m.stat === 'attackCost' && !m.targetId) return false;
        if (m.stat === 'actionCost') return false;
        if (m.stat === 'bloqueo') return false;
        if (m.stat === 'dotOnHit') return false;

        return true;
    });

    // Inspiración de tropa: detectar si el general del siguiente jugador fue atacado
    const nextGeneral = Object.values(state.units).find(u => u.owner === nextPlayer && u.class === 'general');
    const generalWasAttacked = (nextGeneral?.timesDamagedThisTurn ?? 0) > 0;

    // Procesar pasivas de fin de turno (proteger_auto, etc.)
    const afterEndTurn = processEndTurnPassives(state, currentPlayer);
    const endTurnMods = afterEndTurn.activeModifiers.filter(m =>
        !state.activeModifiers.some(om => om.id === m.id)
    );
    cleanExpired = [...cleanExpired, ...endTurnMods];

    const newState: GameState = {
        ...state,
        units,
        activeModifiers: cleanExpired,
        turn: state.turn + 1,
        activePlayer: nextPlayer,
        turnPhase: 'DRAW',
        players: {
            ...state.players,
            [currentPlayer]: {
                ...state.players[currentPlayer],
                carryOver,
            },
            [nextPlayer]: {
                ...state.players[nextPlayer],
                generalWasAttackedLastTurn: generalWasAttacked,
            }
        }
    };

    return applyTurnStart(newState, nextPlayer);
}

function resetUnitTracking(unit: Unit): Unit {
    return {
        ...unit,
        timesDamagedThisTurn: 0,
        flags: [],
        usedAccionEvasiva: false,
        hasCargaBonus: false,
        lastHex: undefined,
        auraShield: 0,
    };
}

export function applyTurnStart(state: GameState, playerId: string): GameState {
    const baseAP = state.campaignMaxAP ?? 5;
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
                carryOver: 0,
                pendingIdentityTarget: false,
                pendingEspartanoChoice: false,
                pendingPlanBatalla: false,
                pendingCardNeedsTarget: false,
                vozDeMandoReady: false,
                caminoDelGuerreroUsedThisTurn: false,
            }
        }
    };

    // Robar carta
    newState = drawCard(newState, playerId);

    // Procesar modificadores activos (decrementar turnos, aplicar AP, limpiar expirados)
    newState = processModifiersAtTurnStart(newState, playerId);

    // Identidad con prompt de selección al inicio del turno (en_la_mira, etc.)
    const identity = newState.players[playerId]?.selectedIdentity ?? '';
    const general = Object.values(newState.units).find(u => u.owner === playerId && u.class === 'general');
    if (general?.abilities) {
        for (const abilId of general.abilities) {
            const cfg = ABILITY_CONFIG[abilId];
            if (cfg?.activation?.prompt && cfg.targetType === 'enemy') {
                const hasValidTarget = Object.values(newState.units)
                    .some(u => u.owner !== playerId && (!cfg.target?.hpCondition || u.hp <= cfg.target.hpCondition.value));
                if (hasValidTarget) {
                    newState = {
                        ...newState,
                        players: {
                            ...newState.players,
                            [playerId]: { ...newState.players[playerId], pendingIdentityTarget: true },
                        },
                    };
                }
                break;
            }
        }
    }

    // Punta de Lanza: activar Proyección en todos los lanceros
    if (identity.startsWith('punta_lanza')) {
        let uu = { ...newState.units };
        for (const id of Object.keys(uu)) {
            if (uu[id].owner === playerId && uu[id].class === 'lancer') {
                uu[id] = { ...uu[id], proyeccionActive: true };
            }
        }
        newState = { ...newState, units: uu };
    }

    // Espartano: Lanza y escudo — elegir al inicio del turno
    if (identity.startsWith('espartano')) {
        newState = {
            ...newState,
            players: {
                ...newState.players,
                [playerId]: { ...newState.players[playerId], pendingEspartanoChoice: true },
            },
        };
    }

    // Corazón de Estratega: evaluar formaciones tácticas
    if (identity.startsWith('corazon_estratega')) {
        newState = applyFormationModifiers(newState, playerId);
    }
    // Espartano: evaluar muro espartano (lanceros adyacentes)
    newState = applyMuroEspartanoModifiers(newState, playerId);

    // Guardia real (Inspiración Real): limpiar bonos del ciclo anterior
    newState = {
        ...newState,
        activeModifiers: newState.activeModifiers.filter(m => !m.id.startsWith('guardia_')),
    };

    // Limpiar efectos de escudo de En nombre del rey
    if (identity.startsWith('inspiracion_real')) {
        let uu = { ...newState.units };
        for (const id of Object.keys(uu)) {
            const u = uu[id];
            if (u.owner === playerId) {
                let updated = { ...u };
                if (u.royalShieldSavedHp !== undefined) {
                    if (u.hp > u.royalShieldSavedHp) {
                        updated.hp = u.royalShieldSavedHp;
                    }
                    updated.royalShieldSavedHp = undefined;
                }
                uu[id] = updated;
            }
        }
        newState = { ...newState, units: uu };
	}

	// Comandante Supremo: limpiar modificadores de Plan de Batalla del turno anterior
    if (identity.startsWith('comandante_supremo')) {
        // Limpiar bonuses de plan anterior y Voz de mando de todas las unidades
        let uu = { ...newState.units };
        for (const id of Object.keys(uu)) {
            if (uu[id].owner === playerId) {
                uu[id] = { ...uu[id], vozDeMandoAttackBonus: undefined, vozDeMandoDefenseBonus: undefined };
            }
        }
        newState = {
            ...newState,
            units: uu,
            players: {
                ...newState.players,
                [playerId]: {
                    ...newState.players[playerId],
                    planBatallaBonus: undefined,
                    planBatallaDefense: undefined,
                    pendingPlanBatalla: true,
                },
            },
        };
    }

    // Escudo del Comandante: limpiar escudos del turno anterior
    if (identity.startsWith('escudo_comandante')) {
        let uu = { ...newState.units };
        for (const id of Object.keys(uu)) {
            const u = uu[id];
            if (u.owner === playerId && u.royalShieldSavedHp !== undefined) {
                if (u.hp > u.royalShieldSavedHp) {
                    uu[id] = { ...u, hp: u.royalShieldSavedHp };
                }
                uu[id] = { ...uu[id], royalShieldSavedHp: undefined };
            }
        }
        newState = { ...newState, units: uu };
        // Proteger_auto se maneja via processEndTurnPassives (cfg.activation.endTurn)
    }

    // Aura de mando: regenerar escudo al inicio del turno
    if (AURA_CONFIG.isActive) {
        const general = Object.values(newState.units).find(u => u.owner === playerId && u.class === 'general');
        if (general) {
            const buffs = getAuraBuffs(newState, playerId);
            newState = {
                ...newState,
                units: {
                    ...newState.units,
                    [general.id]: { ...general, auraShield: buffs.shieldPoints },
                },
            };
        }
    }

    // Si la mano supera 3 cartas, el jugador debe descartar antes de salir de DRAW
    const handSize = newState.players[playerId]?.cardsInHand?.length ?? 0;
    if (handSize > 3) {
        return { ...newState, turnPhase: 'DRAW' };
    }

    // Pasar a MAIN phase
    newState = { ...newState, turnPhase: 'MAIN' };

    // Procesar pasivas con activation.turnStart (resistencia, linea_defensiva, guardia_real, etc.)
    newState = processTurnStartPassives(newState, playerId);
    // Sincronizar modificadores condicionales (furia_berserker, etc.)
    newState = syncConditionalModifiers(newState);

    return newState;
}
