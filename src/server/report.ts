import type { GameState, Unit } from '@shared/game/state';
import type { ActionRecord, InitialDeployment } from './GameRoom';

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

type PerformanceEntry = {
    score: number;
    winBonus: number;
    hitRate: number;
    damageTradeRatio: number;
    survivalRate: number;
    killParticipation: number;
    counterEfficiency: number;
    cardsPlayedPerTurn: number;
    generalProtection: number;
    firstBlood: number;
    comeback: number;
};

type ReportPayload = {
    gameId: string;
    winnerId: string;
    player1Id: string;
    player2Id: string;
    type: 'quickplay' | 'ranked';
    rngSeed: number;
    actions: { index: number; playerId: string; phase: string; turn: number; action: object }[];
    initialDeployments: { unitId: string; unitClass: string; playerId: string; q: number; r: number; step: number }[];
    gameHistory: GameState['gameHistory'];
    duration: number;
    totalTurns: number;
    deployment: Record<string, DeploymentEntry[]>;
    classStats: Record<string, ClassStatEntry[]>;
    identityStats: Record<string, IdentityStatEntry>;
    performance: Record<string, PerformanceEntry>;
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
    initialDeployments?: InitialDeployment[],
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
    const allUnits = { ...state.units, ...state.graveyard };

    const unitClassMap = new Map<string, string>();
    for (const u of Object.values(allUnits)) {
        unitClassMap.set(u.id, u.class);
    }

    // Computar totalMoves y totalHexesMoved por jugador y clase
    const moveCounts: Record<string, Record<string, { moves: number; hexes: number }>> = {
        [p1UserId]: {},
        [p2UserId]: {},
    };
    for (const a of actions) {
        if (a.action.type === 'MOVE_UNIT' && a.action.unitId) {
            const uid = mapPlayerToUserId(a.playerId, userIdMapping);
            if (!uid) continue;
            const cls = unitClassMap.get(a.action.unitId) ?? 'unknown';
            if (!moveCounts[uid][cls]) moveCounts[uid][cls] = { moves: 0, hexes: 0 };
            moveCounts[uid][cls].moves += 1;
            const fromUnit = allUnits[a.action.unitId];
            if (fromUnit) {
                const dq = Math.abs(a.action.to.q - fromUnit.position.q);
                const dr = Math.abs(a.action.to.r - fromUnit.position.r);
                moveCounts[uid][cls].hexes += Math.max(dq, dr, Math.abs(dq + dr));
            }
        }
    }

    // Contar USE_CARD y USE_ABILITY por jugador
    const cardCounts: Record<string, number> = { [p1UserId]: 0, [p2UserId]: 0 };
    const abilityCounts: Record<string, number> = { [p1UserId]: 0, [p2UserId]: 0 };
    for (const a of actions) {
        const uid = mapPlayerToUserId(a.playerId, userIdMapping);
        if (!uid) continue;
        if (a.action.type === 'USE_CARD') cardCounts[uid] += 1;
        if (a.action.type === 'USE_ABILITY' || a.action.type === 'IDENTITY_ABILITY') abilityCounts[uid] += 1;
    }

    function findUnit(id: string) {
        return Object.values(allUnits).find(u => u.id === id);
    }

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

            const userId = isP1 ? p1UserId : p2UserId;
            const classMoveStats = moveCounts[userId]?.[unitClass];

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
                totalMoves: classMoveStats?.moves ?? 0,
                totalHexesMoved: classMoveStats?.hexes ?? 0,
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

    function computePerf(playerId: string, userId: string): PerformanceEntry {
        const isWinner = winnerPlayerId === playerId;
        const myUnits = Object.values(state.units).filter(u => u.owner === playerId);
        const myGraveyard = Object.values(state.graveyard).filter(u => u.owner === playerId);
        const totalUnits = myUnits.length + myGraveyard.length;
        const allAttacks = state.attackResults;

        const myAttacks = allAttacks.filter(a => findUnit(a.attackerId)?.owner === playerId);
        const myTargeted = allAttacks.filter(a => findUnit(a.targetId)?.owner === playerId);

        const hit = myAttacks.filter(a => a.hit).length;
        const miss = myAttacks.filter(a => !a.hit).length;
        const hitRate = hit / (hit + miss || 1);

        const dmgDealt = myAttacks.reduce((s, a) => s + a.damage, 0);
        const dmgReceived = myTargeted.reduce((s, a) => s + a.damage, 0);
        const damageTradeRatio = dmgDealt / (dmgReceived || 1);

        const survivalRate = myUnits.length / (totalUnits || 1);

        const totalKills = allAttacks.filter(a => a.targetKilled).length;
        const playerKills = myAttacks.filter(a => a.targetKilled).length;
        const killParticipation = playerKills / (totalKills || 1);

        const counterInflicted = allAttacks.filter(a => {
            const target = findUnit(a.targetId);
            return target?.owner !== playerId && a.counterDamage > 0;
        }).reduce((s, a) => s + a.counterDamage, 0);
        const counterReceived = allAttacks.filter(a => {
            const target = findUnit(a.targetId);
            return target?.owner === playerId && a.counterDamage > 0;
        }).reduce((s, a) => s + a.counterDamage, 0);
        const counterEfficiency = counterInflicted / (counterReceived || 1);

        const pActions = actions.filter(a =>
            a.playerId === playerId &&
            a.action.type === 'USE_CARD'
        );
        const cardsPlayedPerTurn = pActions.length / (state.turn || 1);

        const generalDmg = myTargeted.filter(a => findUnit(a.targetId)?.class === 'general')
            .reduce((s, a) => s + a.damage, 0);
        const generalProtection = 1 - (generalDmg / (dmgReceived || 1));

        const firstKill = allAttacks.find(a => a.targetKilled);
        const firstBlood = firstKill && findUnit(firstKill.attackerId)?.owner === playerId ? 1 : 0;

        const opponentId = playerId === 'p1' ? 'p2' : 'p1';
        const opponentDead = Object.values(state.graveyard).filter(u => u.owner === opponentId).length;
        const myDead = myGraveyard.length;
        const comeback = isWinner && myDead > opponentDead ? 1 : 0;

        const winBonus = isWinner ? 1 : 0;

        const norm = (v: number, cap: number) => Math.min(v / cap, 1);

        const rawScore =
            winBonus * 0.20 +
            hitRate * 0.10 +
            norm(damageTradeRatio, 2) * 0.15 +
            survivalRate * 0.15 +
            killParticipation * 0.10 +
            norm(counterEfficiency, 2) * 0.05 +
            norm(cardsPlayedPerTurn, 3) * 0.05 +
            generalProtection * 0.05 +
            firstBlood * 0.05 +
            comeback * 0.05;

        return {
            score: Math.round(rawScore * 100),
            winBonus,
            hitRate: Math.round(hitRate * 1000) / 1000,
            damageTradeRatio: Math.round(damageTradeRatio * 100) / 100,
            survivalRate: Math.round(survivalRate * 1000) / 1000,
            killParticipation: Math.round(killParticipation * 1000) / 1000,
            counterEfficiency: Math.round(counterEfficiency * 100) / 100,
            cardsPlayedPerTurn: Math.round(cardsPlayedPerTurn * 100) / 100,
            generalProtection: Math.round(generalProtection * 1000) / 1000,
            firstBlood,
            comeback,
        };
    }

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
        player1Id: p1UserId,
        player2Id: p2UserId,
        type: matchType,
        rngSeed: state.rngSeed,
        actions: actions.map(a => ({ index: a.index, playerId: a.playerId, phase: a.phase, turn: a.turn, action: a.action })),
        initialDeployments: (initialDeployments ?? []).map(d => ({
            unitId: d.unitId,
            unitClass: d.unitClass,
            playerId: d.playerId,
            q: d.position.q,
            r: d.position.r,
            step: d.step,
        })),
        gameHistory: state.gameHistory,
        duration,
        totalTurns: state.turn,
        deployment: initialDeployments && initialDeployments.length > 0
            ? {
                [p1UserId]: initialDeployments.filter(d => d.playerId === 'p1').map(d => ({
                    unitId: d.unitId, class: d.unitClass, q: d.position.q, r: d.position.r, step: d.step,
                })),
                [p2UserId]: initialDeployments.filter(d => d.playerId === 'p2').map(d => ({
                    unitId: d.unitId, class: d.unitClass, q: d.position.q, r: d.position.r, step: d.step,
                })),
            }
            : deployment,
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
                abilityUses: abilityCounts[p1UserId],
                cardsPlayed: cardCounts[p1UserId],
            },
            [p2UserId]: {
                identityId: p2IdentityId,
                kills: p2Kills,
                damageDealt: p2DamageDealt,
                damageReceived: p2DamageReceived,
                abilityUses: abilityCounts[p2UserId],
                cardsPlayed: cardCounts[p2UserId],
            },
        },
        performance: {
            [p1UserId]: computePerf('p1', p1UserId),
            [p2UserId]: computePerf('p2', p2UserId),
        },
    };
}

