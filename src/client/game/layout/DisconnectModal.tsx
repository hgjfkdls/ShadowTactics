import { useState, useEffect } from 'react';
import { l } from '@shared/i18n';

const TIMEOUT_SECONDS = 60;

type Props = {
    disconnectedAt: number;
};

function formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function DisconnectModal({ disconnectedAt }: Props) {
    const [remaining, setRemaining] = useState(TIMEOUT_SECONDS);

    useEffect(() => {
        const elapsed = Math.floor((Date.now() - disconnectedAt) / 1000);
        const initial = Math.max(0, TIMEOUT_SECONDS - elapsed);
        setRemaining(initial);

        const interval = setInterval(() => {
            const elapsedNow = Math.floor((Date.now() - disconnectedAt) / 1000);
            const rem = Math.max(0, TIMEOUT_SECONDS - elapsedNow);
            setRemaining(rem);
        }, 1000);

        return () => clearInterval(interval);
    }, [disconnectedAt]);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border-2 border-red-700 rounded-xl px-10 py-8 shadow-2xl min-w-80 text-center space-y-5">
                <div className="text-2xl font-bold text-red-400">
{l('disconnect.title')}
                </div>

                <div className="text-sm text-zinc-400">
                    {l('disconnect.waiting')}
                </div>

                <div className="text-4xl font-mono font-bold text-yellow-400">
                    {formatCountdown(remaining)}
                </div>
            </div>
        </div>
    );
}
