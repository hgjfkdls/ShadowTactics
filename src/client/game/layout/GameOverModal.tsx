import type { GameState, PlayerId } from '@shared';
import { l } from '@shared/i18n';

type Props = {
    state: GameState;
    playerId: PlayerId;
    onLeaveGame: () => void;
};

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function reasonLabel(reason: string | undefined, isVictory: boolean): string {
    switch (reason) {
        case 'general_killed': return isVictory ? l('gameOver.generalKilled') : l('gameOver.ourGeneralKilled');
        case 'surrender': return isVictory ? l('gameOver.surrendered') : l('gameOver.weSurrendered');
        case 'disconnect': return isVictory ? 'Tu oponente se ha desconectado' : 'Te has desconectado';
        default: return 'Fin de la partida';
    }
}

export function GameOverModal({ state, playerId, onLeaveGame }: Props) {
    const isVictory = state.winner === playerId;
    const elapsed = state.gameStartTime ? Math.floor((Date.now() - state.gameStartTime) / 1000) : 0;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border-2 border-zinc-700 rounded-xl px-10 py-8 shadow-2xl min-w-80 text-center space-y-5">
                <div className={`text-5xl font-black tracking-wide ${isVictory ? 'text-yellow-400' : 'text-red-500'}`}>
                    {isVictory ? l('gameOver.victory') : l('gameOver.defeat')}
                </div>

                <div className="text-sm text-zinc-300">
                    {reasonLabel(state.gameOverReason, isVictory)}
                </div>

                <div className="text-xs text-zinc-500 space-y-1">
                    <div>{l('gameOver.timeLabel')}: {formatTime(elapsed)}</div>
                    <div>{l('gameOver.turnsLabel')}: {state.turn}</div>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                    <button
                        onClick={onLeaveGame}
                        className="bg-blue-600 hover:bg-blue-500 transition text-white px-5 py-2 rounded-md font-semibold cursor-pointer"
                    >
                        {l('gameOver.returnToLobby')}
                    </button>
                </div>
            </div>
        </div>
    );
}
