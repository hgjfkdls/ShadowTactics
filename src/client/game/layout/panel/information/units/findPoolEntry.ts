import type { GameState } from '@shared';

export function findPoolEntry(state: GameState, unitId: string): { owner: string; unitClass: string } | undefined {
    for (const [pid, p] of Object.entries(state.players)) {
        const entry = p.unitsToDeploy?.find(e => e.unitId === unitId);
        if (entry) return { owner: pid, unitClass: entry.unitClass };
    }
    return undefined;
}
