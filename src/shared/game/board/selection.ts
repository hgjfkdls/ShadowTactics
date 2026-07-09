import type { GameState, Unit, HexCoord } from '../state';
import type { AbilityRange, AbilityTarget, HighlightType, RangeMode, RangeOperator } from '../data/ability-config/types';
import { ABILITY_CONFIG } from '../data/ability-config';
import { hexDistance } from '../../hex';
import { isHexOccupied, isWithinBounds } from '../utils';

function defaultRange(type: string, unit: Unit): AbilityRange {
    switch (type) {
        case 'attack': return { mode: 'around', operator: '<=', value: unit.range };
        case 'support': return { mode: 'around', operator: '<=', value: 2 };
        case 'move': return { mode: 'around', operator: '<=', value: unit.movementCost };
        default: return { mode: 'around', operator: '<=', value: 1 };
    }
}

function defaultTarget(type: string): AbilityTarget {
    switch (type) {
        case 'attack': return { enemies: true, type: 'attack' };
        case 'support': return { allies: true, type: 'support' };
        case 'move': return { empty: true, type: 'move' };
        default: return { enemies: true, type: 'attack' };
    }
}

function resolveValue(val: number | 'unit.range' | undefined, unit: Unit): number {
    if (val === 'unit.range') return unit.range;
    return val ?? 1;
}

function getRangeBonus(cfgId: string, unit: Unit, state: GameState): number {
    const cfg = ABILITY_CONFIG[cfgId];
    if (!cfg) return 0;
    if (cfg.type === 'move') return 0;
    let bonus = cfg.rangeBonus ?? 0;
    // Range modifier from activeModifiers (lanza_escudo, francotirador)
    for (const m of state.activeModifiers) {
        if (m.stat === 'range' && (m.targetId === undefined || m.targetId === unit.id)) {
            if (m.remainingUses !== undefined && m.remainingUses <= 0) continue;
            if (m.operator === 'ADD') bonus += m.value;
        }
    }
    // Tiro a distancia: +1 rango a ataques básicos para arqueros (no general)
    if (cfgId === 'ataque_basico' && unit.class !== 'general') {
        const identity = state.players[unit.owner]?.selectedIdentity ?? '';
        if (unit.abilities?.includes('tiro_a_distancia') || (identity.startsWith('francotirador') && unit.class === 'archer')) bonus += 1;
    }
    return bonus;
}

function getHexesAround(origin: HexCoord, value: number, operator: RangeOperator): HexCoord[] {
    const hexes: HexCoord[] = [];
    for (let dq = -value; dq <= value; dq++) {
        for (let dr = Math.max(-value, -dq - value); dr <= Math.min(value, -dq + value); dr++) {
            hexes.push({ q: origin.q + dq, r: origin.r + dr });
        }
    }
    if (operator === '=') {
        return hexes.filter(h => hexDistance(origin, h) === value);
    }
    return hexes;
}

function getHexesInLine(origin: HexCoord, direction: HexCoord, value: number, operator: RangeOperator): HexCoord[] {
    const hexes: HexCoord[] = [];
    const step = { q: direction.q, r: direction.r };
    if (operator === '=') {
        hexes.push({ q: origin.q + step.q * value, r: origin.r + step.r * value });
    } else {
        for (let i = 1; i <= value; i++) {
            hexes.push({ q: origin.q + step.q * i, r: origin.r + step.r * i });
        }
    }
    return hexes;
}

const AXIAL_DIRS = [
    { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
    { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
];

function getHexesStar(origin: HexCoord, value: number, operator: RangeOperator): HexCoord[] {
    const hexes: HexCoord[] = [];
    for (const dir of AXIAL_DIRS) {
        hexes.push(...getHexesInLine(origin, dir, value, operator));
    }
    return hexes;
}

function getHexesFront(origin: HexCoord, unit: Unit, value: number, operator: RangeOperator): HexCoord[] {
    if (!unit.lastHex) return [];
    const dq = origin.q - unit.lastHex.q;
    const dr = origin.r - unit.lastHex.r;
    const steps = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr));
    if (steps === 0) return [];
    const dir = { q: dq / steps, r: dr / steps };
    return getHexesInLine(origin, dir, value, operator);
}

function hexToPixel(h: HexCoord): { x: number; y: number } {
    return { x: h.q * 1.5, y: (h.q * 0.5 + h.r) * Math.sqrt(3) };
}

