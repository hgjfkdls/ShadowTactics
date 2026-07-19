export type AbilityType = 'attack' | 'support' | 'move' | 'card';
export type TargetType = 'self' | 'ally' | 'enemy' | 'position' | 'all_allies' | 'all_enemies' | 'none';
export type RangeMode = 'around' | 'front' | 'star' | 'wave';
export type RangeOperator = '<=' | '=';
export type HighlightType = 'attack' | 'move' | 'support';

export type AbilityRange = {
    mode?: RangeMode;
    operator?: RangeOperator;
    value?: number | 'unit.range';
    self?: boolean;
};

export type AbilityTarget = {
    self?: boolean;
    enemies?: boolean;
    allies?: boolean;
    empty?: boolean;
    operator?: RangeOperator;
    value?: number | 'unit.range';
    type?: HighlightType;
    hpCondition?: { operator: '<=' | '>='; value: number };
    avoidAdjacentToTarget?: boolean;
    adjacentToAlly?: boolean;
    stepLabel?: string;
    stepCenter?: 'self' | 'target';  // centro del step: 'target' = hex previo (default), 'self' = unidad
    range?: AbilityRange;            // override del rango para este step (multi-step)
};

export type PanelElements = {
    title?: boolean;
    showAttacker?: boolean;
    showDefender?: boolean;
    showTarget?: boolean;
    showSource?: boolean;
    showDescription?: boolean;
    showModifiers?: boolean;
    showFormula?: ('PA' | 'diff' | 'dmg' | 'range')[];
    showMovement?: boolean;
    showUnitsAffected?: boolean;
};

export type LogElements = {
    showGameTime?: boolean;
    showTurn?: boolean;
    showActionNumber?: boolean;
    showActionName?: boolean;
    showAttacker?: boolean;
    showDefender?: boolean;
    showTarget?: boolean;
    showSource?: boolean;
    showMovement?: boolean | { unit: 'self' | 'target' };
    showEffects?: boolean;
    showCost?: boolean;
    showResult?: boolean;
    showDmg?: boolean;
    showUnitsAffected?: boolean;
    countAllies?: boolean;
    countEnemies?: boolean;
};

export type EffectTiming = 'onUse' | 'onHit' | 'onKill' | 'onHpChange' | 'turnStart' | 'endTurn';
export type EffectTarget = 'self' | 'ally' | 'enemy' | 'enemies' | 'defender' | 'attacker' | 'killer' | 'player' | 'all_allies' | 'opponent';
export type EffectOperator = 'ADD' | 'MUL' | 'SET';

export type ConfigEffect = {
    type: 'flagPush' | 'flagPop'
        | 'modifierPush' | 'modifierPop'
        | 'combatMutator'
        | 'stateChange'
        | 'trigger'
        | 'indicator';

    target: EffectTarget;
    targetFilter?: {
        classes?: string[];
        isolated?: boolean;
        hpMaxPercent?: number;
        targetHpMaxPercent?: number;
        didMovePreviousTurn?: boolean;
        targetDidMovePreviousTurn?: boolean;
        lastTargetId?: boolean;
        isBasicAttack?: boolean;
        allyClassesAdjacent?: string[];
    };

    timing?: EffectTiming;

    // flagPush / flagPop
    flags?: string[];

    // modifierPush
    stat?: string;
    operator?: EffectOperator;
    value?: number;
    remainingTurns?: number;
    remainingUses?: number;
    consumedBy?: string;    // abilityId que puede consumir este modifier (default undefined = any)

    // modifierPop
    modifierIds?: string[];

    // stateChange
    healType?: 'hp' | 'shield';

    // consume modifiers after processing (ej: robar_ricos)
    consume?: {
        stat: string;           // modifier stat a consumir
        amount?: number;        // usos a consumir (default 1)
        units: 'self' | 'all_allies';
        classes?: string[];     // solo consumir de estas clases
    };

    // Bonus condicionales
    identityBonus?: Record<string, number>;
    conditionalValue?: {
        attackerClasses?: string[];
        targetClasses?: string[];        // target debe ser una de estas clases (include)
        excludeTargetClasses?: string[]; // target NO debe ser una de estas clases
        includeTargetClasses?: string[]; // alias de targetClasses
        targetDied?: boolean;            // true = se activa si el blanco muere
        operator?: 'set' | 'add';
        value: number;
    }[];

    // trigger
    trigger?: 'occupation' | 'postHit';

    // indicator
    indicatorIcon?: 'crosshair' | 'shield' | 'coin';
    indicatorCategory?: 'attack' | 'defense' | 'difficulty' | 'range' | 'cost';
    indicatorTrigger?: 'select' | 'attack' | 'always';
    indicatorVisibleTo?: 'active' | 'owner' | 'all';
    indicatorLabel?: string;
    modifierStat?: string;
    modifierSourceName?: string;
    indicatorOnEnemySelect?: {
        targetClasses?: string[];  // Mostrar en unidades de estas clases (default: todas)
        enemyClasses?: string[];   // Solo cuando el enemigo seleccionado tiene esta clase
        range?: number;            // Rango máximo al enemigo seleccionado
    };

    // Legacy fields for backward compatibility
    descriptionKey?: string;
    range?: number;
    activation?: { turnStart?: { owner: boolean; enemy: boolean }; endTurn?: { owner: boolean } };
};

export type ActivationCondition = {
    self?: boolean;
    enemy?: boolean;
    ally?: boolean;
    range?: number;
    didMovePreviousTurn?: boolean;
    targetDidMovePreviousTurn?: boolean;
    timesDamagedThisTurn?: number;
    whenAttack?: boolean;
    whenAttacked?: boolean;
    whenMove?: boolean;
    turnStart?: { owner: boolean; enemy: boolean };
    endTurn?: { owner: boolean };
    prompt?: boolean;
    distance?: number;
    lastTargetId?: boolean;
    unitClasses?: string[];
    hasAttackedThisTurn?: boolean;
    hasMovedThisTurn?: boolean;
    hpMaxPercent?: number;
    isBasicAttack?: boolean;
    targetUnitClasses?: string[];
    targetIsIsolated?: boolean;
    targetHpMaxPercent?: number;
    onAllyKill?: boolean;
    maxPa?: number;
    onPrompt?: boolean;
    requireFlags?: string[];     // Todas deben estar presentes en unit.flags
    blockFlags?: string[];       // Ninguna debe estar presente en unit.flags
    rangeOrigin?: 'owner' | 'killer';  // Para onAllyKill, quién es el origen del range check
};

export type AbilityConfig = {
    id: string;
    type: AbilityType;
    icon?: string;
    targetType: TargetType;
    range?: AbilityRange | number | 'unit.range';
    target?: AbilityTarget | AbilityTarget[];
    rangeBonus?: number;
    sounds?: string[];
    base: {
        attack?: number | 'unit.attack';
        difficulty?: number | 'unit.difficulty';
        paCost?: number | 'unit.movementCost';
    };
    effects?: ConfigEffect[];
    handler?: 'formations' | 'projection';
    uiHidden?: boolean;                    // No mostrar en la lista de habilidades del UI
    activation?: ActivationCondition;
    extraDifficulty?: number;
    extraAttack?: number;
    flags?: {
        replacesMove?: boolean;
        straightLine?: boolean;
        noCrossUnits?: boolean;
        skipGenericHistoryEntry?: boolean;
        skipConfigEffects?: boolean;
    };
    fixedDamage?: number;
    requiresLastHex?: boolean;
    allowedModifiers: string[];
    panel?: PanelElements;
    log?: LogElements;
};
