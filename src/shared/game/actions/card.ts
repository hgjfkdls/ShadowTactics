import type { GameState, CardId } from '../state';
import type { GameAction } from '../action-types';
import { nextRandom } from '../utils/rng';
import { addModifier, removePlayerDebuffs } from '../modifiers/engine';

// ── 15 cartas de identidad ──

const IDENTITY_KEYS: string[] = [
    'robin_hood',
    'francotirador',
    'dios_trueno',
    'capitan_guardia',
    'caballos_guerra',
    'cazadores',
    'punta_lanza',
    'espartano',
    'monje_shaolin',
    'corazon_estratega',
    'comandante_supremo',
    'inspiracion_real',
    'furia_tirano',
    'samurai',
    'escudo_comandante',
];

export function buildIdentityDeck(seed: number): { deck: CardId[]; seed: number } {
    const cards: CardId[] = IDENTITY_KEYS.map(key => `${key}_1`);
    const result = shuffleArray(cards, seed);
    return { deck: result.shuffled, seed: result.seed };
}

type CardTemplate = {
    name: string;
    type: 'BUFF' | 'DEBUFF' | 'COUNTER';
    description: string;
};

const CARD_TEMPLATES: Record<string, CardTemplate> = {
    movilidad:         { name: 'Movilidad',         type: 'BUFF',    description: 'El siguiente movimiento de una unidad cuesta 0 PA.' },
    ataque_extra:      { name: 'Ataque extra',       type: 'BUFF',    description: 'Reinicia el ataque básico de una unidad aliada. El siguiente ataque básico no cuesta PA, tiene +1 de daño y +2 de dificultad. Los bonos se consumen al atacar (acierte o no). Si usa una habilidad, los bonos no se aplican.' },
    precision:         { name: 'Precisión',          type: 'BUFF',    description: '-2 dificultad al siguiente ataque básico de una unidad aliada. Se consume al atacar (acierte o no). Si usa una habilidad, el bono no se aplica.' },
    flechas_fuego:     { name: 'Flechas de fuego',   type: 'BUFF',    description: 'El siguiente ataque del jugador inflige +1 de daño. Además, el objetivo recibe 1 de daño pasivo al inicio de los 2 siguientes turnos del jugador.' },
    inspiracion_tropa: { name: 'Inspiración de tropa',type: 'BUFF',   description: '+1 PA.' },
    bajar_moral:       { name: 'Bajar la moral',     type: 'DEBUFF',  description: '-1 PA al oponente en su siguiente turno.' },
    pantano:           { name: 'Pantano',            type: 'DEBUFF',  description: 'El primer movimiento del oponente cuesta el doble de PA en su siguiente turno.' },
    mantenimiento:     { name: 'Mantenimiento de equipo', type: 'DEBUFF', description: 'El primer ataque del oponente hace -1 de daño en su siguiente turno.' },
    confusion:         { name: 'Confusión en la retaguardia', type: 'DEBUFF', description: 'Una unidad enemiga elegida no puede mover ni atacar en su próximo turno.' },
    miedo:             { name: 'Miedo',              type: 'DEBUFF',  description: 'El primer ataque del oponente cuesta +1 PA en su siguiente turno.' },
    panacea:           { name: 'Panacea',            type: 'COUNTER', description: 'Cancela el debuff que acaba de jugar el oponente.' },
    ladron:            { name: 'Ladrón',             type: 'COUNTER', description: 'Juega cuando el rival juegue una carta. La carta pendiente pasa a tu mano y puedes usarla en tu turno.' },
    espejo:            { name: 'Espejo',             type: 'COUNTER', description: 'Júgala cuando el rival juegue un debuff. El debuff se refleja y aplica al rival.' },
};

import { l } from '@shared/i18n';

export function getCardKey(cardId: CardId): string {
    return getKey(cardId);
}

function cardI18nKey(cardId: CardId): string {
    return `card.${getKey(cardId)}`;
}

