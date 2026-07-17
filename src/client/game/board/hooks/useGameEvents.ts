import { useEffect, useRef } from 'react';
import type { GameState } from '@shared/game/state';
import { l } from '@shared/i18n';
import { SOUND_CONFIG } from '../../sound/soundConfig';
import { useAnimation } from '../../animation/AnimationContext';
import { useSound } from '../../sound/SoundContext';

function soundText(key: string): string {
  const entry = SOUND_CONFIG[key];
  if (!entry) return key;
  const t = l(entry.i18nKey);
  return t !== entry.i18nKey ? t : key;
}

function getCardKey(cardId: string): string {
  return cardId.replace(/_\d+$/, '');
}

function getCardImg(cardId: string): string {
  return `/cards/${getCardKey(cardId)}.png`;
}

export function useGameEvents(state: GameState) {
  const { enqueue } = useAnimation();
  const { playKey } = useSound();
  const lastProcessedId = useRef<string>('');

  useEffect(() => {
    const history = state.gameHistory;
    if (!Array.isArray(history) || history.length === 0) return;

    const entry = history[history.length - 1];
    const entryId = (entry as any).id ?? '';
    if (!entryId || entryId === lastProcessedId.current) return;
    lastProcessedId.current = entryId;

    const key = (entry as any).voiceKey as string | undefined;

    // Card play → flip animation (only real cards, not support abilities)
    if (entry.type === 'card' && (entry as any).cardType) {
      const e = entry as any;
      enqueue({
        id: `flip_${entryId}`,
        type: 'flipCard',
        duration: 3000,
        cardImg: getCardImg(e.cardId),
        cardName: e.cardName,
        cardId: e.cardId,
        cardType: e.cardType,
        playerId: e.playerId,
        targetX: 260,
        targetY: Math.round(window.innerHeight * 0.45),
        soundKey: 'card_play',
        soundLayer: 'sfx',
      }, 'fx');
    }

    if (!key) return;

    const general = Object.values(state.units).find(u => u.owner === entry.playerId && u.class === 'general');

    playKey(key, { layer: 'voice' });

    // Cavalry / infantry attack → slash effect + sword_sound (queued) first
    if (entry.type === 'attack') {
      const e = entry as any;
      const attackerClass = e.attackerClass as string | undefined;
      if (attackerClass === 'cavalry' || attackerClass === 'infantry') {
        const attacker = Object.values(state.units).find(u => u.id === e.attackerId);
        const target = Object.values(state.units).find(u => u.id === e.targetId) ?? state.graveyard[e.targetId];
        if (attacker && target) {
          enqueue({
            id: `slash_${entryId}`,
            type: 'wait',
            duration: 250,
            effect: 'slash',
            soundKey: 'sword_slash',
            soundLayer: 'sfx',
            fromPosition: attacker.position,
            position: target.position,
          }, 'fx');
        }
      }
    }

    enqueue({
      id: `speech_${entryId}`,
      type: 'speech',
      duration: 2000,
      message: soundText(key),
      generalPosition: general?.position ?? null,
    }, 'ui');
  }, [state.gameHistory?.length]);
}
