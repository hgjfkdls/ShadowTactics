import { assert, assertEqual } from './shared';
import { createInitialGameState } from '../shared/game/init';
import { applyAction } from '../shared/game/reducer';
import { drawCard } from '../shared/game/actions/card';
import type { GameState } from '../shared/game/state';

console.log('\n--- Card Effects ---\n');

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

// ── 2. Ataque extra ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['ataque_extra_1'] } } };
    const result = playCard(withCard, 'ataque_extra_1');

    const atk = result.activeModifiers.filter(m => m.stat === 'attack');
    assert(atk.length > 0 && atk.some(m => m.value === 1), 'Ataque extra — attack +1');
    const diff = result.activeModifiers.filter(m => m.stat === 'difficulty');
    assert(diff.length > 0 && diff.some(m => m.value === 2), 'Ataque extra — difficulty +2');
    assert(result.effectDiscard.includes('ataque_extra_1'), 'Ataque extra — descartada');
}

// ── 3. Precisión ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['precision_1'] } } };
    const result = playCard(withCard, 'precision_1');

    const mod = getMod(result, 'difficulty');
    assert(mod?.value === -2, 'Precisión — difficulty -2');
    assert(result.effectDiscard.includes('precision_1'), 'Precisión — descartada');
}

// ── 4. Flechas de fuego ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['flechas_fuego_1'] } } };
    const result = playCard(withCard, 'flechas_fuego_1');

    const dmg = getMod(result, 'damage');
    assert(dmg?.value === 1, 'Flechas fuego — damage +1');
    assert(dmg?.remainingTurns === 0, 'Flechas fuego — sin duración por turnos');
    assert(dmg?.remainingUses === 1, 'Flechas fuego — 1 uso (próximo ataque)');

    const dot = getMod(result, 'dotOnHit');
    assert(dot?.value === 1, 'Flechas fuego — dotOnHit +1');
    assert(dot?.remainingUses === 1, 'Flechas fuego — dotOnHit 1 uso');

    assert(result.effectDiscard.includes('flechas_fuego_1'), 'Flechas fuego — descartada');
}

// ── 5. Inspiración de tropa ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['inspiracion_tropa_1'] } } };
    const result = playCard(withCard, 'inspiracion_tropa_1');

    const mod = getMod(result, 'ap');
    assert(mod?.value === 1, 'Inspiración — ap +1');
    assert(mod?.remainingTurns === 1, 'Inspiración — 1 turno');
    assert(result.effectDiscard.includes('inspiracion_tropa_1'), 'Inspiración — descartada');
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

    const mod = getMod(result, 'damage');
    assert(mod?.value === -1, 'Mantenimiento — damage -1');
    assert(mod?.remainingUses === 1, 'Mantenimiento — 1 uso');
    assert(result.effectDiscard.includes('mantenimiento_1'), 'Mantenimiento — descartada');
}

// ── 9. Confusión (DEBUFF: blocked a unidad enemiga) ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['confusion_1'] } } };
    const result = playCard(withCard, 'confusion_1', 'u3');

    const mod = getMod(result, 'blocked');
    assert(mod?.value === 1, 'Confusión — blocked 1');
    assert(mod?.remainingTurns === 1, 'Confusión — 1 turno');
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

// ── 11. Panacea (COUNTER: elimina debuffs propios, solo contra DEBUFF) ──
{
    const state = makeState();
    // COUNTER phase: p1 jugó DEBUFF, p2 tiene Panacea y debuffs propios
    let s: GameState = {
        ...state,
        turnPhase: 'COUNTER',
        lastCardAction: { cardId: 'bajar_moral_1', playerId: 'p1' },
        players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: [] },
            p2: { ...state.players['p2'], cardsInHand: ['panacea_1'] },
        },
        activeModifiers: [{ id: 'debuff_1', sourcePlayerId: 'p2', stat: 'ap', value: -1, operator: 'ADD', remainingTurns: 1 }]
    };

    const result = applyAction(s, {
        type: 'USE_CARD',
        playerId: 'p2',
        cardId: 'panacea_1'
    });

    assert(result.activeModifiers.length === 0, 'Panacea — debuffs de p2 eliminados');
    assert(result.effectDiscard.includes('panacea_1'), 'Panacea — descartada');
    assertEqual(result.turnPhase, 'MAIN',
        'Panacea — vuelve a MAIN');
    assertEqual(result.activePlayer, 'p1',
        'Panacea — activePlayer sigue siendo p1');
}

