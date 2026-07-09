import type { GameState, CardId } from '../state';
import type { GameAction } from '../action-types';
import { nextRandom } from '../utils/rng';
import { CARD_CONFIG } from '../data/card-config';
import type { CardConfig } from '../data/card-config';
import { applyCardEffects } from '../data/card-config/handler';
import { addModifier } from '../modifiers/engine';
import { l } from '@shared/i18n';

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

export function getCardKey(cardId: CardId): string {
    return getKey(cardId);
}

function cardI18nKey(cardId: CardId): string {
    return `card.${getKey(cardId)}`;
}

export function getCardName(cardId: CardId): string {
    const translated = l(`${cardI18nKey(cardId)}.name`);
    if (translated && translated !== `${cardI18nKey(cardId)}.name`) return translated;
    return cardId;
}

export function getCardType(cardId: CardId): 'BUFF' | 'DEBUFF' | 'COUNTER' | undefined {
    return CARD_CONFIG[getKey(cardId)]?.type;
}

export function getCardDescription(cardId: CardId): string {
    const translated = l(`${cardI18nKey(cardId)}.desc`);
    if (translated && translated !== `${cardI18nKey(cardId)}.desc`) return translated;
    return '';
}

const CARD_KEYS = Object.keys(CARD_CONFIG);

function getKey(cardId: CardId): string {
    const sorted = [...CARD_KEYS].sort((a, b) => b.length - a.length);
    for (const key of sorted) {
        if (cardId.startsWith(key + '_')) return key;
    }
    return cardId.split('_')[0];
}

export function buildEffectDeck(seed: number): { deck: CardId[]; seed: number } {
    const cards: CardId[] = [];
    for (const key of CARD_KEYS) {
        for (let copy = 1; copy <= 4; copy++) {
            cards.push(`${key}_${copy}`);
        }
    }
    const result = shuffleArray(cards, seed);
    return { deck: result.shuffled, seed: result.seed };
}

