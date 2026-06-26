import { useState, useRef, useEffect } from 'react';
import { KeyBindingsModal } from './KeyBindingsModal';

type Props = {
    onLeaveGame: () => void;
};

export function HamburgerMenu({ onLeaveGame }: Props) {
    const [open, setOpen] = useState(false);
    const [showKeyConfig, setShowKeyConfig] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }
    }, [open]);

    return (
        <>
            <div ref={ref} className="relative">
                <button
                    className="text-xl px-2 py-1 hover:bg-zinc-700 rounded-md transition cursor-pointer"
                    onClick={() => setOpen(prev => !prev)}
                    title="Menú"
                >
                    ☰
                </button>
                {open && (
                    <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-600 rounded-md shadow-xl w-48 z-40 overflow-hidden">
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition cursor-pointer"
                            onClick={() => { setOpen(false); setShowKeyConfig(true); }}
                        >
                            ⌨  Configurar teclas
                        </button>
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-red-700 transition cursor-pointer"
                            onClick={() => { setOpen(false); onLeaveGame(); }}
                        >
                            🚪  Leave game
                        </button>
                    </div>
                )}
            </div>
            <KeyBindingsModal open={showKeyConfig} onClose={() => setShowKeyConfig(false)} />
        </>
    );
}
