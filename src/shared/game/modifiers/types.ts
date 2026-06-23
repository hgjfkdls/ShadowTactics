export type ModifierInstance = {
    id: string;
    sourcePlayerId: string;
    stat: string;
    value: number;
    operator: 'ADD' | 'MUL' | 'SET';
    remainingTurns: number;
    remainingUses?: number;
};
