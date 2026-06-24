import { assert, assertEqual } from './shared';
import { createInitialGameState } from '../shared/game/init';

console.log('\n--- Game State Init ---\n');

const state = createInitialGameState();

assertEqual(state.gamePhase, 'PREPARATION', 'createInitialGameState — fase es PREPARATION');
assertEqual(state.preparationPhase, 'IDENTITY_SELECTION', 'createInitialGameState — subfase es IDENTITY_SELECTION');
assertEqual(state.turn, 1, 'createInitialGameState — turno inicial es 1');
assert(state.activePlayer === 'p1' || state.activePlayer === 'p2', 'createInitialGameState — jugador activo definido');
assertEqual(state.map.radius, 5, 'createInitialGameState — mapa radio 5');
assertEqual(state.centerHex.q, 0, 'createInitialGameState — centro Q=0');
assertEqual(state.centerHex.r, 0, 'createInitialGameState — centro R=0');
assert(state.rngSeed !== undefined, 'createInitialGameState — semilla RNG definida');

// Players
const p1 = state.players['p1'];
const p2 = state.players['p2'];
assert(p1 !== undefined, 'createInitialGameState — jugador p1 existe');
assert(p2 !== undefined, 'createInitialGameState — jugador p2 existe');

assertEqual(p1.actionPoints, 0, 'createInitialGameState — p1 PA inicial 0');
assertEqual(p1.carryOver, 0, 'createInitialGameState — p1 carryOver inicial 0');
assertEqual(p1.identityCards?.length, 3, 'createInitialGameState — p1 tiene 3 cartas de identidad');
assert(p1.selectedIdentity === undefined, 'createInitialGameState — p1 sin identidad seleccionada');
assert(p1.revealedIdentity === undefined, 'createInitialGameState — p1 sin identidad revelada');
assertEqual(p1.unitsToDeploy?.length, 13, 'createInitialGameState — p1 tiene 13 unidades (3 por clase + general)');
assertEqual(p1.deployedUnits?.length, 0, 'createInitialGameState — p1 sin unidades desplegadas');

assertEqual(p2.identityCards?.length, 3, 'createInitialGameState — p2 tiene 3 cartas de identidad');
assertEqual(p2.unitsToDeploy?.length, 13, 'createInitialGameState — p2 tiene 13 unidades (3 por clase + general)');

// Dice rolls
assert(state.diceRolls.p1 === undefined, 'createInitialGameState — dados p1 sin tirar');
assert(state.diceRolls.p2 === undefined, 'createInitialGameState — dados p2 sin tirar');
assert(state.deploymentOrder === undefined, 'createInitialGameState — sin orden de despliegue');

// Units / graveyard
assertEqual(Object.keys(state.units).length, 0, 'createInitialGameState — sin unidades en tablero');
assertEqual(Object.keys(state.graveyard).length, 0, 'createInitialGameState — cementerio vacío');
