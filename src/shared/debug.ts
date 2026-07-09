import type { GameState } from './game/state';
import { getModifierSum } from './game/modifiers/engine';

let _debug = false;

export function initDebug(): void {
    try {
        const val = typeof process !== 'undefined' && process.env?.DEBUG;
        _debug = val === 'true' || val === '1';
    } catch {
        _debug = false;
    }
}

export function isDebug(): boolean {
    return _debug;
}

export function debugLog(...args: any[]): void {
    if (_debug) console.log('[DEBUG]', ...args);
}

export function debugCombat(state: GameState, attackerId: string, targetId: string, configId: string): void {
    if (!_debug) return;
    const attacker = state.units[attackerId];
    const target = state.units[targetId] ?? state.graveyard[targetId];
    if (!attacker || !target) return;

    console.log('\n=== DEBUG COMBAT ===');
    console.log(`Attacker: [${attacker.id}] ${attacker.class} (atk:${attacker.attack}, hp:${attacker.hp})`);
    console.log(`Target:   [${target.id}] ${target.class} (hp:${target.hp})`);
    console.log(`ConfigId: ${configId}`);
    console.log(`Turn: ${state.turn}, Player: ${state.activePlayer}`);

    const attackMod = getModifierSum(state, attacker.owner, attackerId, 'attack');
    const defenseMod = getModifierSum(state, target.owner, targetId, 'defense');
    console.log(`Attack modifiers sum: ${attackMod}`);
    console.log(`Defense modifiers sum: ${defenseMod}`);

    const allAttackMods = state.activeModifiers.filter(m =>
        m.stat === 'attack' && (m.targetId === undefined || m.targetId === attackerId)
        && m.sourcePlayerId === attacker.owner
    );
    if (allAttackMods.length > 0) {
        console.log('Active attack modifiers:');
        for (const m of allAttackMods) {
            console.log(`  [${m.operator}] +${m.value} (source:${m.sourceName}, turns:${m.remainingTurns}, uses:${m.remainingUses})`);
        }
    }

    const allDefenseMods = state.activeModifiers.filter(m =>
        m.stat === 'defense' && (m.targetId === undefined || m.targetId === targetId)
        && m.sourcePlayerId === target.owner
    );
    if (allDefenseMods.length > 0) {
        console.log('Active defense modifiers:');
        for (const m of allDefenseMods) {
            console.log(`  [${m.operator}] +${m.value} (source:${m.sourceName}, turns:${m.remainingTurns}, uses:${m.remainingUses})`);
        }
    }

    console.log(`Attacker abilities: ${(attacker.abilities ?? []).join(', ')}`);
    console.log(`Target abilities: ${(target.abilities ?? []).join(', ')}`);
    console.log(`Attacker flags: ${(attacker.flags ?? []).join(', ')}`);
    console.log(`Target flags: ${(target.flags ?? []).join(', ')}`);
    if (state.selectedIdentity) {
        console.log(`Identity: ${state.selectedIdentity}`);
    }
    console.log('===================\n');
}
