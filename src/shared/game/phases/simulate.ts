import type { GameState, CardId } from '../state';
import { handleRoll } from './roll';
import { handleDeployment } from './deployment';

// 7 centrales vacías (distancia ≤ 1)
// Primera línea (6 hex): general + 5 unidades, una de cada clase
// Segunda línea (5 hex): tras la primera
const POSITIONS_P1_FIRST = [
    {q:2,r:-2},{q:2,r:0},{q:2,r:-1},{q:1,r:-2},{q:0,r:-2},{q:-1,r:-1}
];
const POSITIONS_P1_SECOND = [
    {q:3,r:-2},{q:3,r:0},{q:3,r:-1},{q:3,r:-3},{q:2,r:-3}
];

const POSITIONS_P2_FIRST = [
    {q:-2,r:2},{q:-2,r:0},{q:-2,r:1},{q:-1,r:2},{q:0,r:2},{q:1,r:1}
];
const POSITIONS_P2_SECOND = [
    {q:-3,r:2},{q:-3,r:0},{q:-3,r:1},{q:-3,r:3},{q:-2,r:3}
];

function rollDice(state: GameState, playerId: string): GameState {
    return handleRoll(state, {
        type: 'ROLL_DICE',
        playerId: playerId as any,
    });
}

function buildDeployOrder(pool: Array<{ unitId: string; unitClass: string }>): Array<{ unitId: string; unitClass: string }> {
    const remaining = [...pool];
    const order: Array<{ unitId: string; unitClass: string }> = [];

    // Primera línea: general + una de cada clase
    const firstLineClasses = ['general', 'cavalry', 'lancer', 'infantry', 'archer'];
    for (const cls of firstLineClasses) {
        const idx = remaining.findIndex(e => e.unitClass === cls);
        if (idx !== -1) {
            order.push(remaining[idx]);
            remaining.splice(idx, 1);
        }
    }
    // 6° puesto de primera línea: cualquier clase restante
    if (remaining.length > 0) {
        order.push(remaining[0]);
        remaining.splice(0, 1);
    }
    // Segunda línea: resto de unidades (arqueros primero para que vayan a posiciones cercanas)
    remaining.sort((a, b) => {
        if (a.unitClass === 'archer' && b.unitClass !== 'archer') return -1;
        if (a.unitClass !== 'archer' && b.unitClass === 'archer') return 1;
        return 0;
    });
    for (const e of remaining) order.push(e);
    return order;
}

function deployAllForPlayer(state: GameState, playerId: string): GameState {
    const isP1 = playerId === 'p1';
    const firstPositions = isP1 ? POSITIONS_P1_FIRST : POSITIONS_P2_FIRST;
    const secondPositions = isP1 ? POSITIONS_P1_SECOND : POSITIONS_P2_SECOND;
    const pool = state.players[playerId]?.unitsToDeploy;
    if (!pool) return state;

    const deployOrder = buildDeployOrder(pool);
    const allPositions = [...firstPositions, ...secondPositions];

    let s = state;
    for (let i = 0; i < Math.min(deployOrder.length, allPositions.length); i++) {
        const entry = deployOrder[i];
        const next = handleDeployment(s, {
            type: 'DEPLOY_UNIT',
            playerId: playerId as any,
            unitId: entry.unitId,
            position: allPositions[i],
        });
        if (next === s) continue;
        s = next;
    }
    return s;
}

export function simulatePreparation(state: GameState): GameState {
    let s = state;

    // 1. Si el jugador ya seleccionó identidad, respetarla; si no, forzar defaults
    if (!s.players.p1?.selectedIdentity) {
        const p1Cards = [...(s.players.p1?.identityCards ?? []), ...s.identityDeck];
        const p1Remaining = p1Cards.filter(id => id !== 'dios_trueno_1');
        s = {
            ...s,
            identityDeck: p1Remaining,
            players: {
                ...s.players,
                p1: {
                    ...s.players.p1!,
                    selectedIdentity: 'dios_trueno_1' as CardId,
                    identityCards: [],
                    revealedIdentity: true,
                },
            },
        };
    }
    if (!s.players.p2?.selectedIdentity) {
        const p2Cards = [...(s.players.p2?.identityCards ?? []), ...s.identityDeck];
        const p2Remaining = p2Cards.filter(id => id !== 'escudo_comandante_1');
        s = {
            ...s,
            identityDeck: p2Remaining,
            players: {
                ...s.players,
                p2: {
                    ...s.players.p2!,
                    selectedIdentity: 'escudo_comandante_1' as CardId,
                    identityCards: [],
                    revealedIdentity: true,
                },
            },
        };
    }
    s = { ...s, preparationPhase: 'ROLL' };

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

    // 3. Deploy all units — alternando jugadores (respeta currentDeployingPlayer + targetPerStep)
    const p1Order = buildDeployOrder(s.players.p1?.unitsToDeploy ?? []);
    const p2Order = buildDeployOrder(s.players.p2?.unitsToDeploy ?? []);
    const allPositions: Record<string, {q:number;r:number}[]> = {
        p1: [...POSITIONS_P1_FIRST, ...POSITIONS_P1_SECOND],
        p2: [...POSITIONS_P2_FIRST, ...POSITIONS_P2_SECOND],
    };
    const targetPerStep = [1,2,2,2,2,2,2,2,2,2,2,1];
    let p1Idx = 0, p2Idx = 0;

    for (let step = 0; step < 12; step++) {
        const player = s.deploymentOrder![step % 2];
        const target = targetPerStep[step];
        for (let j = 0; j < target; j++) {
            const order = player === 'p1' ? p1Order : p2Order;
            const idx = player === 'p1' ? p1Idx : p2Idx;
            if (idx >= order.length || idx >= allPositions[player].length) break;

            const next = handleDeployment(s, {
                type: 'DEPLOY_UNIT',
                playerId: player as any,
                unitId: order[idx].unitId,
                position: allPositions[player][idx],
            });
            if (next === s) break;
            s = next;
            if (player === 'p1') p1Idx++; else p2Idx++;
        }
    }

    // Mover cartas específicas al principio del mazo para testeo rápido
    const TEST_CARD_KEYS = ['espejo', 'confusion'];
    let deck2 = s.effectDeck;
    for (const key of TEST_CARD_KEYS) {
        const testCards = deck2.filter((c: string) => c.startsWith(key + '_'));
        const rest2 = deck2.filter((c: string) => !c.startsWith(key + '_'));
        deck2 = [...testCards, ...rest2];
    }
    s = { ...s, effectDeck: deck2 };

    return s;
}