export async function submitReport(
    gameId: string,
    state: GameState,
    actions: ActionRecord[],
    userIdMapping: { p1?: string; p2?: string },
    matchType: 'quickplay' | 'ranked' = 'quickplay',
    initialDeployments?: InitialDeployment[],
): Promise<boolean> {
    const payload = computeReport(gameId, state, actions, userIdMapping, matchType, initialDeployments);
    if (!payload) {
        console.error(`[report] No se pudo computar reporte para ${gameId}`);
        return false;
    }

    const delays = [1_000, 5_000, 15_000];

    for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
            const res = await fetch(REPORT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': REPORT_API_KEY,
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const json = await res.json();
                console.log(`[report] Partida ${gameId} reportada:`, json);
                return true;
            }

            const text = await res.text();
            console.error(`[report] Intento ${attempt + 1} - Error ${res.status}: ${text}`);

            if (res.status === 400) {
                console.error(`[report] Error 400 no recuperable para ${gameId}, abortando`);
                return false;
            }
        } catch (err) {
            console.error(`[report] Intento ${attempt + 1} - Error de red para ${gameId}:`, err);
        }

        if (attempt < delays.length) {
            await new Promise((r) => setTimeout(r, delays[attempt]));
        }
    }

    console.error(`[report] Todos los reintentos fallaron para partida ${gameId}`);
    return false;
}