export function getCardName(cardId: CardId): string {
    const translated = l(`${cardI18nKey(cardId)}.name`);
    if (translated && translated !== `${cardI18nKey(cardId)}.name`) return translated;
    return CARD_TEMPLATES[getKey(cardId)]?.name ?? cardId;
}

export function getCardType(cardId: CardId): 'BUFF' | 'DEBUFF' | 'COUNTER' | undefined {
    return CARD_TEMPLATES[getKey(cardId)]?.type;
}

export function getCardDescription(cardId: CardId): string {
    const translated = l(`${cardI18nKey(cardId)}.desc`);
    if (translated && translated !== `${cardI18nKey(cardId)}.desc`) return translated;
    return CARD_TEMPLATES[getKey(cardId)]?.description ?? '';
}

function getKey(cardId: CardId): string {
    // Encontrar el key de plantilla más largo que coincida con el inicio del cardId
    const sorted = [...TEMPLATE_KEYS].sort((a, b) => b.length - a.length);
    for (const key of sorted) {
        if (cardId.startsWith(key + '_')) return key;
    }
    return cardId.split('_')[0];
}

const TEMPLATE_KEYS = Object.keys(CARD_TEMPLATES);

export function buildEffectDeck(seed: number): { deck: CardId[]; seed: number } {
    const cards: CardId[] = [];
    for (const key of TEMPLATE_KEYS) {
        for (let copy = 1; copy <= 4; copy++) {
            cards.push(`${key}_${copy}`);
        }
    }
    const result = shuffleArray(cards, seed);
    return { deck: result.shuffled, seed: result.seed };
}

export function getCardDescriptionBySourceName(name: string): string | undefined {
    for (const [key, tmpl] of Object.entries(CARD_TEMPLATES)) {
        if (tmpl.name === name) return tmpl.description;
    }
    return undefined;
}

export function shuffleArray<T>(arr: T[], seed: number): { shuffled: T[]; seed: number } {
    const shuffled = [...arr];
    let s = seed;
    for (let i = shuffled.length - 1; i > 0; i--) {
        const { value, seed: newSeed } = nextRandom(s);
        s = newSeed;
        const j = value % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return { shuffled, seed: s };
}

export function drawCard(state: GameState, playerId: string): GameState {
    const deck = state.effectDeck;
    if (deck.length === 0) return state;

    const drawn = deck[0];
    const rest = deck.slice(1);

    const player = state.players[playerId];
    const hand = [...(player.cardsInHand || []), drawn];

    if (hand.length > 3) {
        // Mano llena: la carta entra igual (pool de 4), el jugador debe descartar una
        return {
            ...state,
            effectDeck: rest,
            players: {
                ...state.players,
                [playerId]: {
                    ...player,
                    cardsInHand: hand
                }
            }
        };
    }

    return {
        ...state,
        effectDeck: rest,
        players: {
            ...state.players,
            [playerId]: {
                ...player,
                cardsInHand: hand
            }
        }
    };
}

// ── Aplicar efecto de carta (crea ModifierInstances) ──

function applyCardEffect(state: GameState, cardId: CardId, playerId: string, targetId?: string): GameState {
    const key = getKey(cardId);
    const sourceName = CARD_TEMPLATES[key]?.name;
    switch (key) {
        case 'movilidad':
            return addModifier(state, playerId, null, 'movementCost', 0, 'SET', 1, 1, 'card', sourceName);
        case 'ataque_extra': {
            if (!targetId) return state;
            const u = state.units[targetId];
            if (!u) return state;
            if (!u.attackedThisTurn) {
                return { ...state, lastCardRejectionReason: 'Esta unidad no ha atacado este turno' };
            }
            return {
                ...state,
                units: {
                    ...state.units,
                    [targetId]: { ...u, attackedThisTurn: false, ataqueExtraCharges: (u.ataqueExtraCharges ?? 0) + 1 },
                },
            };
        }
        case 'precision': {
            if (!targetId) return state;
            const u = state.units[targetId];
            if (!u) return state;
            return {
                ...state,
                units: {
                    ...state.units,
                    [targetId]: { ...u, precisionCharges: (u.precisionCharges ?? 0) + 1 },
                },
            };
        }
        case 'flechas_fuego': {
            let s = addModifier(state, playerId, null, 'damage', 1, 'ADD', 0, 1, 'card', sourceName);
            s = addModifier(s, playerId, null, 'dotOnHit', 1, 'SET', 0, 1, 'card', sourceName);
            return s;
        }
        case 'inspiracion_tropa': {
            const player = state.players[playerId];
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: { ...player, actionPoints: (player?.actionPoints ?? 0) + 1 }
                }
            };
        }
        case 'bajar_moral': {
            const other = playerId === 'p1' ? 'p2' : 'p1';
            return addModifier(state, other, null, 'ap', -1, 'ADD', 1, undefined, 'card', sourceName);
        }
        case 'pantano': {
            const other = playerId === 'p1' ? 'p2' : 'p1';
            return addModifier(state, other, null, 'movementCost', 2, 'MUL', 1, 1, 'card', sourceName);
        }
        case 'mantenimiento': {
            const other = playerId === 'p1' ? 'p2' : 'p1';
            return addModifier(state, other, null, 'attack', -1, 'ADD', 1, 1, 'card', sourceName);
        }
        case 'confusion': {
            const other = playerId === 'p1' ? 'p2' : 'p1';
            if (!targetId) return state;
            if (state.activeModifiers.some(m => m.stat === 'bloqueo' && m.targetId === targetId && m.remainingTurns > 0)) return state;
            return addModifier(state, other, targetId, 'bloqueo', 1, 'SET', 1, undefined, 'card', sourceName);
        }
        case 'miedo': {
            const other = playerId === 'p1' ? 'p2' : 'p1';
            return addModifier(state, other, null, 'attackCost', 1, 'ADD', 1, 1, 'card', sourceName);
        }
        default:
            return state;
    }
}

