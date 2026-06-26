export type ModifierInstance = {
    id: string;
    sourcePlayerId: string;
    targetId?: string;
    stat: string;
    value: number;
    operator: 'ADD' | 'MUL' | 'SET';
    remainingTurns: number;
    remainingUses?: number;
};
