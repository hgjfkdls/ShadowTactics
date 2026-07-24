import { useLayoutEffect, useRef } from 'react';
import type { GameState, Unit } from '@shared/game/state';
import type { GameAction } from '@shared/game/action-types';
import type { HexCoord, HexMap } from '@shared/hex';
import { computeAngle, angleDiff } from '@shared/hex/directions';
import { l } from '@shared/i18n';
import { useAnimation } from '../../animation/AnimationContext';
import { cardImgUrl } from '../../helpers/cards';

function getCardImg(cardId: string): string {
  return cardImgUrl(cardId);
}

export function useGameEvents(state: GameState, onActionHighlight?: (hexes: HexCoord[]) => void, sendAction?: (action: GameAction) => void) {
  const { enqueue, enqueueMultiple, animAngles, setUnitPosition } = useAnimation();
  const lastProcessedId = useRef<string>('');

  useLayoutEffect(() => {
    const history = state.gameHistory;
    if (!Array.isArray(history) || history.length === 0) return;

    const entry = history[history.length - 1];
    const entryId = (entry as any).id ?? '';
    if (!entryId || entryId === lastProcessedId.current) return;
    lastProcessedId.current = entryId;

    // Helper para duración de rotación: base 600ms + variable 0-600ms
    const rotDurAng = (fromAngle: number, toAngle: number) => {
      const diff = Math.abs(angleDiff(fromAngle, toAngle));
      return 500 + Math.round((diff / 180) * 500);
    };

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

    // ─── Rotación unificada antes de cualquier animación de acción ───

    let actingUnit: Unit | undefined;
    let targetHex: HexCoord | undefined;
    let reactionUnit: Unit | undefined;
    let lockPos: HexCoord | undefined;
    let rotTotalDelay = 0;

    const e = entry as any;

    if (entry.type === 'move' && entry.turn > 0) {
      const movePath = e.path;
      if (Array.isArray(movePath) && movePath.length >= 2) {
        const skipCabalgar = e.configId === 'cabalgar' || e.configId === 'cabalgar_2';
        if (!skipCabalgar) {
          actingUnit = Object.values(state.units).find(u => u.id === e.unitId);
          targetHex = movePath[movePath.length - 1];
          lockPos = e.from;
        }
      }
    } else if (entry.type === 'attack') {
      actingUnit = Object.values(state.units).find(u => u.id === e.attackerId);
      reactionUnit = Object.values(state.units).find(u => u.id === e.targetId) ?? state.graveyard[e.targetId];
      targetHex = reactionUnit?.position;
    } else if (entry.type === 'support') {
      const uid = e.unitId as string | undefined;
      actingUnit = uid ? state.units[uid] ?? state.graveyard[uid] : undefined;
      const tgtId = e.targetId as string | undefined;
      reactionUnit = tgtId ? state.units[tgtId] ?? state.graveyard[tgtId] : undefined;
      if (reactionUnit && reactionUnit.id === actingUnit?.id) reactionUnit = undefined;
      targetHex = reactionUnit?.position ?? actingUnit?.position;
    }

    if (actingUnit && targetHex && entry.turn > 0) {
      const SYNC_MS = 1300;
      const posForAngle = lockPos ?? actingUnit.position;
      const actLayer = `fx:${actingUnit.id}`;
      const actCurAngle = animAngles?.[actingUnit.id] ?? computeAngle(posForAngle, actingUnit.direction ?? { q: 0, r: 0 });
      const actTargetAngle = computeAngle(posForAngle, targetHex);
      const actRotDur = rotDurAng(actCurAngle, actTargetAngle);
      const actNeedsRot = Math.abs(angleDiff(actCurAngle, actTargetAngle)) > 0.5;

      // Lock position for movement immediately (before any animation)
      if (lockPos) {
        setUnitPosition(actingUnit.id, lockPos);
      }

      let reactNeedsRot = false;
      let reactRotDur = 0;
      if (reactionUnit && reactionUnit.owner !== actingUnit.owner) {
        const reactCurAngle = animAngles?.[reactionUnit.id] ?? computeAngle(reactionUnit.position, reactionUnit.direction ?? { q: 0, r: 0 });
        const reactTargetAngle = computeAngle(reactionUnit.position, actingUnit.position);
        reactRotDur = rotDurAng(reactCurAngle, reactTargetAngle);
        reactNeedsRot = Math.abs(angleDiff(reactCurAngle, reactTargetAngle)) > 0.5;
      }

      if (actNeedsRot || reactNeedsRot) {
        rotTotalDelay = SYNC_MS;
      }
      if (actNeedsRot) {
        enqueue({
          id: `rotate_act_${entryId}`,
          type: 'rotate',
          unitId: actingUnit.id,
          fromDirection: actCurAngle,
          direction: actTargetAngle,
          duration: actRotDur,
        }, actLayer);
        const actSync = SYNC_MS - actRotDur;
        if (actSync > 0) {
          enqueue({ id: `sync_act_${entryId}`, type: 'wait', duration: actSync }, actLayer);
        }
      }

      if (reactNeedsRot && reactionUnit) {
        const reactLayer = `fx:${reactionUnit.id}`;
        enqueue({
          id: `rotate_react_${entryId}`,
          type: 'rotate',
          unitId: reactionUnit.id,
          fromDirection: animAngles?.[reactionUnit.id] ?? computeAngle(reactionUnit.position, reactionUnit.direction ?? { q: 0, r: 0 }),
          direction: computeAngle(reactionUnit.position, actingUnit.position),
          duration: reactRotDur,
        }, reactLayer);
        const reactSync = SYNC_MS - reactRotDur;
        if (reactSync > 0 && reactionUnit.owner !== actingUnit.owner) {
          enqueue({ id: `sync_react_${entryId}`, type: 'wait', duration: reactSync }, reactLayer);
        }
      }
    }

    // Move animation — smooth 1s transition (skip abilities with client-side animation)
    const movePath = (entry as any).path;
    if (entry.type === 'move' && entry.turn > 0 && Array.isArray(movePath) && movePath.length >= 2) {
      const skipCabalgar = e.configId === 'cabalgar' || e.configId === 'cabalgar_2';
      if (!skipCabalgar) {
        const moveUnitId = (entry as any).unitId;
        enqueue({
          id: `move_${entryId}`,
          type: 'move',
          unitId: moveUnitId,
          path: movePath,
          duration: 1000,
        }, `fx:${moveUnitId}`);
      }
    }

    // Support ability → falling stars on source and target
    if (entry.type === 'support') {
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
      const attackerClass = e.attackerClass as string | undefined;
      const attacker = Object.values(state.units).find(u => u.id === e.attackerId);
      const target = Object.values(state.units).find(u => u.id === e.targetId) ?? state.graveyard[e.targetId];

      if (attacker) {
        const targetPos = target?.position ?? attacker.position;
        const atkLayer = `fx:${attacker.id}`;

        if (attackerClass === 'cavalry' || attackerClass === 'infantry' || attackerClass === 'general') {
          enqueue({
            id: `slash_${entryId}`,
            type: 'wait',
            duration: 300,
            effect: 'slash',
            soundKey: 'sword_slash',
            soundLayer: 'sfx',
            fromPosition: attacker.position,
            position: targetPos,
          }, atkLayer);
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
          }, atkLayer);
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
          }, atkLayer);
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
            const atkDur = attackerClass === 'cavalry' || attackerClass === 'infantry' ? 300
              : attackerClass === 'archer' ? 800
              : attackerClass === 'lancer' ? 900 : 0;
            const delayBeforeCounter = Math.max(0, 600 - atkDur);
            const atkLayer = `fx:${attacker.id}`;
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
            const speechDelay = rotTotalDelay + atkDur + delayBeforeCounter;
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

    // Death animation: enqueue after attack/support effects on the actor's channel
    const entryTarget = (entry as any).targetId as string | undefined;
    const entryUnit = (entry as any).unitId as string | undefined;
    const killId = entryTarget || entryUnit;
    if (killId) {
      const deadTarget = state.units[killId] ?? state.graveyard[killId];
      if (deadTarget && (deadTarget.dying || state.graveyard[killId])) {
        const deathChannel = entry.type === 'attack'
          ? `fx:${(entry as any).attackerId}`
          : entry.type === 'support'
            ? `fx:${(entry as any).unitId}`
            : 'fx_death';
        enqueue({
          id: `death_${entryId}`,
          type: 'death',
          duration: 3000,
          unitId: killId,
          position: deadTarget.position,
        }, deathChannel);
        if (sendAction) {
          setTimeout(() => {
            sendAction({ type: 'CONFIRM_DEATH', playerId: deadTarget.owner, unitId: killId });
          }, 3000);
        }
      }
    }

    // Action speech bubble at the acting unit's position
    const speechPos: { q: number; r: number } | undefined =
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

    if (!speechPos || entry.type === 'card') return;

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

    const speechAnims: any[] = [{
      id: `speech_${entryId}`,
      type: 'speech',
      duration: speechDuration,
      message: actionName,
      unitId: actingId,
      generalPosition: speechPos ?? null,
    }];

    // Si hubo rotación, esperar sync antes del speech
    if (rotTotalDelay > 0 && actingId) {
      speechAnims.unshift({
        id: `speech_delay_${entryId}`,
        type: 'wait',
        duration: rotTotalDelay,
      });
    }

    enqueueMultiple(speechAnims, `ui:${actingId}`, true);
  }, [state.gameHistory?.length]);
}
