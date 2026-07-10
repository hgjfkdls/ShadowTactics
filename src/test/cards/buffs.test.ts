import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';
import { drawCard } from '../../shared/game/actions/card';
import type { GameState } from '../../shared/game/state';

console.log('\n--- Cards: BUFFS ---\n');

function makeState(): GameState {
    let s = createInitialGameState();
    s = {
        ...s,
        gamePhase: 'GAME',
        turnPhase: 'MAIN',
        activePlayer: 'p1',
        players: {
            p1: { ...s.players['p1'], actionPoints: 10, cardsInHand: [] },
            p2: { ...s.players['p2'], actionPoints: 5, cardsInHand: [] },
        },
        units: {
            u1: { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer', flags: [] },
            u2: { id: 'u2', owner: 'p1', position: { q: 2, r: 0 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry', flags: [] },
            u3: { id: 'u3', owner: 'p2', position: { q: 4, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', flags: [] },
        }
    };
    return s;
}

// Helper: play a BUFF/DEBUFF card through COUNTER phase
function playCard(state: GameState, cardId: string, targetId?: string): GameState {
    const afterUse = applyAction(state, {
        type: 'USE_CARD',
        playerId: 'p1',
        cardId,
        targetId
    });
    const afterPass = applyAction(afterUse, {
        type: 'PASS_COUNTER',
        playerId: 'p2'
    });
    return afterPass;
}

function hasMod(state: GameState, stat: string): boolean {
    return state.activeModifiers.some(m => m.stat === stat);
}

function getMod(state: GameState, stat: string) {
    return state.activeModifiers.find(m => m.stat === stat);
}

// ── 1. Movilidad ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['movilidad_1'] } } };
    const result = playCard(withCard, 'movilidad_1');

    assert(hasMod(result, 'movementCost'), 'Movilidad — modifier movementCost creado');
    const mod = getMod(result, 'movementCost');
    assert(mod?.value === 0, 'Movilidad — value 0');
    assert(mod?.operator === 'SET', 'Movilidad — operator SET');
    assert(mod?.remainingUses === 1, 'Movilidad — 1 uso');
    assert(result.effectDiscard.includes('movilidad_1'), 'Movilidad — descartada');
}

// ── 2. Ataque extra (acumula cargas en la unidad objetivo) ──
{
    const state = makeState();
    const withCard: GameState = {
        ...state,
        players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['ataque_extra_1'] } },
        units: { ...state.units, u1: { ...state.units['u1'], flags: ['basic_attack'] } },
    };
    const result = playCard(withCard, 'ataque_extra_1', 'u1');

    const u = result.units['u1'];
    const atkMod = result.activeModifiers.find(m => m.stat === 'attack' && m.targetId === 'u1');
    const diffMod = result.activeModifiers.find(m => m.stat === 'difficulty' && m.targetId === 'u1');
    const costMod = result.activeModifiers.find(m => m.stat === 'attackCost' && m.targetId === 'u1');
    assert(atkMod?.value === 1, 'Ataque extra — attack +1');
    assert(atkMod?.remainingUses === 1, 'Ataque extra — attack 1 uso');
    assert(diffMod?.value === 2, 'Ataque extra — difficulty +2');
    assert(diffMod?.remainingUses === 1, 'Ataque extra — difficulty 1 uso');
    assert(costMod?.value === 0, 'Ataque extra — attackCost 0');
    assert(costMod?.operator === 'SET', 'Ataque extra — attackCost SET');
    assert(costMod?.remainingUses === 1, 'Ataque extra — attackCost 1 uso');
    assert(!(u.flags ?? []).includes('basic_attack'), 'Ataque extra — flag basic_attack reseteado');
    assert(result.effectDiscard.includes('ataque_extra_1'), 'Ataque extra — descartada');
}

// ── 3. Precisión (acumula cargas en la unidad objetivo) ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['precision_1'] } } };
    const result = playCard(withCard, 'precision_1', 'u1');

    const u = result.units['u1'];
    assert(u.precisionCharges === 1, 'Precisión — 1 carga en u1');
    assert(result.effectDiscard.includes('precision_1'), 'Precisión — descartada');
}

// ── 4. Flechas de fuego ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['flechas_fuego_1'] } } };
    const result = playCard(withCard, 'flechas_fuego_1', 'u1');

    const dmg = getMod(result, 'attack');
    assert(dmg?.value === 1, 'Flechas fuego — attack +1');
    assert(dmg?.remainingTurns === 0, 'Flechas fuego — sin duración por turnos');
    assert(dmg?.remainingUses === 1, 'Flechas fuego — 1 uso (próximo ataque)');
    assert(dmg?.targetId === 'u1', 'Flechas fuego — attack en u1');

    const dot = getMod(result, 'dotOnHit');
    assert(dot?.value === 1, 'Flechas fuego — dotOnHit +1');
    assert(dot?.remainingUses === 1, 'Flechas fuego — dotOnHit 1 uso');
    assert(dot?.targetId === 'u1', 'Flechas fuego — dotOnHit en u1');

    assert(result.effectDiscard.includes('flechas_fuego_1'), 'Flechas fuego — descartada');
}

// ── 5. Inspiración de tropa (PA directo, sin modifier) ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['inspiracion_tropa_1'] } } };
    const result = playCard(withCard, 'inspiracion_tropa_1');

    assert(result.players['p1'].actionPoints === 11, 'Inspiración — ap 10+1 = 11');
    assert(result.effectDiscard.includes('inspiracion_tropa_1'), 'Inspiración — descartada');

    // Rechazada si el general fue atacado el turno anterior
    const attacked: GameState = { ...withCard, players: { ...withCard.players, p1: { ...withCard.players['p1'], generalWasAttackedLastTurn: true, cardsInHand: ['inspiracion_tropa_1'] } } } as GameState;
    const rejected = applyAction(attacked, { type: 'USE_CARD', playerId: 'p1', cardId: 'inspiracion_tropa_1' });
    assert(rejected.lastCardRejectionReason !== undefined, 'Inspiración — rechazada si general atacado');
    assert(rejected.players['p1'].cardsInHand?.includes('inspiracion_tropa_1'), 'Inspiración — carta no se consume');
}
