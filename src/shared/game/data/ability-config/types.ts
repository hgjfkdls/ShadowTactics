export type AbilityType = 'attack' | 'support' | 'move';
export type DisplayType = 'attack' | 'support' | 'move';
export type TargetType = 'self' | 'ally' | 'enemy' | 'position' | 'all_allies' | 'all_enemies' | 'none';

export type ConfigEffect = {
    type: string;
    target: string;
    value?: number;
    duration?: number;
    descriptionKey?: string;
};

export type AbilityRequires = {
    /** Flags que la unidad debe tener activos */
    unitFlags?: Record<string, boolean>;
    /** Flags que la unidad NO debe tener */
    notUnitFlags?: Record<string, boolean>;
    /** HP debe ser menor que el máximo */
    hpBelowMax?: boolean;
    /** Debe haber un enemigo adyacente */
    hasAdjacentEnemy?: boolean;
    /** Debe haber un hex de escape libre no adyacente al enemigo */
    hasFreeEscapeHex?: boolean;
    /** Requiere Cabalgar previo */
    requiresCabalgar?: boolean;
    /** PA mínima requerida (sobre cfg.base.paCost) */
    minPA?: number;
    /** Habilidades mutuamente excluyentes (no pueden usarse en el mismo turno) */
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
    rangeBonus?: number;  // bonificación de rango (ej: +1 de ventaja_alcance)
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
    setFlags?: Record<string, any>;  // flags to set on the acting unit after the ability
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
    restrictions?: string[];
};
