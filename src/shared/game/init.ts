/**
 * File        : C:\Users\Alvaro\Documents\proyectos\ShadowTactics\src\shared\game\init.ts
 * Autor       : Alvaro Cabedo
 * Fecha       : 2026-04-05
 * Descripcion : 
 */

import { GameState } from './state';

export function createInitialGameState(): GameState {
    return {
        // FLUJO
        turn: 1,
        activePlayer: 'p1',

        gamePhase: 'PREPARATION',
        preparationPhase: 'IDENTITY_SELECTION',
        turnPhase: 'DRAW', // aún no se usa realmente

        // MAPA
        map: { radius: 4 },
        centerHex: { q: 0, r: 0 },

        // UNIDADES
        units: {},
        graveyard: {},

        // RNG
        rngSeed: 123456,

        // JUGADORES
        players: {
            p1: {
                actionPoints: 0,
                carryOver: 0,

                cardsInHand: [],

                // IDENTIDAD
                identityCards: ['c1', 'c2', 'c3'],
                selectedIdentity: undefined,
                revealedIdentity: undefined,

                // DESPLIEGUE
                unitsToDeploy: ['u1', 'u2', 'u3'],
                deployedUnits: []
            },
            p2: {
                actionPoints: 0,
                carryOver: 0,

                cardsInHand: [],

                // IDENTIDAD
                identityCards: ['c4', 'c5', 'c6'],
                selectedIdentity: undefined,
                revealedIdentity: undefined,

                // DESPLIEGUE
                unitsToDeploy: ['u4', 'u5', 'u6'],
                deployedUnits: []
            }
        },

        // PREPARATION DATA
        diceRolls: {
            p1: undefined,
            p2: undefined
        },

        deploymentOrder: undefined,
        currentDeployingPlayer: undefined
    };
}