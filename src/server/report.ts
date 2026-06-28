import type { GameState, Unit } from '@shared/game/state';
import type { ActionRecord } from './GameRoom';

const REPORT_API_URL = process.env.REPORT_API_URL ?? 'http://localhost:3001/api/games/report';
const REPORT_API_KEY = process.env.REPORT_API_KEY ?? 'dev-key-change-me';

type UnitClass = 'archer' | 'infantry' | 'cavalry' | 'lancer' | 'general';

type ClassStatEntry = {
    unitClass: string;
    count: number;
    survived: boolean;
    attacksMade: number;
    attacksHit: number;
    attacksMissed: number;
    criticalHits: number;
    counterAttacks: number;
    damageDealt: number;
    damageReceived: number;
    damageMitigated: number;
    counterDamage: number;
    kills: number;
    killsByCounter: number;
    timesKilled: number;
    totalMoves: number;
    totalHexesMoved: number;
};

type IdentityStatEntry = {
    identityId: string;
    kills: number;
    damageDealt: number;
    damageReceived: number;
    abilityUses: number;
    cardsPlayed: number;
};

type DeploymentEntry = {
    unitId: string;
    class: string;
    q: number;
    r: number;
    step: number;
};

type ReportPayload = {
    gameId: string;
    winnerId: string;
    type: 'quickplay' | 'ranked';
    rngSeed: number;
    actions: { index: number; playerId: string; action: object }[];
    duration: number;
    totalTurns: number;
    deployment: Record<string, DeploymentEntry[]>;
    classStats: Record<string, ClassStatEntry[]>;
    identityStats: Record<string, IdentityStatEntry>;
};

function mapPlayerToUserId(playerId: string, mapping: { p1?: string; p2?: string }): string | undefined {
    if (playerId === 'p1') return mapping.p1;
    if (playerId === 'p2') return mapping.p2;
    return undefined;
}