// ── 12. Ladrón (COUNTER: roba carta pendiente) ──
{
    const state = makeState();
    const withCard: GameState = { ...state, players: { ...state.players, p1: { ...state.players['p1'], cardsInHand: ['movilidad_1'] }, p2: { ...state.players['p2'], cardsInHand: ['ladron_1'] } } };

    // p1 juega movilidad → pendiente → COUNTER
    const afterPlay = applyAction(withCard, {
        type: 'USE_CARD',
        playerId: 'p1',
        cardId: 'movilidad_1'
    });

    assert(afterPlay.turnPhase === 'COUNTER', 'Ladrón setup — fase COUNTER');
    assert(afterPlay.lastCardAction?.cardId === 'movilidad_1', 'Ladrón setup — carta pendiente');

    // p2 (rival) responde con Ladrón durante COUNTER — activePlayer sigue siendo p1
    const ladronResult = applyAction(afterPlay, {
        type: 'USE_CARD',
        playerId: 'p2',
        cardId: 'ladron_1'
    });

    // Ladrón roba movilidad_1 (la carta pendiente)
    assert(ladronResult.players['p2'].cardsInHand?.includes('movilidad_1'),
        'Ladrón — carta robada está en mano de p2');
    assert(ladronResult.lastCardAction === undefined,
        'Ladrón — pendiente limpiado');
    assert(ladronResult.effectDiscard.includes('ladron_1'),
        'Ladrón — descartada');
    assert(ladronResult.effectDiscard.includes('movilidad_1'),
        'Ladrón — carta original descartada');
    assertEqual(ladronResult.turnPhase, 'MAIN',
        'Ladrón — vuelve a MAIN');
    assertEqual(ladronResult.activePlayer, 'p1',
        'Ladrón — activePlayer sigue siendo p1');
}

// ── 13. Espejo (COUNTER: refleja debuff al emisor) ──
{
    const state = makeState();

    // Estado: p1 es activo, jugó bajar_moral (pendiente), p2 tiene Espejo
    const espejoState: GameState = {
        ...state,
        activePlayer: 'p1',
        turnPhase: 'COUNTER',
        lastCardAction: { cardId: 'bajar_moral_1', playerId: 'p1' },
        players: {
            p1: { ...state.players['p1'], cardsInHand: [] },
            p2: { ...state.players['p2'], cardsInHand: ['espejo_1'], actionPoints: 5 }
        }
    };

    // p2 (rival) responde con Espejo durante COUNTER
    const result = applyAction(espejoState, {
        type: 'USE_CARD',
        playerId: 'p2',
        cardId: 'espejo_1'
    });

    // El debuff (bajar_moral: ap -1) debería haberse aplicado a p1 (el emisor original)
    const mod = getMod(result, 'ap');
    assert(mod?.value === -1, 'Espejo — ap -1 reflejado al emisor');
    assert(result.lastCardAction === undefined, 'Espejo — pendiente limpiado');
    assert(result.effectDiscard.includes('espejo_1'), 'Espejo — descartada');
    assertEqual(result.turnPhase, 'MAIN',
        'Espejo — vuelve a MAIN');
    assertEqual(result.activePlayer, 'p1',
        'Espejo — activePlayer sigue siendo p1');
}