function isInCone(h: HexCoord, dir: HexCoord): boolean {
    // Check if hex h is within 60° of direction dir using pixel dot product
    const hp = hexToPixel(h);
    const dp = hexToPixel(dir);
    const dot = hp.x * dp.x + hp.y * dp.y;
    const lenH = Math.sqrt(hp.x * hp.x + hp.y * hp.y);
    const lenD = Math.sqrt(dp.x * dp.x + dp.y * dp.y);
    if (lenH === 0 || lenD === 0) return true;
    return dot / (lenH * lenD) >= 0.5; // cos(60°)
}

function getHexesWave(origin: HexCoord, unit: Unit, value: number, operator: RangeOperator): HexCoord[] {
    if (!unit.lastHex) return [];
    const dq = origin.q - unit.lastHex.q;
    const dr = origin.r - unit.lastHex.r;
    const steps = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr));
    if (steps === 0) return [];
    const nd = Math.round(dq / steps);
    const nr = Math.round(dr / steps);

    const front = { q: origin.q + nd, r: origin.r + nr };
    if (value === 1) return [front];

    const maxVal = operator === '=' ? value : value;
    const keyH = (h: HexCoord) => `${h.q},${h.r}`;
    const allRanges: HexCoord[][] = [[front]];
    const visited = new Set<string>([keyH(origin), keyH(front)]);

    for (let dist = 2; dist <= maxVal; dist++) {
        const prev = allRanges[dist - 2];
        const current: HexCoord[] = [];
        for (const hex of prev) {
            for (const dir of AXIAL_DIRS) {
                const nh = { q: hex.q + dir.q, r: hex.r + dir.r };
                const nk = keyH(nh);
                if (visited.has(nk)) continue;
                // Must be within the cone (forward direction)
                const rel = { q: nh.q - origin.q, r: nh.r - origin.r };
                if (!isInCone(rel, { q: nd, r: nr })) continue;
                visited.add(nk);
                current.push(nh);
            }
        }
        allRanges.push(current);
    }

    if (operator === '=') {
        return allRanges[maxVal - 1] ?? [];
    }
    return allRanges.flat();
}

export function getHexesInRange(
    origin: HexCoord,
    range: AbilityRange,
    unit: Unit,
    state: GameState,
    bonus = 0
): HexCoord[] {
    const { mode = 'around', operator = '<=', value: rawValue, self } = range;
    const value = resolveValue(rawValue, unit) + bonus;
    let hexes: HexCoord[];

    switch (mode) {
        case 'star':
            hexes = getHexesStar(origin, value, operator);
            break;
        case 'front':
            hexes = getHexesFront(origin, unit, value, operator);
            break;
        case 'wave':
            hexes = getHexesWave(origin, unit, value, operator);
            break;
        default:
            hexes = getHexesAround(origin, value, operator);
    }

    hexes = hexes.filter(h => isWithinBounds(h, state.map.radius));
    if (self === true) {
        if (!hexes.some(h => h.q === origin.q && h.r === origin.r)) {
            hexes.push(origin);
        }
    } else if (self === false) {
        hexes = hexes.filter(h => h.q !== origin.q || h.r !== origin.r);
    }
    return hexes;
}

function isPathClear(from: HexCoord, to: HexCoord, state: GameState): boolean {
    const dq = to.q - from.q;
    const dr = to.r - from.r;
    const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr));
    if (dist <= 1) return true;
    for (let i = 1; i < dist; i++) {
        const mid = {
            q: from.q + Math.round((dq * i) / dist),
            r: from.r + Math.round((dr * i) / dist),
        };
        if (isHexOccupied(state, mid)) return false;
    }
    return true;
}

