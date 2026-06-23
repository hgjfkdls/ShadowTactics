export function nextRandom(seed: number): { value: number; seed: number } {
    const newSeed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return { value: newSeed, seed: newSeed };
}

export function rollDice(seed: number, sides: number): { roll: number; seed: number } {
    const { value, seed: newSeed } = nextRandom(seed);
    const roll = (value % sides) + 1;
    return { roll, seed: newSeed };
}

export function roll2d6(seed: number): { die1: number; die2: number; total: number; seed: number } {
    const { roll: die1, seed: s1 } = rollDice(seed, 6);
    const { roll: die2, seed: s2 } = rollDice(s1, 6);
    return { die1, die2, total: die1 + die2, seed: s2 };
}
