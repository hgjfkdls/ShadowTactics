import { useState, useRef, useEffect } from 'react';
import { KeyBindingsModal } from './KeyBindingsModal';
import { SoundSettingsModal } from './SoundSettingsModal';
import { ThemeSettingsModal } from './ThemeSettingsModal';
import { l, setLocale, getLocale } from '@shared/i18n';

type Props = {
    onLeaveGame: () => void;
    onSurrender?: () => void;
};

export function HamburgerMenu({ onLeaveGame, onSurrender }: Props) {
    const [open, setOpen] = useState(false);
    const [showKeyConfig, setShowKeyConfig] = useState(false);
    const [showSoundSettings, setShowSoundSettings] = useState(false);
    const [showThemeSettings, setShowThemeSettings] = useState(false);
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
                    title={l('hamburger.menu')}
                >
                    ☰
                </button>
                {open && (
                    <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-600 rounded-md shadow-xl w-48 z-40 overflow-hidden">
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition cursor-pointer"
                            onClick={() => { setOpen(false); setShowKeyConfig(true); }}
                        >
                            {l('hamburger.configKeys')}
                        </button>
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition cursor-pointer"
                            onClick={() => { setOpen(false); setShowSoundSettings(true); }}
                        >
                            {l('hamburger.soundSettings')}
                        </button>
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition cursor-pointer"
                            onClick={() => { setOpen(false); setShowThemeSettings(true); }}
                        >
                            {l('hamburger.theme')}
                        </button>
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition cursor-pointer"
                            onClick={() => {
                                setOpen(false);
                                const next = getLocale() === 'es' ? 'en' : 'es';
                                setLocale(next);
                            }}
                        >
                            {l('ui.toggleLanguage', { locale: getLocale() === 'es' ? 'Español' : 'English' })}
                        </button>
                        {onSurrender && (
                            <button
                                className="w-full text-left px-4 py-2 text-sm hover:bg-yellow-700 transition cursor-pointer"
                                onClick={() => { setOpen(false); onSurrender(); }}
                            >
                                {l('hamburger.surrender')}
                            </button>
                        )}
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-red-700 transition cursor-pointer"
                            onClick={() => { setOpen(false); onLeaveGame(); }}
                        >
                            {l('hamburger.leaveGame')}
                        </button>
                    </div>
                )}
            </div>
            <KeyBindingsModal open={showKeyConfig} onClose={() => setShowKeyConfig(false)} />
            <SoundSettingsModal open={showSoundSettings} onClose={() => setShowSoundSettings(false)} />
            <ThemeSettingsModal open={showThemeSettings} onClose={() => setShowThemeSettings(false)} />
        </>
    );
}
