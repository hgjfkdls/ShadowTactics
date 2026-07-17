import { l } from '@shared/i18n';
import type { TimerInfo } from '@shared/game/timer';

type Props = {
    info: TimerInfo | null;
    pausedInfo?: TimerInfo | null;
};

function fmtTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function TurnTimer({ info, pausedInfo }: Props) {
    if (!info || info.remaining <= 0) return null;

    const urgent = info.remaining <= 10;
    return (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 border rounded-lg px-3 py-1 shadow-lg z-30 flex items-center gap-2 transition-colors ${
            urgent ? 'bg-red-900/80 border-red-500' : 'bg-zinc-800/80 border-zinc-600'
        }`}>
            <span className={`text-[10px] font-bold uppercase ${urgent ? 'text-red-200' : 'text-zinc-500'}`}>
{l('board.timeLimit')}
            </span>
            <span className={`font-bold text-sm ${urgent ? 'text-red-200' : 'text-zinc-200'}`}>
                {fmtTime(info.remaining)}
            </span>
            {pausedInfo && (
                <span className="text-[10px] text-zinc-500 ml-1 border-l border-zinc-600 pl-2">
                    ⏸ {fmtTime(pausedInfo.remaining)}
                </span>
            )}
        </div>
    );
}
