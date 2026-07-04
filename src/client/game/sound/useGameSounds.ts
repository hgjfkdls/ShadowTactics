import { useEffect } from 'react';
import { useSound } from './SoundContext';
import type { GameState } from '@shared/game/state';

export function useGameSounds(state: GameState) {
  const { play } = useSound();

  useEffect(() => {
    const history = state.gameHistory;
    if (history.length === 0) return;
    const lastEntry = history[history.length - 1];

    switch (lastEntry.type) {
      case 'attack':
        if (lastEntry.hit) {
          play('hit', { cooldown: 100 });
          if (lastEntry.total >= 11 && !lastEntry.noCritical) {
            play('critical');
          }
          if (lastEntry.targetKilled) {
            setTimeout(() => play('kill'), 200);
          }
        } else {
          play('miss');
          if (lastEntry.counterDamage > 0) {
            setTimeout(() => play('counterattack'), 150);
          }
        }
        break;
      case 'move':
        play('move', { cooldown: 200 });
        break;
      case 'card':
        play('card_play');
        break;
    }
  }, [state.gameHistory.length]);

  useEffect(() => {
    if (state.gamePhase === 'GAME_OVER') {
      const isVictory = state.winner === state.activePlayer;
      setTimeout(() => play(isVictory ? 'victory' : 'defeat'), 500);
    }
  }, [state.gamePhase]);
}