export function filterTargets(
    hexes: HexCoord[],
    target: AbilityTarget,
    unit: Unit,
    state: GameState,
    bonus = 0,
    origin?: HexCoord
): { hex: HexCoord; type: HighlightType }[] {
    const { self, enemies, allies, empty, operator, value: rawValue, type = 'attack', hpCondition, adjacentToAlly } = target;
    const value = resolveValue(rawValue, unit) + bonus;
    const results: { hex: HexCoord; type: HighlightType }[] = [];
    const refPoint = origin ?? unit.position;
    if (self) {
        results.push({ hex: refPoint, type });
    }
    for (const h of hexes) {
        if (self && h.q === refPoint.q && h.r === refPoint.r) continue;
        const dist = hexDistance(refPoint, h);
        if (value !== undefined) {
            if (operator === '=' && dist !== value) continue;
            if (operator !== '=' && dist > value) continue;
        }
        // Collision check: for move type, block targets with units in the path
        // Solo verificar si el refPoint es la posición real de la unidad (movimiento propio)
        if (type === 'move' && refPoint.q === unit.position.q && refPoint.r === unit.position.r && !isPathClear(refPoint, h, state)) continue;
        // Adjacent to ally filter: only hexes next to an allied unit
        if (adjacentToAlly) {
            const hasAdjacentAlly = Object.values(state.units)
                .some(u => u.owner === unit.owner && u.id !== unit.id && hexDistance(h, u.position) === 1);
            if (!hasAdjacentAlly) continue;
        }
        const occupied = isHexOccupied(state, h);
        if (occupied) {
            const occupant = Object.values(state.units).find(u => u.position.q === h.q && u.position.r === h.r);
            if (!occupant) continue;
            const isEnemy = occupant.owner !== unit.owner;
            // HP condition check
            if (hpCondition) {
                const hp = occupant.hp;
                if (hpCondition.operator === '<=' && hp > hpCondition.value) continue;
                if (hpCondition.operator === '>=' && hp < hpCondition.value) continue;
            }
            if (isEnemy && enemies) { results.push({ hex: h, type }); continue; }
            if (!isEnemy && allies) { results.push({ hex: h, type }); continue; }
            continue;
        }
        if (empty) { results.push({ hex: h, type }); continue; }
    }
    return results;
}

export type SelectionHighlight = {
    hex: HexCoord;
    highlight: 'attack' | 'move' | 'support' | 'range';
};

export function getAbilityHighlights(
    state: GameState,
    unitId: string,
    abilityId: string,
    stepIndex?: number,
    lastSelectionPos?: HexCoord,
    prevTargetPos?: HexCoord
): SelectionHighlight[] {
    const unit = state.units[unitId];
    if (!unit) return [];

    const cfg = ABILITY_CONFIG[abilityId];
    if (!cfg) return [];

    // Solo usar el nuevo sistema si la config tiene range o target explícitos
    const hasRange = cfg.range && Object.keys(cfg.range).length > 0;
    const hasTarget = cfg.target && Object.keys(cfg.target).length > 0;
    if (!hasRange && !hasTarget) return [];

    const range: AbilityRange = hasRange
        ? cfg.range as AbilityRange
        : defaultRange(cfg.type, unit);

    // Resolver target: array multi-step o single
    const targets = Array.isArray(cfg.target) ? cfg.target : [cfg.target ?? defaultTarget(cfg.type)];
    const step = stepIndex ?? 0;
    const targetCfg = targets[Math.min(step, targets.length - 1)];

    // El centro del rango depende del step actual
    const center = step > 0 && lastSelectionPos
        ? ((targetCfg.stepCenter ?? 'target') === 'self' ? unit.position : lastSelectionPos)
        : unit.position;

    // Usar range del step si existe (override multi-step), sino el del ability
    const stepRange = targetCfg.range;
    const effectiveRange: AbilityRange = stepRange ?? range;

    const bonus = getRangeBonus(abilityId, unit, state);
    let rawHexes = getHexesInRange(center, effectiveRange, unit, state, bonus);

    // Si hay override de range, intersecar con el range base del ability
    if (stepRange) {
        const baseHexes = getHexesInRange(center, range, unit, state, bonus);
        const baseKey = new Set(baseHexes.map(h => `${h.q},${h.r}`));
        rawHexes = rawHexes.filter(h => baseKey.has(`${h.q},${h.r}`));
    }

    // Filtrar hexes adyacentes al target previo si es necesario
    if (targetCfg.avoidAdjacentToTarget && prevTargetPos) {
        rawHexes = rawHexes.filter(h => hexDistance(h, prevTargetPos) > 1);
    }

    const filtered = filterTargets(rawHexes, targetCfg, unit, state, bonus, center);

    const results: SelectionHighlight[] = [];

    const rangeOnlyHexes = rawHexes.filter(h =>
        !filtered.some(f => f.hex.q === h.q && f.hex.r === h.r)
    );
    for (const f of filtered) {
        results.push({ hex: f.hex, highlight: f.type });
    }
    for (const h of rangeOnlyHexes) {
        results.push({ hex: h, highlight: 'range' });
    }

    return results;
}

export function isValidTarget(
    state: GameState,
    unitId: string,
    abilityId: string,
    targetId: string
): boolean {
    const highlights = getAbilityHighlights(state, unitId, abilityId);
    const targetUnit = state.units[targetId];
    if (!targetUnit) return false;
    return highlights.some(h =>
        h.highlight !== 'range' &&
        h.hex.q === targetUnit.position.q &&
        h.hex.r === targetUnit.position.r
    );
}
