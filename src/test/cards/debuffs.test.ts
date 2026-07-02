import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';
import { drawCard } from '../../shared/game/actions/card';
import type { GameState } from '../../shared/game/state';

console.log('\n--- Cards: DEBUFFS ---\n');

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
            u1: { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer' },
            u2: { id: 'u2', owner: 'p1', position: { q: 2, r: 0 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry' },
            u3: { id: 'u3', owner: 'p2', position: { q: 4, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry' },
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

// ── 6. Bajar moral (DEBUFF al oponente) ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['bajar_moral_1'] } } };
    const result = playCard(withCard, 'bajar_moral_1');

    const mod = getMod(result, 'ap');
    assert(mod?.value === -1, 'Bajar moral — ap -1');
    // sourcePlayerId should match the target (p2) since addModifier sets sourcePlayerId = targetPlayerId
    assert(result.effectDiscard.includes('bajar_moral_1'), 'Bajar moral — descartada');
}

// ── 7. Pantano (DEBUFF: movementCost ×2 al oponente) ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['pantano_1'] } } };
    const result = playCard(withCard, 'pantano_1');

    const mod = getMod(result, 'movementCost');
    assert(mod?.value === 2, 'Pantano — movementCost MUL 2');
    assert(mod?.operator === 'MUL', 'Pantano — operator MUL');
    assert(mod?.remainingUses === 1, 'Pantano — 1 uso');
    assert(result.effectDiscard.includes('pantano_1'), 'Pantano — descartada');
}

// ── 8. Mantenimiento (DEBUFF: damage -1 al oponente) ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['mantenimiento_1'] } } };
    const result = playCard(withCard, 'mantenimiento_1');

    const mod = getMod(result, 'attack');
    assert(mod?.value === -1, 'Mantenimiento — attack -1');
    assert(mod?.remainingUses === 1, 'Mantenimiento — 1 uso');
    assert(result.effectDiscard.includes('mantenimiento_1'), 'Mantenimiento — descartada');
}

// ── 9. Confusión (DEBUFF: blocked a unidad enemiga) ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['confusion_1'] } } };
    const result = playCard(withCard, 'confusion_1', 'u3');

    const mod = getMod(result, 'bloqueo');
    assert(mod?.value === 1, 'Confusión — bloqueo 1');
    assert(mod?.remainingTurns === 1, 'Confusión — 1 turno');
    assert(mod?.targetId === 'u3', 'Confusión — target u3');
    assert(result.effectDiscard.includes('confusion_1'), 'Confusión — descartada');
}

// ── 10. Miedo (DEBUFF: attackCost +1 al oponente) ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['miedo_1'] } } };
    const result = playCard(withCard, 'miedo_1');

    const mod = getMod(result, 'attackCost');
    assert(mod?.value === 1, 'Miedo — attackCost +1');
    assert(mod?.remainingUses === 1, 'Miedo — 1 uso');
    assert(result.effectDiscard.includes('miedo_1'), 'Miedo — descartada');
}
