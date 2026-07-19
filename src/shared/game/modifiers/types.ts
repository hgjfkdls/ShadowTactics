export type ModifierInstance = {
    id: string;
    sourcePlayerId: string;
    targetId?: string;
    stat: string;
    value: number;
    operator: 'ADD' | 'MUL' | 'SET';
    remainingTurns: number;
    remainingUses?: number;
    source?: string;        // "card" | "ability" | "formation" | "identity"
    sourceName?: string;     // "Movilidad", "Resistencia", "Proteger", etc.
    consumedBy?: string;     // abilityId que puede consumirlo (default undefined = any)
};
