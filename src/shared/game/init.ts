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

                cardsInHand: [],

                // IDENTIDAD — 3 cartas del mazo barajado
                identityCards: p1Identity,
                selectedIdentity: undefined,
                revealedIdentity: undefined,

                // DESPLIEGUE — 13 unidades pre-claseadas (3 por clase + 1 general)
                unitsToDeploy: [
                    { unitId: 'u1',  unitClass: 'archer' },
                    { unitId: 'u2',  unitClass: 'archer' },
                    { unitId: 'u3',  unitClass: 'archer' },
                    { unitId: 'u4',  unitClass: 'infantry' },
                    { unitId: 'u5',  unitClass: 'infantry' },
                    { unitId: 'u6',  unitClass: 'infantry' },
                    { unitId: 'u7',  unitClass: 'cavalry' },
                    { unitId: 'u8',  unitClass: 'cavalry' },
                    { unitId: 'u9',  unitClass: 'cavalry' },
                    { unitId: 'u10', unitClass: 'lancer' },
                    { unitId: 'u11', unitClass: 'lancer' },
                    { unitId: 'u12', unitClass: 'lancer' },
                    { unitId: 'u13', unitClass: 'general' },
                ],
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

                // DESPLIEGUE — 13 unidades pre-claseadas (3 por clase + 1 general)
                unitsToDeploy: [
                    { unitId: 'u14', unitClass: 'archer' },
                    { unitId: 'u15', unitClass: 'archer' },
                    { unitId: 'u16', unitClass: 'archer' },
                    { unitId: 'u17', unitClass: 'infantry' },
                    { unitId: 'u18', unitClass: 'infantry' },
                    { unitId: 'u19', unitClass: 'infantry' },
                    { unitId: 'u20', unitClass: 'cavalry' },
                    { unitId: 'u21', unitClass: 'cavalry' },
                    { unitId: 'u22', unitClass: 'cavalry' },
                    { unitId: 'u23', unitClass: 'lancer' },
                    { unitId: 'u24', unitClass: 'lancer' },
                    { unitId: 'u25', unitClass: 'lancer' },
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

        effectDeck,
        effectDiscard: [],
        identityDeck: remainingDeck,

        activeModifiers: [],
        nextModifierId: 1,
        lastCardAction: undefined,

    };
}