// ── 14. Límite de mano: drawCard con 3 cartas → pool de 4, jugador elige ──
{
    const state = makeState();
    const fullHand: GameState = {
        ...state,
        players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['movilidad_1', 'precision_1', 'ataque_extra_1'] }
        },
        effectDeck: ['bajar_moral_1', 'pantano_1', 'mantenimiento_1']
    };

    const afterDraw = { ...drawCard(fullHand, 'p1'), turnPhase: 'DRAW' as const };

    // La carta nueva ya está en mano (pool de 4)
    assertEqual(afterDraw.players['p1'].cardsInHand?.length, 4,
        'Límite mano — mano tiene 4 cartas (pool completo)');
    assert(afterDraw.players['p1'].cardsInHand?.includes('bajar_moral_1'),
        'Límite mano — bajar_moral_1 ya está en mano');
    assertEqual(afterDraw.effectDeck[0], 'pantano_1',
        'Límite mano — mazo avanzó');

    // Descartar una carta existente de la mano (pool de 4 → 3)
    const discardOld = applyAction(afterDraw, {
        type: 'DISCARD_CARD', playerId: 'p1', cardId: 'movilidad_1'
    });

    assertEqual(discardOld.players['p1'].cardsInHand?.length, 3,
        'DISCARD_CARD — mano vuelve a 3');
    assert(!discardOld.players['p1'].cardsInHand?.includes('movilidad_1'),
        'DISCARD_CARD — movilidad_1 descartada');
    assert(discardOld.players['p1'].cardsInHand?.includes('bajar_moral_1'),
        'DISCARD_CARD — bajar_moral_1 se conserva');
    assert(discardOld.players['p1'].cardsInHand?.includes('precision_1'),
        'DISCARD_CARD — precision_1 se conserva');
    assert(discardOld.players['p1'].cardsInHand?.includes('ataque_extra_1'),
        'DISCARD_CARD — ataque_extra_1 se conserva');
    assert(discardOld.effectDiscard.includes('movilidad_1'),
        'DISCARD_CARD — movilidad_1 fue a effectDiscard');
    assertEqual(discardOld.turnPhase, 'MAIN',
        'DISCARD_CARD — turnPhase pasa a MAIN');
}

{
    // También puede descartar la carta recién robada (mismo pool de 4)
    const state = makeState();
    const fullHand: GameState = {
        ...state,
        activePlayer: 'p1',
        players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['movilidad_1', 'precision_1', 'ataque_extra_1'] }
        },
        effectDeck: ['bajar_moral_1', 'pantano_1', 'mantenimiento_1']
    };

    const afterDraw = { ...drawCard(fullHand, 'p1'), turnPhase: 'DRAW' as const };
    assertEqual(afterDraw.players['p1'].cardsInHand?.length, 4,
        'Límite mano — pool de 4 antes de descartar');

    const discardNew = applyAction(afterDraw, {
        type: 'DISCARD_CARD', playerId: 'p1', cardId: 'bajar_moral_1'
    });

    assertEqual(discardNew.players['p1'].cardsInHand?.length, 3,
        'DISCARD_CARD (nueva) — mano vuelve a 3');
    assert(!discardNew.players['p1'].cardsInHand?.includes('bajar_moral_1'),
        'DISCARD_CARD (nueva) — bajar_moral_1 descartada');
    assert(discardNew.players['p1'].cardsInHand?.includes('movilidad_1'),
        'DISCARD_CARD (nueva) — movilidad_1 se conserva');
    assert(discardNew.effectDiscard.includes('bajar_moral_1'),
        'DISCARD_CARD (nueva) — bajar_moral_1 fue a effectDiscard');
    assertEqual(discardNew.turnPhase, 'MAIN',
        'DISCARD_CARD (nueva) — turnPhase pasa a MAIN');
}

{
    // Acciones bloqueadas durante DRAW con mano llena
    const state = makeState();
    const fullHand: GameState = {
        ...state,
        activePlayer: 'p1',
        turnPhase: 'DRAW',
        players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['movilidad_1', 'precision_1', 'ataque_extra_1'] }
        },
        effectDeck: ['bajar_moral_1', 'pantano_1', 'mantenimiento_1']
    };
    const afterDraw = { ...drawCard(fullHand, 'p1'), turnPhase: 'DRAW' as const };
    assertEqual(afterDraw.players['p1'].cardsInHand?.length, 4,
        'Bloqueo — pool de 4');

    // MOVE_UNIT debe ser rechazado durante DRAW con mano llena
    const blocked = applyAction(afterDraw, {
        type: 'MOVE_UNIT', playerId: 'p1', unitId: 'u1', to: { q: 1, r: 0 }
    });
    assert(blocked === afterDraw,
        'Bloqueo — MOVE_UNIT rechazado durante DRAW con mano llena');
}

