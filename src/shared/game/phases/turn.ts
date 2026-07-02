import type { GameState, Unit } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { drawCard } from '../actions/card';
import { updateUnit } from '../utils';
import { processModifiersAtTurnStart, addModifier } from '../modifiers/engine';
import { applyFormationModifiers } from '../formations';
import { BASE_STATS } from '../units';
import { getAuraBuffs, AURA_CONFIG } from '../aura';

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
    const generalActedThisTurn = general?.performedActionThisTurn ?? false;

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
                    espartanoRangeBonus: false,
                    auraShield: 0,
                    ataqueExtraCharges: 0,
                    precisionCharges: 0,
                };
        }
    }

    // Limpiar modificadores de cartas del jugador que termina su turno
    const cleanExpired = state.activeModifiers.filter(m => {
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
                liderarAtaqueBonus: undefined,
                lastMeditacion: undefined,
            },
            [nextPlayer]: {
                ...state.players[nextPlayer],
                generalWasAttackedLastTurn: generalWasAttacked,
            }
        }
    };

    // Monje Shaolin: si no usó meditación activa, recibe +1 defensa en el turno del rival
    const identity = state.players[currentPlayer]?.selectedIdentity ?? '';
    if (identity.startsWith('monje_shaolin') && !state.lastMeditacion && general) {
        const afterMod = addModifier(newState, currentPlayer, general.id, 'defense', 1, 'ADD', 1, undefined, 'identity', 'Meditación');
        return applyTurnStart(afterMod, nextPlayer);
    }

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
        usedPatadaAcrobatica: false,
        usedFuegoCobertura: false,
        usedAccionEvasiva: false,
        hasCargaBonus: false,

        usedTorbellino: false,
        performedActionThisTurn: false,
        usedPosicionEstrategica: false,
        usedVozDeMando: false,
        usedEnNombreDelRey: false,
        usedDesenvainadoVeloz: false,
        usedRayoCelestial: false,
        usedAngelGuardian: false,
        aLaCargaActive: false,
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
                carryOver: 0,
                identityHealedThisTurn: false,
                pendingIdentityTarget: false,
                pendingEspartanoChoice: false,
                pendingPlanBatalla: false,
                vozDeMandoReady: false,
                caminoDelGuerreroUsedThisTurn: false,
            }
        }
    };

    // Robar carta
    newState = drawCard(newState, playerId);

    // Procesar modificadores activos (decrementar turnos, aplicar AP, limpiar expirados)
    newState = processModifiersAtTurnStart(newState, playerId);

    // Robin Hood: «En la mira» — elegir objetivo enemigo al inicio del turno
    const identity = newState.players[playerId]?.selectedIdentity ?? '';
    if (identity.startsWith('robin_hood')) {
        const hasValidTarget = Object.values(newState.units)
            .some(u => u.owner !== playerId && u.class !== 'general');
        newState = {
            ...newState,
            players: {
                ...newState.players,
                [playerId]: { ...newState.players[playerId], pendingIdentityTarget: hasValidTarget },
            },
        };
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

    // Turno propio: +1 ataque a adyacentes al general (Inspiración Real)
    if (identity.startsWith('inspiracion_real')) {
        const general = Object.values(newState.units).find(u => u.owner === playerId && u.class === 'general');
        if (general) {
            for (const u of Object.values(newState.units)) {
                if (u.owner !== playerId || u.class === 'general') continue;
                if (hexDistance(general.position, u.position) === 1) {
                    newState = addModifier(newState, playerId, u.id, 'attack', 1, 'ADD', 0, 1, 'identity', 'Guardia real');
                    const last = newState.activeModifiers[newState.activeModifiers.length - 1];
                    if (last) {
                        newState = { ...newState, activeModifiers: newState.activeModifiers.map((m, i) =>
                            i === newState.activeModifiers.length - 1 ? { ...m, id: `guardia_ataque_${u.id}` } : m
                        ) };
                    }
                }
            }
        }
    }

    // Turno oponente: -1 daño a adyacentes al general del rival con inspiracion_real
    const otherPlayerId = playerId === 'p1' ? 'p2' : 'p1';
    const otherIdentity = newState.players[otherPlayerId]?.selectedIdentity ?? '';
    if (otherIdentity.startsWith('inspiracion_real')) {
        const otherGeneral = Object.values(newState.units).find(u => u.owner === otherPlayerId && u.class === 'general');
        if (otherGeneral) {
            for (const u of Object.values(newState.units)) {
                if (u.owner !== otherPlayerId || u.class === 'general') continue;
                if (hexDistance(otherGeneral.position, u.position) === 1) {
                    newState = addModifier(newState, otherPlayerId, u.id, 'defense', 1, 'ADD', 0, 1, 'identity', 'Guardia real');
                    const last = newState.activeModifiers[newState.activeModifiers.length - 1];
                    if (last) {
                        newState = { ...newState, activeModifiers: newState.activeModifiers.map((m, i) =>
                            i === newState.activeModifiers.length - 1 ? { ...m, id: `guardia_defensa_${u.id}` } : m
                        ) };
                    }
                }
            }
        }
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

        // Proteger: si no se usó, el efecto va al General
        if (!newState.players[playerId]?.protegerUsedThisTurn) {
            const general = Object.values(newState.units).find(u => u.owner === playerId && u.class === 'general');
            if (general) {
                newState = addModifier(newState, playerId, general.id, 'defense', 1, 'ADD', 0, undefined, 'identity', 'Escudo del Comandante');
            }
        }
        newState = {
            ...newState,
            players: {
                ...newState.players,
                [playerId]: { ...newState.players[playerId], protegerUsedThisTurn: false },
            },
        };
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

    return newState;
}
