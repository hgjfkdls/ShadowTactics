/**
 * File        : C:\Users\Alvaro\Documents\proyectos\ShadowTactics\src\shared\game\init.ts
 * Autor       : Alvaro Cabedo
 * Fecha       : 2026-04-05
 * Descripcion : 
 */

import { GameState } from './state';
import { buildEffectDeck, buildIdentityDeck } from './actions/card';

export function createInitialGameState(): GameState {
    const { deck: effectDeck, seed: deckSeed } = buildEffectDeck(123456);
    const { deck: identityDeck, seed: identitySeed } = buildIdentityDeck(deckSeed);

    // Repartir 3 cartas de identidad a cada jugador del mazo barajado
    const p1Identity = identityDeck.slice(0, 3);
    const p2Identity = identityDeck.slice(3, 6);
    const remainingDeck = identityDeck.slice(6);  // 9 cartas restantes

    return {
        // FLUJO
        turn: 1,
        activePlayer: 'p1',

        gamePhase: 'PREPARATION',
        preparationPhase: 'IDENTITY_SELECTION',
        turnPhase: 'DRAW',

        // MAPA
        map: { radius: 6 },
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

                cardsInHand: [],

                // IDENTIDAD — 3 cartas del mazo barajado
                identityCards: p1Identity,
                selectedIdentity: undefined,
                revealedIdentity: undefined,

                // DESPLIEGUE
                unitsToDeploy: ['u1','u2','u3','u4','u5','u6','u7','u8','u9','u10','u11'],
                deployedUnits: [],
            },
            p2: {
                actionPoints: 0,
                carryOver: 0,

                cardsInHand: [],

                // IDENTIDAD — 3 cartas del mazo barajado
                identityCards: p2Identity,
                selectedIdentity: undefined,
                revealedIdentity: undefined,

                // DESPLIEGUE
                unitsToDeploy: ['u12','u13','u14','u15','u16','u17','u18','u19','u20','u21','u22'],
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

        effectDeck,
        effectDiscard: [],
        identityDeck: remainingDeck,

        activeModifiers: [],
        nextModifierId: 1,
        lastCardAction: undefined,

    };
}