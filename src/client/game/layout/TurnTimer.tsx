import { useState, useEffect, useRef } from 'react';
import { l } from '@shared/i18n';

type Props = {
    activePlayer: string;
    turnPhase: string;
    onTimeUp?: () => void;
    paused?: boolean;
};

const TURN_LIMIT = 60;

function fmtTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function TurnTimer({ activePlayer, turnPhase, onTimeUp, paused }: Props) {
    const [remaining, setRemaining] = useState(TURN_LIMIT);
    const totalRef = useRef(TURN_LIMIT);
    const onTimeUpRef = useRef(onTimeUp);
    onTimeUpRef.current = onTimeUp;
    const firedRef = useRef(false);

    useEffect(() => {
        totalRef.current = TURN_LIMIT;
        setRemaining(TURN_LIMIT);
        firedRef.current = false;
    }, [activePlayer, turnPhase]);

    useEffect(() => {
        const id = setInterval(() => {
            setRemaining(prev => {
                if (paused) return prev;
                const next = prev - 1;
                if (next <= 0) {
                    if (!firedRef.current) {
                        firedRef.current = true;
                        onTimeUpRef.current?.();
                    }
                    return 0;
                }
                return next;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [paused]);

    const urgent = remaining <= 10;
    return (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 border rounded-lg px-3 py-1 shadow-lg z-30 flex items-center gap-2 transition-colors ${
            urgent ? 'bg-red-900/80 border-red-500' : 'bg-zinc-800/80 border-zinc-600'
        }`}>
            <span className={`text-[10px] font-bold uppercase ${urgent ? 'text-red-200' : 'text-zinc-500'}`}>
{l('board.timeLimit')}
            </span>
            <span className={`font-bold text-sm ${urgent ? 'text-red-200' : 'text-zinc-200'}`}>
                {fmtTime(remaining)}
            </span>
        </div>
    );
}