export function getCardDescriptionBySourceName(name: string): string | undefined {
    const key = name;
    if (CARD_CONFIG[key]) {
        const translated = l(`${key}.desc`);
        if (translated && translated !== `${key}.desc`) return translated;
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

// ── Resolver carta pendiente (tras fase COUNTER) ──

function recordCardHistory(state: any, cardId: CardId, playerId: string, targetId?: string, counterCardId?: string, counterCardName?: string, effectMods?: string[]): GameState {
    const key = getKey(cardId);
    const config = CARD_CONFIG[key];
    const cardType = config?.type;
    const targetUnit = targetId ? state.units[targetId] : undefined;
    const cardName = `card.${key}.name`;
    const effectLabelKey = `card.${key}.effectLabel`;
    const effectDesc = (config?.effects?.length ?? 0) > 0 ? `[i18n:${effectLabelKey}]` : null;
    return {
        ...state,
        gameHistory: [...state.gameHistory, {
            id: `h${state.nextHistoryId}`,
            turn: state.turn,
            actionNumber: state.gameHistory.filter((h: any) => h.turn === state.turn).length + 1,
            playerId,
            type: 'card' as const,
            cardId,
            cardName,
            cardType: cardType ?? 'BUFF',
            targetId,
            targetClass: targetUnit?.class,
            counterCardId,
            counterCardName,
            modifiers: effectMods ?? (effectDesc ? [effectDesc] : []),
            details: l(`card.${key}.desc`),
        }],
        nextHistoryId: state.nextHistoryId + 1,
    };
}

function resolvePending(state: any, discarded: CardId[]): GameState {
    const pending = state.lastCardAction;
    if (!pending) return { ...state, effectDiscard: [...state.effectDiscard, ...discarded], lastCardAction: undefined };

    const key = getKey(pending.cardId);
    const config = CARD_CONFIG[key] as CardConfig | undefined;
    if (!config) return state;

    let s = applyCardEffects(state, config, pending.playerId, pending.targetId);
    s = { ...s, effectDiscard: [...s.effectDiscard, ...discarded, pending.cardId], lastCardAction: undefined };
    s = recordCardHistory(s, pending.cardId, pending.playerId, pending.targetId);
    return s;
}

// ── Verificar si el rival tiene cartas counter válidas ──

function hasValidCounterCards(state: GameState, playerId: string, pendingType: 'BUFF' | 'DEBUFF'): boolean {
    const hand = state.players[playerId]?.cardsInHand ?? [];
    for (const cardId of hand) {
        const ckey = getKey(cardId);
        const cconfig = CARD_CONFIG[ckey];
        if (!cconfig || cconfig.type !== 'COUNTER') continue;
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

    // Pendiente de target: si la carta no está en mano pero está en lastCardAction, es selección de target
    if (state.players[action.playerId]?.pendingCardNeedsTarget && !(player.cardsInHand ?? []).includes(action.cardId)) {
        const pending = state.lastCardAction;
        if (pending && pending.playerId === action.playerId && getKey(pending.cardId) === getKey(action.cardId)) {
            const cfg = CARD_CONFIG[getKey(pending.cardId)];
            if (cfg && action.targetId) {
                let s = { ...state, players: { ...state.players, [action.playerId]: { ...state.players[action.playerId], pendingCardNeedsTarget: false } } };
                s = applyCardEffects(s, cfg, action.playerId, action.targetId);
                s = { ...s, effectDiscard: [...s.effectDiscard, pending.cardId], lastCardAction: undefined };
                s = recordCardHistory(s, pending.cardId, action.playerId, action.targetId);
                return s;
            }
        }
    }

    const hand = player.cardsInHand || [];
    if (!hand.includes(action.cardId)) return state;

    const key = getKey(action.cardId);
    const config = CARD_CONFIG[key];
    if (!config) return state;

    // Validaciones desde config (activation)
    if (config.activation) {
        if (config.activation.requireFlags && action.targetId) {
            const targetUnit = state.units[action.targetId];
            if (!targetUnit || !config.activation.requireFlags.every(f => (targetUnit.flags ?? []).includes(f))) {
                return { ...state, lastCardRejectionReason: 'La unidad no cumple los requisitos' };
            }
        }
        if (config.activation.blockFlags) {
            if (config.activation.blockFlags.includes('generalWasAttacked') && state.players[action.playerId]?.generalWasAttackedLastTurn) {
                return { ...state, lastCardRejectionReason: 'No puedes usar esta carta si tu general fue atacado el turno anterior' };
            }
        }
        if (config.activation.maxPa !== undefined && (state.players[action.playerId]?.actionPoints ?? 0) >= config.activation.maxPa) {
            return { ...state, lastCardRejectionReason: 'Ya tienes el máximo de PA' };
        }
    }

    // Durante COUNTER, el rival puede jugar cartas COUNTER (Ladrón, Espejo, Panacea)
    // En cualquier otra fase, solo el jugador activo puede jugar cartas
    // Excepción: pendingCardNeedsTarget permite al jugador seleccionar target incluso si no es el activo
    if (state.players[action.playerId]?.pendingCardNeedsTarget) {
        // Se maneja en el bloque de pendingCardNeedsTarget más arriba
    } else if (state.turnPhase === 'COUNTER') {
        if (config.type !== 'COUNTER') return state;
        if (action.playerId === state.activePlayer) return state;
    } else if (action.playerId !== state.activePlayer) {
        return state;
    }

    // Remover carta de la mano
    const newHand = hand.filter(id => id !== action.cardId);

    // ── COUNTER cards ──

    // ── COUNTER cards ──
    if (config.type === 'COUNTER') {
        const pending = state.lastCardAction;
        if (!pending || pending.playerId === action.playerId) return state;

        const pendingKey = getKey(pending.cardId);
        const pendingConfig = CARD_CONFIG[pendingKey];
        if (!pendingConfig || pendingConfig.type !== 'DEBUFF') return state;

        // Panacea: cancela el debuff, ambas cartas se descartan
        if (key === 'panacea') {
            let s = { ...state, players: { ...state.players, [action.playerId]: { ...player, cardsInHand: newHand } } };
            s = { ...s, effectDiscard: [...s.effectDiscard, action.cardId, pending.cardId], lastCardAction: undefined, turnPhase: 'MAIN' };
            s = recordCardHistory(s, action.cardId, action.playerId, undefined, pending.cardId, `card.${pendingKey}.name`);
            return s;
        }

        // Ladrón: cancela el debuff, la carta pendiente va a la mano del que juega el counter
        if (key === 'ladron') {
            const stolenHand = [...newHand, pending.cardId];
            let s = { ...state, players: { ...state.players, [action.playerId]: { ...player, cardsInHand: stolenHand } } };
            s = { ...s, effectDiscard: [...s.effectDiscard, action.cardId], lastCardAction: undefined, turnPhase: 'MAIN' };
            s = recordCardHistory(s, action.cardId, action.playerId, undefined, pending.cardId, `card.${pendingKey}.name`);
            return s;
        }

        // Espejo: refleja el debuff contra el dueño original. B selecciona target, se aplica desde la perspectiva de A
        if (key === 'espejo') {
            if (!action.targetId) return state;
            let s = { ...state, players: { ...state.players, [action.playerId]: { ...player, cardsInHand: newHand } } };
            // Aplicar el efecto desde la perspectiva del dueño original (A) con el target que eligió B
            s = applyCardEffects(s, pendingConfig, pending.playerId, action.targetId);
            const reflectedEffect = `[i18n:card.${pendingKey}.effectLabel]`;
            s = { ...s, effectDiscard: [...s.effectDiscard, action.cardId, pending.cardId], lastCardAction: undefined, turnPhase: 'MAIN' };
            s = recordCardHistory(s, action.cardId, action.playerId, action.targetId, pending.cardId, `card.${pendingKey}.name`, [reflectedEffect]);
            return s;
        }
    }

    // ── BUFF / DEBUFF ──

    const otherId = action.playerId === 'p1' ? 'p2' : 'p1';
    if (!hasValidCounterCards(state, otherId, config.type)) {
        // Sin counters disponibles: resolver inmediatamente (si necesita target, usar el pending para la selección)
        const s = {
            ...state,
            lastCardAction: { cardId: action.cardId, playerId: action.playerId, targetId: action.targetId },
            players: { ...state.players, [action.playerId]: { ...player, cardsInHand: newHand } }
        };
        if (config.targetType && config.targetType !== 'none' && !action.targetId) {
            // Marcar para selección de target y pasar a MAIN (sin COUNTER)
            return {
                ...s,
                turnPhase: 'MAIN',
                players: { ...s.players, [action.playerId]: { ...s.players[action.playerId], pendingCardNeedsTarget: true } },
            };
        }
        return { ...resolvePending(s, []), turnPhase: 'MAIN' };
    }

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

    // Si el pending card necesita target (confusion), esperar a que el jugador activo seleccione
    const pending = state.lastCardAction;
    if (pending) {
        const cfg = CARD_CONFIG[getKey(pending.cardId)];
        if (cfg && !pending.targetId && cfg.targetType && cfg.targetType !== 'none') {
            return {
                ...state,
                turnPhase: 'MAIN',
                players: {
                    ...state.players,
                    [state.activePlayer]: { ...state.players[state.activePlayer], pendingCardNeedsTarget: true },
                },
            };
        }
    }

    return {
        ...resolvePending(state, []),
        turnPhase: 'MAIN'
    };
}
