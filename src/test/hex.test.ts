import { assert, assertEqual } from './shared';
import { hexDistance } from '../shared/hex/distance';
import { hexNeighbors } from '../shared/hex/neighbors';
import { hexRange } from '../shared/hex/range';
import { generateHexMap, isInsideMap } from '../shared/hex/map';
import type { HexMap } from '../shared/hex/map';

console.log('\n--- Hex Math ---\n');

// hexDistance
assertEqual(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 }), 0, 'hexDistance — centro a sí mismo es 0');
assertEqual(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 }), 1, 'hexDistance — paso en Q es 1');
assertEqual(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 }), 1, 'hexDistance — paso en R es 1');
assertEqual(hexDistance({ q: 0, r: 0 }, { q: 3, r: -2 }), 3, 'hexDistance — diagonal');
assertEqual(hexDistance({ q: 1, r: 2 }, { q: -2, r: 1 }), 4, 'hexDistance — puntos arbitrarios');

// hexNeighbors
const neighbors = hexNeighbors({ q: 0, r: 0 });
assertEqual(neighbors.length, 6, 'hexNeighbors — centro tiene 6 vecinos');
assert(neighbors.some(n => n.q === 1 && n.r === 0), 'hexNeighbors — incluye (1,0)');
assert(neighbors.some(n => n.q === 0 && n.r === 1), 'hexNeighbors — incluye (0,1)');
assert(neighbors.some(n => n.q === -1 && n.r === 1), 'hexNeighbors — incluye (-1,1)');
assert(neighbors.some(n => n.q === -1 && n.r === 0), 'hexNeighbors — incluye (-1,0)');
assert(neighbors.some(n => n.q === 0 && n.r === -1), 'hexNeighbors — incluye (0,-1)');
assert(neighbors.some(n => n.q === 1 && n.r === -1), 'hexNeighbors — incluye (1,-1)');

// hexRange
assertEqual(hexRange({ q: 0, r: 0 }, 0).length, 1, 'hexRange — radio 0 es 1 hex');
assertEqual(hexRange({ q: 0, r: 0 }, 1).length, 7, 'hexRange — radio 1 es 7 hex');
assertEqual(hexRange({ q: 0, r: 0 }, 2).length, 19, 'hexRange — radio 2 es 19 hex');

// generateHexMap
const mapR3: HexMap = { radius: 3 };
const hexes3 = generateHexMap(mapR3);
assertEqual(hexes3.length, 37, 'generateHexMap — radio 3 genera 37 hex');

const mapR5: HexMap = { radius: 5 };
const hexes5 = generateHexMap(mapR5);
assertEqual(hexes5.length, 91, 'generateHexMap — radio 5 genera 91 hex');

// isInsideMap
assert(isInsideMap({ q: 0, r: 0 }, mapR5), 'isInsideMap — centro dentro');
assert(isInsideMap({ q: 5, r: 0 }, mapR5), 'isInsideMap — borde Q=5 dentro');
assert(isInsideMap({ q: 0, r: -5 }, mapR5), 'isInsideMap — borde R=-5 dentro');
assert(!isInsideMap({ q: 6, r: 0 }, mapR5), 'isInsideMap — Q=6 fuera');
assert(!isInsideMap({ q: 0, r: -6 }, mapR5), 'isInsideMap — R=-6 fuera');
assert(!isInsideMap({ q: 4, r: 4 }, mapR5), 'isInsideMap — (4,4) fuera porque S=-8');