function computeReport(
    gameId: string,
    state: GameState,
    actions: ActionRecord[],
    userIdMapping: { p1?: string; p2?: string },
    matchType: 'quickplay' | 'ranked',
): ReportPayload | null {
    const p1UserId = userIdMapping.p1;
    const p2UserId = userIdMapping.p2;
    if (!p1UserId || !p2UserId) return null;

    const winnerPlayerId = state.winner;
    if (!winnerPlayerId) return null;

    const winnerId = mapPlayerToUserId(winnerPlayerId, userIdMapping);
    if (!winnerId) return null;

    const loserId = winnerId === p1UserId ? p2UserId : p1UserId;

    const p1Units = Object.values(state.units).filter(u => u.owner === 'p1');
    const p2Units = Object.values(state.units).filter(u => u.owner === 'p2');
    const p1Graveyard = Object.values(state.graveyard).filter(u => u.owner === 'p1');
    const p2Graveyard = Object.values(state.graveyard).filter(u => u.owner === 'p2');

    const allP1Units = [...p1Units, ...p1Graveyard];
    const allP2Units = [...p2Units, ...p2Graveyard];

    const classBuckets: Record<string, { p1: Unit[]; p2: Unit[] }> = {};
    for (const unit of allP1Units) {
        const c = unit.class;
        if (!classBuckets[c]) classBuckets[c] = { p1: [], p2: [] };
        classBuckets[c].p1.push(unit);
    }
    for (const unit of allP2Units) {
        const c = unit.class;
        if (!classBuckets[c]) classBuckets[c] = { p1: [], p2: [] };
        classBuckets[c].p2.push(unit);
    }

    const p1ClassStats: ClassStatEntry[] = [];
    const p2ClassStats: ClassStatEntry[] = [];

    for (const [unitClass, buckets] of Object.entries(classBuckets)) {
        for (const [ownerLabel, units] of Object.entries(buckets)) {
            if (units.length === 0) continue;
            const isP1 = ownerLabel === 'p1';

            const classAlive = units.filter(u => (isP1 ? p1Units : p2Units).some(a => a.id === u.id));

            const attacksFromClass = state.attackResults.filter(a => {
                const attackerUnit = Object.values({ ...state.units, ...state.graveyard }).find(u => u.id === a.attackerId);
                return attackerUnit && attackerUnit.class === unitClass && attackerUnit.owner === (isP1 ? 'p1' : 'p2');
            });

            const hits = attacksFromClass.filter(a => a.hit);
            const criticals = attacksFromClass.filter(a => a.damage > 0 && a.attackName === 'critical');
            const counters = state.attackResults.filter(a => {
                const targetUnit = Object.values({ ...state.units, ...state.graveyard }).find(u => u.id === a.targetId);
                return targetUnit && targetUnit.class === unitClass && targetUnit.owner === (isP1 ? 'p1' : 'p2') && a.counterDamage > 0;
            });

            const damageDealt = attacksFromClass.reduce((sum, a) => sum + a.damage, 0);
            const damageReceived = state.attackResults
                .filter(a => {
                    const targetUnit = Object.values({ ...state.units, ...state.graveyard }).find(u => u.id === a.targetId);
                    return targetUnit && targetUnit.class === unitClass && targetUnit.owner === (isP1 ? 'p1' : 'p2');
                })
                .reduce((sum, a) => sum + a.damage, 0);

            const kills = attacksFromClass.filter(a => a.targetKilled).length;
            const killsByCounter = counters.filter(c => {
                const targetUnit = Object.values({ ...state.units, ...state.graveyard }).find(u => u.id === c.targetId);
                return targetUnit && targetUnit.owner !== (isP1 ? 'p1' : 'p2') && c.counterDamage > 0;
            }).length;

            const entry: ClassStatEntry = {
                unitClass,
                count: units.length,
                survived: classAlive.length > 0,
                attacksMade: attacksFromClass.length,
                attacksHit: hits.length,
                attacksMissed: attacksFromClass.length - hits.length,
                criticalHits: criticals.length,
                counterAttacks: counters.length,
                damageDealt,
                damageReceived,
                damageMitigated: 0,
                counterDamage: counters.reduce((sum, c) => sum + c.counterDamage, 0),
                kills,
                killsByCounter,
                timesKilled: units.filter(u => state.graveyard[u.id] !== undefined).length,
                totalMoves: 0,
                totalHexesMoved: 0,
            };

            if (isP1) {
                p1ClassStats.push(entry);
            } else {
                p2ClassStats.push(entry);
            }
        }
    }

    const p1IdentityId = state.players['p1']?.selectedIdentity ?? 'unknown';
    const p2IdentityId = state.players['p2']?.selectedIdentity ?? 'unknown';

    const p1Kills = state.attackResults.filter(a => {
        const attacker = Object.values({ ...state.units, ...state.graveyard }).find(u => u.id === a.attackerId);
        return attacker?.owner === 'p1' && a.targetKilled;
    }).length;
    const p2Kills = state.attackResults.filter(a => {
        const attacker = Object.values({ ...state.units, ...state.graveyard }).find(u => u.id === a.attackerId);
        return attacker?.owner === 'p2' && a.targetKilled;
    }).length;

    const p1DamageDealt = state.attackResults.filter(a => {
        const attacker = Object.values({ ...state.units, ...state.graveyard }).find(u => u.id === a.attackerId);
        return attacker?.owner === 'p1';
    }).reduce((sum, a) => sum + a.damage, 0);
    const p2DamageDealt = state.attackResults.filter(a => {
        const attacker = Object.values({ ...state.units, ...state.graveyard }).find(u => u.id === a.attackerId);
        return attacker?.owner === 'p2';
    }).reduce((sum, a) => sum + a.damage, 0);

    const p1DamageReceived = state.attackResults.filter(a => {
        const target = Object.values({ ...state.units, ...state.graveyard }).find(u => u.id === a.targetId);
        return target?.owner === 'p1';
    }).reduce((sum, a) => sum + a.damage, 0);
    const p2DamageReceived = state.attackResults.filter(a => {
        const target = Object.values({ ...state.units, ...state.graveyard }).find(u => u.id === a.targetId);
        return target?.owner === 'p2';
    }).reduce((sum, a) => sum + a.damage, 0);

    const gameStartTime = state.gameStartTime ?? 0;
    const duration = gameStartTime > 0 ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;

    const deployment: Record<string, DeploymentEntry[]> = {
        [p1UserId]: allP1Units.map(u => ({
            unitId: u.id,
            class: u.class,
            q: u.position.q,
            r: u.position.r,
            step: 0,
        })),
        [p2UserId]: allP2Units.map(u => ({
            unitId: u.id,
            class: u.class,
            q: u.position.q,
            r: u.position.r,
            step: 0,
        })),
    };

    return {
        gameId,
        winnerId,
        type: matchType,
        rngSeed: state.rngSeed,
        actions: actions.map(a => ({ index: a.index, playerId: a.playerId, action: a.action })),
        duration,
        totalTurns: state.turn,
        deployment,
        classStats: {
            [p1UserId]: p1ClassStats,
            [p2UserId]: p2ClassStats,
        },
        identityStats: {
            [p1UserId]: {
                identityId: p1IdentityId,
                kills: p1Kills,
                damageDealt: p1DamageDealt,
                damageReceived: p1DamageReceived,
                abilityUses: 0,
                cardsPlayed: 0,
            },
            [p2UserId]: {
                identityId: p2IdentityId,
                kills: p2Kills,
                damageDealt: p2DamageDealt,
                damageReceived: p2DamageReceived,
                abilityUses: 0,
                cardsPlayed: 0,
            },
        },
    };
}

export async function submitReport(
    gameId: string,
    state: GameState,
    actions: ActionRecord[],
    userIdMapping: { p1?: string; p2?: string },
    matchType: 'quickplay' | 'ranked' = 'quickplay',
): Promise<boolean> {
    const payload = computeReport(gameId, state, actions, userIdMapping, matchType);
    if (!payload) {
        console.error(`[report] No se pudo computar reporte para ${gameId}`);
        return false;
    }

    try {
        const res = await fetch(REPORT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': REPORT_API_KEY,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(`[report] Error ${res.status}: ${text}`);
            return false;
        }

        const json = await res.json();
        console.log(`[report] Partida ${gameId} reportada:`, json);
        return true;
    } catch (err) {
        console.error(`[report] Error al reportar partida ${gameId}:`, err);
        return false;
    }
}
