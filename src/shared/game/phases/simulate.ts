import type { GameState, CardId } from '../state';
import { handleRoll } from './roll';
import { handleDeployment } from './deployment';

const POSITIONS_P1 = [
    {q:2,r:0},{q:2,r:-1},{q:2,r:-2},{q:3,r:-2},{q:3,r:-3},{q:3,r:-4},
    {q:4,r:-4},{q:4,r:-5},{q:4,r:-2},{q:3,r:-5},{q:2,r:-5}
];

const POSITIONS_P2 = [
    {q:-2,r:0},{q:-2,r:1},{q:-2,r:2},{q:-3,r:2},{q:-3,r:3},{q:-3,r:4},
    {q:-4,r:4},{q:-4,r:5},{q:-4,r:3},{q:-3,r:5},{q:-2,r:5}
];

function rollDice(state: GameState, playerId: string): GameState {
    return handleRoll(state, {
        type: 'ROLL_DICE',
        playerId: playerId as any,
    });
}

function deployAllForPlayer(state: GameState, playerId: string): GameState {
    const isP1 = playerId === 'p1';
    const positions = isP1 ? POSITIONS_P1 : POSITIONS_P2;
    let s = state;
    let deployed = 0;
    for (const pos of positions) {
        const pool = s.players[playerId]?.unitsToDeploy;
        if (!pool || pool.length === 0) break;
        const generalInPool = pool.find(e => e.unitClass === 'general');
        const generalsDeployed = Object.values(s.units).filter(u => u.owner === playerId && u.class === 'general').length;
        const entry = (generalInPool && deployed >= 10 && generalsDeployed === 0) ? generalInPool : pool[0];
        const next = handleDeployment(s, {
            type: 'DEPLOY_UNIT',
            playerId: playerId as any,
            unitId: entry.unitId,
            position: pos,
        });
        if (next === s) break;
        s = next;
        deployed++;
    }
    return s;
}

export function simulatePreparation(state: GameState): GameState {
    let s = state;

    // 1. Force identities — Comandante Supremo for P1, Inspiración Real for P2
    const allCards = [
        ...(s.players.p1?.identityCards ?? []),
        ...(s.players.p2?.identityCards ?? []),
        ...s.identityDeck,
    ];
    const remaining = allCards.filter(
        id => id !== 'comandante_supremo_1' && id !== 'inspiracion_real_1'
    );
    s = {
        ...s,
        identityDeck: remaining,
        players: {
            ...s.players,
            p1: {
                ...s.players.p1!,
                selectedIdentity: 'comandante_supremo_1' as CardId,
                identityCards: [],
                revealedIdentity: true,
            },
            p2: {
                ...s.players.p2!,
                selectedIdentity: 'inspiracion_real_1' as CardId,
                identityCards: [],
                revealedIdentity: true,
            },
        },
        preparationPhase: 'ROLL',
    };

    // 2. Roll dice for both, handle ties
    let rollAttempts = 0;
    while (s.preparationPhase === 'ROLL' && rollAttempts < 50) {
        const p1Rolled = s.diceRolls.p1 !== undefined;
        const p2Rolled = s.diceRolls.p2 !== undefined;
        if (!p1Rolled) {
            s = rollDice(s, 'p1');
            continue;
        }
        if (!p2Rolled) {
            s = rollDice(s, 'p2');
            continue;
        }
        if (s.diceRolls.p1 === s.diceRolls.p2) {
            // Tie — lastTieRoll set, both rolls consumed, loop resets
            continue;
        }
        break;
    }

    // 3. Deploy all units
    // Deployment alternates: step 0→order[0] places 1, step 1→order[1] places 2, etc.
    const order0 = s.deploymentOrder![0];
    const order1 = s.deploymentOrder![1];
    const targetPerStep = [1,2,2,2,2,2,2,2,2,2,2,1];
    let p0Count = 0, p1Count = 0;

    for (let step = 0; step < 12; step++) {
        const player = step % 2 === 0 ? order0 : order1;
        const target = targetPerStep[step];
        const positions = player === 'p1' ? POSITIONS_P1 : POSITIONS_P2;
        const idx = player === 'p1' ? p0Count : p1Count;
        let remaining = target;
        for (let j = 0; j < target; j++) {
            const posIdx = (player === 'p1' ? p0Count : p1Count);
            const pool = s.players[player]?.unitsToDeploy;
            if (!pool || pool.length === 0) { remaining = j; break; }
            const generalInPool = pool.find(e => e.unitClass === 'general');
            const deployed = s.players[player]?.deployedUnits?.length ?? 0;
            const generalsDeployed = Object.values(s.units).filter(u => u.owner === player && u.class === 'general').length;
            const entry = (generalInPool && deployed >= 10 && generalsDeployed === 0) ? generalInPool : pool[0];
            const next = handleDeployment(s, {
                type: 'DEPLOY_UNIT',
                playerId: player as any,
                unitId: entry.unitId,
                position: positions[posIdx],
            });
            if (next === s) { remaining = j; break; }
            s = next;
            if (player === 'p1') p0Count++; else p1Count++;
        }
    }

    return s;
}