// ── Resolver carta pendiente (tras fase COUNTER) ──

function recordCardHistory(state: any, cardId: CardId, playerId: string, targetId?: string, counterCardId?: string, counterCardName?: string): GameState {
    const template = CARD_TEMPLATES[getKey(cardId)];
    if (!template) return state;
    const targetUnit = targetId ? state.units[targetId] : undefined;
    return {
        ...state,
        gameHistory: [...state.gameHistory, {
            id: `h${state.nextHistoryId}`,
            turn: state.turn,
            actionNumber: state.gameHistory.filter((h: any) => h.turn === state.turn).length + 1,
            playerId,
            type: 'card' as const,
            cardId,
            cardName: template.name,
            cardType: template.type,
            targetId,
            targetClass: targetUnit?.class,
            counterCardId,
            counterCardName,
        }],
        nextHistoryId: state.nextHistoryId + 1,
    };
}

function resolvePending(state: any, discarded: CardId[]): GameState {
    const pending = state.lastCardAction;
    if (!pending) return { ...state, effectDiscard: [...state.effectDiscard, ...discarded], lastCardAction: undefined };

    let s = applyCardEffect(state, pending.cardId, pending.playerId, pending.targetId);
    s = { ...s, effectDiscard: [...s.effectDiscard, ...discarded, pending.cardId], lastCardAction: undefined };
    s = recordCardHistory(s, pending.cardId, pending.playerId, pending.targetId);
    return s;
}

// ── Verificar si el rival tiene cartas counter válidas ──

function hasValidCounterCards(state: GameState, playerId: string, pendingType: 'BUFF' | 'DEBUFF'): boolean {
    const hand = state.players[playerId]?.cardsInHand ?? [];
    for (const cardId of hand) {
        const ckey = getKey(cardId);
        const ctemplate = CARD_TEMPLATES[ckey];
        if (!ctemplate || ctemplate.type !== 'COUNTER') continue;
        if (pendingType === 'BUFF' && ckey === 'ladron') return true;
        if (pendingType === 'DEBUFF' && (ckey === 'ladron' || ckey === 'espejo' || ckey === 'panacea')) return true;
    }
    return false;
}

