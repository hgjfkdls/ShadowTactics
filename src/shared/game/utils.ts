/**
 * File        : C:\Users\Alvaro\Documents\proyectos\ShadowTactics\src\shared\game\utils.ts
 * Autor       : Alvaro Cabedo
 * Fecha       : 2026-04-05
 * Descripcion : 
 */

export function nextRandom(seed: number): { value: number; seed: number } {
    const newSeed = (seed * 1664525 + 1013904223) % 4294967296;
    const value = newSeed / 4294967296;
    return { value, seed: newSeed };
}

export function rollDice(
    seed: number,
    sides: number
): { roll: number; seed: number } {
    const { value, seed: newSeed } = nextRandom(seed);
    const roll = Math.floor(value * sides) + 1;
    return { roll, seed: newSeed };
}

