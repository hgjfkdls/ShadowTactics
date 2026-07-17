/**
 * File        : C:\Users\Alvaro\Documents\proyectos\ShadowTactics\src\shared\game\init.ts
 * Autor       : Alvaro Cabedo
 * Fecha       : 2026-04-05
 * Descripcion : 
 */

import { GameState } from './state';
import { buildEffectDeck, buildIdentityDeck } from './actions/card';

export function createInitialGameState(seed?: number): GameState {
    const s = seed ?? Date.now();
    const { deck: effectDeck, seed: deckSeed } = buildEffectDeck(s);
    const { deck: identityDeck, seed: identitySeed } = buildIdentityDeck(deckSeed);

    // Repartir 3 cartas de identidad a cada jugador del mazo barajado
    const p1Identity = identityDeck.slice(0, 3);
    const p2Identity = identityDeck.slice(3, 6);
    const remainingDeck = identityDeck.slice(6);  // 9 cartas restantes

    const p1Cards: string[] = [];
    const p2Cards: string[] = [];
    const remainingEffectDeck = effectDeck;

    return {
        // FLUJO
        turn: 1,
        activePlayer: 'p1',

        gamePhase: 'PREPARATION',
        preparationPhase: 'IDENTITY_SELECTION',
        turnPhase: 'DRAW',

        // MAPA
        map: { radius: 5 },
        centerHex: { q: 0, r: 0 },

        // UNIDADES
        units: {},
        graveyard: {},

        // RNG
        rngSeed: identitySeed,

        // JUGADORES
        players: {
            p1: {
                actionPoints: 0,
                carryOver: 0,
                lastAcknowledgedIndex: -1,
                flags: [],

                cardsInHand: p1Cards,

                // IDENTIDAD — 3 cartas del mazo barajado
                identityCards: p1Identity,
                selectedIdentity: undefined,
                revealedIdentity: undefined,

                // DESPLIEGUE — 13 unidades (3 por clase + 1 general)
                unitsToDeploy: [
                    { unitId: 'u1',  unitClass: 'cavalry' },
                    { unitId: 'u2',  unitClass: 'cavalry' },
                    { unitId: 'u3',  unitClass: 'cavalry' },
                    { unitId: 'u4',  unitClass: 'lancer' },
                    { unitId: 'u5',  unitClass: 'lancer' },
                    { unitId: 'u6',  unitClass: 'lancer' },
                    { unitId: 'u7',  unitClass: 'infantry' },
                    { unitId: 'u8',  unitClass: 'infantry' },
                    { unitId: 'u9',  unitClass: 'infantry' },
                    { unitId: 'u10', unitClass: 'archer' },
                    { unitId: 'u11', unitClass: 'archer' },
                    { unitId: 'u12', unitClass: 'archer' },
                    { unitId: 'u13', unitClass: 'general' },
                ],
                deployedUnits: [],
            },
            p2: {
                actionPoints: 0,
                carryOver: 0,
                lastAcknowledgedIndex: -1,
                flags: [],

                cardsInHand: p2Cards,

                // IDENTIDAD — 3 cartas del mazo barajado
                identityCards: p2Identity,
                selectedIdentity: undefined,
                revealedIdentity: undefined,

                // DESPLIEGUE — 13 unidades (3 por clase + 1 general)
                unitsToDeploy: [
                    { unitId: 'u14', unitClass: 'cavalry' },
                    { unitId: 'u15', unitClass: 'cavalry' },
                    { unitId: 'u16', unitClass: 'cavalry' },
                    { unitId: 'u17', unitClass: 'lancer' },
                    { unitId: 'u18', unitClass: 'lancer' },
                    { unitId: 'u19', unitClass: 'lancer' },
                    { unitId: 'u20', unitClass: 'infantry' },
                    { unitId: 'u21', unitClass: 'infantry' },
                    { unitId: 'u22', unitClass: 'infantry' },
                    { unitId: 'u23', unitClass: 'archer' },
                    { unitId: 'u24', unitClass: 'archer' },
                    { unitId: 'u25', unitClass: 'archer' },
                    { unitId: 'u26', unitClass: 'general' },
                ],
                deployedUnits: [],
            }
        },

        // PREPARATION DATA
        diceRolls: {
            p1: undefined,
            p2: undefined
        },

        deploymentOrder: undefined,
        currentDeployingPlayer: undefined,
        deploymentStep: 0,
        deploymentCount: 0,

        effectDeck: remainingEffectDeck,
        effectDiscard: [],
        identityDeck: remainingDeck,

        activeModifiers: [],
        nextModifierId: 1,
        lastCardAction: undefined,
        gameHistory: [],
        nextHistoryId: 1,
        attackResults: [],

    };
}