// ── Handle principal ──

export function handleCard(state: GameState, action: GameAction): GameState {
    if (action.type !== 'USE_CARD') return state;
    if (state.gamePhase !== 'GAME') return state;

    const player = state.players[action.playerId];
    if (!player) return state;

    const hand = player.cardsInHand || [];
    if (!hand.includes(action.cardId)) return state;

    const key = getKey(action.cardId);
    const template = CARD_TEMPLATES[key];
    if (!template) return state;

    // Inspiración de tropa: validar que el general no fue atacado el turno anterior
    if (key === 'inspiracion_tropa' && state.players[action.playerId]?.generalWasAttackedLastTurn) {
        return {
            ...state,
            lastCardRejectionReason: 'No puedes usar esta carta si tu general fue atacado el turno anterior',
        };
    }

    // Durante COUNTER, el rival puede jugar cartas COUNTER (Ladrón, Espejo, Panacea)
    // En cualquier otra fase, solo el jugador activo puede jugar cartas
    if (state.turnPhase === 'COUNTER') {
        if (template.type !== 'COUNTER') return state;
        if (action.playerId === state.activePlayer) return state;
    } else if (action.playerId !== state.activePlayer) {
        return state;
    }

    // Remover carta de la mano
    const newHand = hand.filter(id => id !== action.cardId);

    // ── COUNTER cards ──

    if (template.type === 'COUNTER') {
        const pending = state.lastCardAction;
        if (!pending || pending.playerId === action.playerId) return state;

        const pendingKey = getKey(pending.cardId);
        const pendingTemplate = CARD_TEMPLATES[pendingKey];

        // Contra BUFF pendiente → solo Ladrón es válido
        if (pendingTemplate?.type === 'BUFF' && key !== 'ladron') return state;

        if (key === 'panacea') {
            let s = { ...state, players: { ...state.players, [action.playerId]: { ...player, cardsInHand: newHand } } };
            s = removePlayerDebuffs(s, action.playerId);
            s = { ...s, effectDiscard: [...s.effectDiscard, action.cardId, pending.cardId], lastCardAction: undefined };
            s = recordCardHistory(s, action.cardId, action.playerId, undefined, pending.cardId, CARD_TEMPLATES[getKey(pending.cardId)]?.name);
            return { ...s, turnPhase: 'MAIN' };
        }

        if (key === 'ladron') {
            const pending = state.lastCardAction;
            if (!pending || pending.playerId === action.playerId) {
                // No hay carta pendiente del rival → Ladrón no tiene efecto
                let s = { ...state, players: { ...state.players, [action.playerId]: { ...player, cardsInHand: newHand } }, effectDiscard: [...state.effectDiscard, action.cardId], turnPhase: 'MAIN' };
                s = recordCardHistory(s, action.cardId, action.playerId);
                return s;
            }
            // Robar la carta pendiente: va a la mano del jugador
            const stolenHand = [...newHand, pending.cardId];
            // La carta original se descarta sin efecto
            let s: GameState = {
                ...state,
                lastCardAction: undefined,
                turnPhase: 'MAIN',
                players: {
                    ...state.players,
                    [action.playerId]: { ...player, cardsInHand: stolenHand },
                },
                effectDiscard: [...state.effectDiscard, action.cardId, pending.cardId],
            };
            s = recordCardHistory(s, action.cardId, action.playerId, undefined, pending.cardId, CARD_TEMPLATES[getKey(pending.cardId)]?.name);
            return s;
        }

        if (key === 'espejo') {
            const pending = state.lastCardAction;
            if (!pending || pending.playerId === action.playerId) {
                let s = { ...state, players: { ...state.players, [action.playerId]: { ...player, cardsInHand: newHand } }, effectDiscard: [...state.effectDiscard, action.cardId], turnPhase: 'MAIN' };
                s = recordCardHistory(s, action.cardId, action.playerId);
                return s;
            }
            // Reflejar: el debuff se aplica al emisor original
            const emitter = pending.playerId;
            const reflectAs = emitter === 'p1' ? 'p2' : 'p1';
            const reflectedCardId = pending.cardId;
            let s: GameState = { ...state, lastCardAction: undefined, players: { ...state.players, [action.playerId]: { ...player, cardsInHand: newHand } } };
            s = applyCardEffect(s, reflectedCardId, reflectAs, action.targetId);
            s = { ...s, effectDiscard: [...s.effectDiscard, action.cardId, reflectedCardId] };
            s = recordCardHistory(s, action.cardId, action.playerId, action.targetId, pending.cardId, CARD_TEMPLATES[getKey(pending.cardId)]?.name);
            return { ...s, turnPhase: 'MAIN' };
        }

        // Otros COUNTERs no implementados → descartar sin efecto
        return { ...state, players: { ...state.players, [action.playerId]: { ...player, cardsInHand: newHand } }, effectDiscard: [...state.effectDiscard, action.cardId], turnPhase: 'MAIN' };
    }

    // ── BUFF / DEBUFF ──
    const otherId = action.playerId === 'p1' ? 'p2' : 'p1';
    if (!hasValidCounterCards(state, otherId, template.type)) {
        // El rival no tiene cartas counter válidas → resolver inmediatamente
        const s = {
            ...state,
            lastCardAction: { cardId: action.cardId, playerId: action.playerId, targetId: action.targetId },
            players: { ...state.players, [action.playerId]: { ...player, cardsInHand: newHand } }
        };
        return { ...resolvePending(s, []), turnPhase: 'MAIN' };
    }

    // Guardar como pendiente, entrar a COUNTER phase
    return {
        ...state,
        lastCardAction: { cardId: action.cardId, playerId: action.playerId, targetId: action.targetId },
        turnPhase: 'COUNTER',
        players: {
            ...state.players,
            [action.playerId]: { ...player, cardsInHand: newHand }
        }
    };
}