// ── 15. Restricción COUNTER: activo no puede jugar cartas ──
{
    const state = makeState();
    // p1 (activo) juega una BUFF → COUNTER
    const withCard: GameState = {
        ...state,
        players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['movilidad_1', 'panacea_1'] },
        }
    };
    const afterBuff = applyAction(withCard, {
        type: 'USE_CARD', playerId: 'p1', cardId: 'movilidad_1'
    });
    assertEqual(afterBuff.turnPhase, 'COUNTER', 'Restricción COUNTER — setup fase COUNTER');

    // p1 (activo) intenta jugar Panacea durante su propio COUNTER → rechazado
    const blocked = applyAction(afterBuff, {
        type: 'USE_CARD', playerId: 'p1', cardId: 'panacea_1'
    });
    assert(blocked === afterBuff,
        'Restricción COUNTER — activo no puede jugar COUNTER cards');
}

// ── 16. Panacea desde COUNTER por el rival (válido solo contra DEBUFF) ──
{
    const state = makeState();
    // p1 activo juega DEBUFF → COUNTER. p2 tiene panacea_1 y debuffs propios.
    const withCard: GameState = {
        ...state,
        players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['bajar_moral_1'] },
            p2: { ...state.players['p2'], cardsInHand: ['panacea_1'] },
        },
        activeModifiers: [{ id: 'debuff_p2', sourcePlayerId: 'p2', stat: 'ap', value: -1, operator: 'ADD', remainingTurns: 1 }]
    };
    const afterDebuff = applyAction(withCard, {
        type: 'USE_CARD', playerId: 'p1', cardId: 'bajar_moral_1'
    });
    assertEqual(afterDebuff.turnPhase, 'COUNTER', 'Panacea COUNTER rival — setup fase COUNTER');
    assert(afterDebuff.lastCardAction?.cardId === 'bajar_moral_1', 'setup — carta pendiente es DEBUFF');

    // p2 (rival) juega Panacea durante COUNTER
    const result = applyAction(afterDebuff, {
        type: 'USE_CARD', playerId: 'p2', cardId: 'panacea_1'
    });

    assert(result.activeModifiers.length === 0,
        'Panacea COUNTER rival — debuffs de p2 eliminados');
    assert(result.effectDiscard.includes('panacea_1'),
        'Panacea COUNTER rival — descartada');
    assertEqual(result.turnPhase, 'MAIN',
        'Panacea COUNTER rival — vuelve a MAIN');
    assertEqual(result.activePlayer, 'p1',
        'Panacea COUNTER rival — activePlayer sigue siendo p1');
}

// ── 17. Espejo contra BUFF → rechazado ──
{
    const state = makeState();
    const withCard: GameState = {
        ...state,
        players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['movilidad_1'] },
            p2: { ...state.players['p2'], cardsInHand: ['espejo_1'] },
        }
    };
    const afterBuff = applyAction(withCard, {
        type: 'USE_CARD', playerId: 'p1', cardId: 'movilidad_1'
    });
    assertEqual(afterBuff.turnPhase, 'COUNTER', 'Espejo vs BUFF — setup COUNTER');

    // p2 intenta Espejo contra BUFF → rechazado
    const blocked = applyAction(afterBuff, {
        type: 'USE_CARD', playerId: 'p2', cardId: 'espejo_1'
    });
    assert(blocked === afterBuff,
        'Espejo vs BUFF — rechazado');
}

// ── 18. Panacea contra BUFF → rechazado ──
{
    const state = makeState();
    const withCard: GameState = {
        ...state,
        players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['movilidad_1'] },
            p2: { ...state.players['p2'], cardsInHand: ['panacea_1'] },
        }
    };
    const afterBuff = applyAction(withCard, {
        type: 'USE_CARD', playerId: 'p1', cardId: 'movilidad_1'
    });
    assertEqual(afterBuff.turnPhase, 'COUNTER', 'Panacea vs BUFF — setup COUNTER');

    // p2 intenta Panacea contra BUFF → rechazado
    const blocked = applyAction(afterBuff, {
        type: 'USE_CARD', playerId: 'p2', cardId: 'panacea_1'
    });
    assert(blocked === afterBuff,
        'Panacea vs BUFF — rechazado');
}
