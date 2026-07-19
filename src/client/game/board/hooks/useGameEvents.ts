import { useEffect, useRef } from 'react';
import type { GameState } from '@shared/game/state';
import type { HexCoord } from '@shared/hex';
import { l } from '@shared/i18n';
import { useAnimation } from '../../animation/AnimationContext';
import { cardImgUrl } from '../../helpers/cards';

function getCardImg(cardId: string): string {
  return cardImgUrl(cardId);
}

export function useGameEvents(state: GameState, onActionHighlight?: (hexes: HexCoord[]) => void) {
  const { enqueue } = useAnimation();
  const lastProcessedId = useRef<string>('');

  useEffect(() => {
    const history = state.gameHistory;
    if (!Array.isArray(history) || history.length === 0) return;

    const entry = history[history.length - 1];
    const entryId = (entry as any).id ?? '';
    if (!entryId || entryId === lastProcessedId.current) return;
    lastProcessedId.current = entryId;

    // Auto-highlight hexes for the action
    if (onActionHighlight) {
      const e = entry as any;
      let hexes: HexCoord[] = [];
      if (entry.type === 'attack') {
        const atk = Object.values(state.units).find(u => u.id === e.attackerId);
        const tgt = Object.values(state.units).find(u => u.id === e.targetId) ?? state.graveyard[e.targetId];
        if (atk) hexes.push(atk.position);
        if (tgt) hexes.push(tgt.position);
      } else if (entry.type === 'move') {
        const path = e.path;
        if (Array.isArray(path)) {
          hexes = path;
        } else {
          if (e.from) hexes.push(e.from);
          if (e.to) hexes.push(e.to);
        }
      } else if (entry.type === 'support') {
        const src = e.unitId ? state.units[e.unitId] : undefined;
        const tgt = e.targetId ? (state.units[e.targetId] ?? state.graveyard[e.targetId]) : undefined;
        if (src) hexes.push(src.position);
        if (tgt && tgt !== src) hexes.push(tgt.position);
      } else if (entry.type === 'card') {
        const tgt = e.targetId ? (state.units[e.targetId] ?? state.graveyard[e.targetId]) : undefined;
        if (tgt) hexes.push(tgt.position);
      }
      if (hexes.length > 0) onActionHighlight(hexes);
    }

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
    const movePath = (entry as any).path;
    if (entry.type === 'move' && entry.turn > 0 && Array.isArray(movePath) && movePath.length >= 2) {
      const skipCabalgar = (entry as any).configId === 'cabalgar' || (entry as any).configId === 'cabalgar_2';
      if (!skipCabalgar) {
        enqueue({
          id: `move_${entryId}`,
          type: 'move',
          unitId: (entry as any).unitId,
          path: movePath,
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

      if (attacker) {
        const targetPos = target?.position ?? attacker.position;
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
            position: targetPos,
          }, layer);
        } else if (attackerClass === 'archer') {
          enqueue({
            id: `arrows_${entryId}`,
            type: 'wait',
            duration: 800,
            effect: 'arrows',
            soundKey: 'sword_slash',
            soundLayer: 'sfx',
            fromPosition: attacker.position,
            position: targetPos,
          }, layer);
        } else if (attackerClass === 'lancer') {
          enqueue({
            id: `stab_${entryId}`,
            type: 'wait',
            duration: 900,
            effect: 'stab',
            soundKey: 'sword_slash',
            soundLayer: 'sfx',
            fromPosition: attacker.position,
            position: targetPos,
          }, layer);
        }

        // Miss: escudo en defensor + contraataque en canal del atacante (empieza al 60% del escudo)
        if (!e.hit && target) {
          const defLayer = `fx:${target.id}`;
          const defenderClass = e.targetClass as string | undefined;
          enqueue({
            id: `shield_${entryId}`,
            type: 'wait',
            duration: 1000,
            effect: 'shield',
            fromPosition: targetPos,
            position: targetPos,
          }, defLayer);
          const hasCounter = (e.counterDamage ?? 0) > 0;
          if (hasCounter && defenderClass) {
            // Calcular duración del ataque del atacante para sincronizar contraataque
            const atkDur = attackerClass === 'cavalry' || attackerClass === 'infantry' ? 300
              : attackerClass === 'archer' ? 800
              : attackerClass === 'lancer' ? 900 : 0;
            const delayBeforeCounter = Math.max(0, 600 - atkDur);
            const atkLayer = `fx:${attacker.id}`;
            // Delay para que el contraataque empiece al 60% del escudo (600ms)
            if (delayBeforeCounter > 0) {
              enqueue({
                id: `counter_delay_${entryId}`,
                type: 'wait',
                duration: delayBeforeCounter,
              }, atkLayer);
            }
            const counterDuration = 800;
            const effect = defenderClass === 'cavalry' || defenderClass === 'infantry' ? 'slash'
              : defenderClass === 'archer' ? 'arrows'
              : defenderClass === 'lancer' ? 'stab' : 'slash';
            enqueue({
              id: `counter_${entryId}`,
              type: 'wait',
              duration: counterDuration,
              effect,
              soundKey: 'sword_slash',
              soundLayer: 'sfx',
              fromPosition: target.position,
              position: attacker.position,
            }, atkLayer);

            // Speech bubble "Contraataque!!" en el defensor, sincronizado con el contraataque
            const uiLayer = `ui:${target.id}`;
            const speechDelay = atkDur + delayBeforeCounter;
            if (speechDelay > 0) {
              enqueue({
                id: `counter_speech_delay_${entryId}`,
                type: 'wait',
                duration: speechDelay,
              }, uiLayer);
            }
            enqueue({
              id: `counter_speech_${entryId}`,
              type: 'speech',
              duration: counterDuration,
              message: `${l('board.counter')}!!`,
              unitId: target.id,
              generalPosition: target.position,
            }, uiLayer);
          }
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

    // Saltar speech para movimientos de ocupación (ejecutar, desenvainado_veloz)
    const isOccupation = (entry as any).modifiers?.some?.((m: string) => m === 'Ejecutar' || m === 'Desenvainado veloz');
    if (isOccupation) return;

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

    const speechDuration = (entry as any).type === 'move' ? 1000
      : (entry as any).type === 'attack' ? 900
      : (entry as any).type === 'support' ? 1800
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