// ── DISCARD_CARD (mano llena al robar) ──

export function handleDiscard(state: GameState, action: GameAction): GameState {
    if (action.type !== 'DISCARD_CARD') return state;
    if (state.turnPhase !== 'DRAW') return state;
    if (action.playerId !== state.activePlayer) return state;

    const player = state.players[action.playerId];
    if ((player.cardsInHand?.length ?? 0) <= 3) return state;
    if (!player.cardsInHand?.includes(action.cardId)) return state;

    const newHand = player.cardsInHand.filter(c => c !== action.cardId);
    const turnPhase = newHand.length <= 3 ? 'MAIN' as const : 'DRAW' as const;

    return {
        ...state,
        gameHistory: [...state.gameHistory, {
            id: `h${state.nextHistoryId}`,
            turn: state.turn,
            actionNumber: state.gameHistory.filter((h: any) => h.turn === state.turn).length + 1,
            playerId: action.playerId,
            type: 'phase',
            phaseName: 'discard',
            details: action.cardId,
        }],
        nextHistoryId: state.nextHistoryId + 1,
        turnPhase,
        effectDiscard: [...state.effectDiscard, action.cardId],
        players: {
            ...state.players,
            [action.playerId]: { ...player, cardsInHand: newHand }
        }
    };
}

// ── PASS_COUNTER ──

export function handlePassCounter(state: GameState, action: GameAction): GameState {
    if (action.type !== 'PASS_COUNTER') return state;
    if (state.turnPhase !== 'COUNTER') return state;
    if (action.playerId === state.activePlayer) return state;

    // Resolver la carta pendiente, volver a MAIN
    return {
        ...resolvePending(state, []),
        turnPhase: 'MAIN'
    };
}
