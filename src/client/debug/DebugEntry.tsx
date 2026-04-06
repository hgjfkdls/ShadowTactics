import { useState } from 'react';
import type { DebugEvent } from './DebugStore';

type Props = {
    event: DebugEvent;
};

export function DebugEntry({ event }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-zinc-700" onClick={() => setOpen(o => !o)}>
            <button
                className="w-full text-left px-2 py-1 text-xs flex justify-between items-center hover:bg-zinc-800"
            >
                <span className="opacity-70">
                    {new Date(event.time).toLocaleTimeString()} [{event.type} {event.type === 'ACTION_SENT' && `:${event.action?.type}`}]
                </span>

                <span className="text-zinc-400">
                    {open ? '▾' : '▸'}
                </span>
            </button>

            {open && (
                <div className="px-2 pb-2 text-xs">
                    {event.type === 'SOCKET_CONNECT' && (
                        <div className="text-green-400">
                            Socket connected
                        </div>
                    )}

                    {event.type === 'ACTION_SENT' && (
                        <pre className="text-yellow-300 whitespace-pre-wrap">
                            {JSON.stringify(event.action, null, 2)}
                        </pre>
                    )}

                    {event.type === 'STATE_RECEIVED' && (
                        <pre className="text-cyan-300 whitespace-pre-wrap">
                            {JSON.stringify(event.state, null, 2)}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}
