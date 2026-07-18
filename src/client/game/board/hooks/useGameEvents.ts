import { useEffect, useRef } from 'react';
import type { GameState } from '@shared/game/state';
import { l } from '@shared/i18n';
import { useAnimation } from '../../animation/AnimationContext';
import { cardImgUrl } from '../../helpers/cards';

function getCardImg(cardId: string): string {
  return cardImgUrl(cardId);
}

export function useGameEvents(state: GameState) {
  const { enqueue } = useAnimation();
  const lastProcessedId = useRef<string>('');

  useEffect(() => {
    const history = state.gameHistory;
    if (!Array.isArray(history) || history.length === 0) return;

    const entry = history[history.length - 1];
    const entryId = (entry as any).id ?? '';
    if (!entryId || entryId === lastProcessedId.current) return;
    lastProcessedId.current = entryId;

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

    // Move animation — smooth 1s transition (skip abilities with client-side animation)
    if (entry.type === 'move' && entry.turn > 0 && (entry as any).path?.length >= 2) {
      const skipCabalgar = (entry as any).configId === 'cabalgar' || (entry as any).configId === 'cabalgar_2';
      if (!skipCabalgar) {
        enqueue({
          id: `move_${entryId}`,
          type: 'move',
          unitId: (entry as any).unitId,
          path: (entry as any).path,
          duration: 1000,
        }, `fx:${(entry as any).unitId}`);
      }
    }

    // Support ability → falling stars on source and target
    if (entry.type === 'support') {
      const e = entry as any;
      const unitId = e.unitId as string | undefined;
      const targetId = e.targetId as string | undefined;
      const source = unitId ? state.units[unitId] ?? state.graveyard[unitId] : undefined;
      const target = targetId ? state.units[targetId] ?? state.graveyard[targetId] : undefined;
      const sourcePos = source?.position;
      const targetPos = target?.position;
      const layer = unitId ? `fx:${unitId}` : 'fx';
      if (sourcePos && targetPos) {
        enqueue({
          id: `stars_${entryId}`,
          type: 'wait',
          duration: 1800,
          effect: 'stars',
          fromPosition: sourcePos,
          position: targetPos,
        }, layer);
      } else if (sourcePos) {
        enqueue({
          id: `stars_${entryId}`,
          type: 'wait',
          duration: 1800,
          effect: 'stars',
          fromPosition: sourcePos,
          position: sourcePos,
        }, layer);
      } else if (targetPos) {
        enqueue({
          id: `stars_${entryId}`,
          type: 'wait',
          duration: 1800,
          effect: 'stars',
          fromPosition: targetPos,
          position: targetPos,
        }, layer);
      }
    }

    // Attack effects by class
    if (entry.type === 'attack') {
      const e = entry as any;
      const attackerClass = e.attackerClass as string | undefined;
      const attacker = Object.values(state.units).find(u => u.id === e.attackerId);
      const target = Object.values(state.units).find(u => u.id === e.targetId) ?? state.graveyard[e.targetId];

      if (attacker && target) {
        const layer = `fx:${attacker.id}`;
        if (attackerClass === 'cavalry' || attackerClass === 'infantry') {
          enqueue({
            id: `slash_${entryId}`,
            type: 'wait',
            duration: 300,
            effect: 'slash',
            soundKey: 'sword_slash',
            soundLayer: 'sfx',
            fromPosition: attacker.position,
            position: target.position,
          }, layer);
        } else if (attackerClass === 'archer') {
          enqueue({
            id: `arrows_${entryId}`,
            type: 'wait',
            duration: 800,
            effect: 'arrows',
            fromPosition: attacker.position,
            position: target.position,
          }, layer);
        } else if (attackerClass === 'lancer') {
          enqueue({
            id: `stab_${entryId}`,
            type: 'wait',
            duration: 900,
            effect: 'stab',
            fromPosition: attacker.position,
            position: target.position,
          }, layer);
        }
      }
    }

    // Action speech bubble at the acting unit's position
    const actingUnit: { q: number; r: number } | undefined =
      entry.turn === 0 ? undefined
        : entry.type === 'attack'
          ? Object.values(state.units).find(u => u.id === (entry as any).attackerId)?.position
          : entry.type === 'move'
            ? (entry as any).from
            : entry.type === 'support'
              ? (() => {
                  const uid = (entry as any).unitId as string | undefined;
                  const u = uid ? state.units[uid] : undefined;
                  return u?.position;
                })()
              : undefined;

    if (!actingUnit || entry.type === 'card') return;

    const actingId = (entry as any).attackerId ?? (entry as any).unitId ?? (entry as any).playerId;

    const actionName =
      (entry as any).cardName
        ? l((entry as any).cardName)
        : (entry as any).attackName
          ? (entry as any).attackName.startsWith('ability.') || (entry as any).attackName.startsWith('button.')
            ? l((entry as any).attackName)
            : (entry as any).attackName
          : (entry as any).configId
            ? l(`ability.${(entry as any).configId}.name`)
            : '';

    const speechDuration = entry.type === 'move' ? 1000
      : entry.type === 'attack' ? 900
      : entry.type === 'support' ? 1800
      : entry.type === 'card' ? 3000
      : 2000;

    enqueue({
      id: `speech_${entryId}`,
      type: 'speech',
      duration: speechDuration,
      message: actionName,
      unitId: actingId,
      generalPosition: actingUnit ?? null,
    }, `ui:${actingId}`, true);
  }, [state.gameHistory?.length]);
}
