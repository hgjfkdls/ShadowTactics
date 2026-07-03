export type AbilityType = 'attack' | 'support' | 'move';
export type DisplayType = 'attack' | 'support' | 'move';
export type TargetType = 'self' | 'ally' | 'enemy' | 'position' | 'all_allies' | 'all_enemies' | 'none';

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
    showMovement?: boolean;
    showEffects?: boolean;
    showCost?: boolean;
    showResult?: boolean;
    showDmg?: boolean;
    showUnitsAffected?: boolean;
    countAllies?: boolean;
    countEnemies?: boolean;
};

export type ConfigEffect = {
    type: string;
    target: string;
    value?: number;
    duration?: number;
    descriptionKey?: string;
};

export type AbilityRequires = {
    unitFlags?: Record<string, boolean>;
    notUnitFlags?: Record<string, boolean>;
    hpBelowMax?: boolean;
    hasAdjacentEnemy?: boolean;
    hasFreeEscapeHex?: boolean;
    requiresCabalgar?: boolean;
    minPA?: number;
    notWithAbility?: string[];
};

export type AbilityConfig = {
    id: string;
    nameKey: string;
    displayName?: string;
    type: AbilityType;
    displayType: DisplayType;
    icon: string;
    targetType: TargetType;
    range?: number | 'unit.range';
    rangeBonus?: number;
    base: {
        attack?: number | 'unit.attack';
        difficulty?: number | 'unit.difficulty';
        paCost?: number;
    };
    move?: {
        baseCost?: number | 'unit.movementCost';
        maxDist?: number;
        setFlags?: Record<string, any>;
    };
    effects?: ConfigEffect[];
    setFlags?: Record<string, any>;
    extraDifficulty?: number;
    extraAttack?: number;
    requires?: AbilityRequires;
    flags?: {
        isCarga?: boolean;
        noCritical?: boolean;
        replacesMove?: boolean;
        straightLine?: boolean;
        noCrossUnits?: boolean;
        isExtraAttack?: boolean;
        consumesUnitAction?: boolean;
        freeMove?: boolean;
    };
    isPassive?: boolean;
    fixedDamage?: number;
    replacesAttack?: boolean;
    requiresCabalgarDir?: boolean;
    allowedModifiers: string[];
    panel?: PanelElements;
    log?: LogElements;
    restrictions?: string[];
};
