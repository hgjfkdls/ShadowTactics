import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type ActionId = 'DESELECT' | 'BASIC_ATTACK' | 'MOVE' | 'ABILITY_1' | 'ABILITY_2' | 'ABILITY_3' | 'END_TURN';

export type KeyBindings = Record<ActionId, string>;

const STORAGE_KEY = 'shadowtactics_keybindings';
const BINDINGS_VERSION = 2;

export const DEFAULT_BINDINGS: KeyBindings = {
    DESELECT: 'd',
    BASIC_ATTACK: 'q',
    MOVE: ' ',
    ABILITY_1: 'w',
    ABILITY_2: 'e',
    ABILITY_3: 'r',
    END_TURN: 'escape',
};

function loadBindings(): KeyBindings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed._version === BINDINGS_VERSION) {
                const cleaned: Partial<KeyBindings> = {};
                for (const key of Object.keys(DEFAULT_BINDINGS) as ActionId[]) {
                    if (typeof parsed[key] === 'string') cleaned[key] = parsed[key];
                }
                return { ...DEFAULT_BINDINGS, ...cleaned };
            }
        }
    } catch { }
    return { ...DEFAULT_BINDINGS };
}

function saveBindings(bindings: KeyBindings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...bindings, _version: BINDINGS_VERSION }));
}

type KeyBindingsCtx = {
    bindings: KeyBindings;
    updateBinding: (action: ActionId, key: string) => void;
    resetBindings: () => void;
};

const Ctx = createContext<KeyBindingsCtx | null>(null);

export function KeyBindingsProvider({ children }: { children: ReactNode }) {
    const [bindings, setBindings] = useState<KeyBindings>(loadBindings);

    const updateBinding = useCallback((action: ActionId, key: string) => {
        setBindings(prev => {
            const next = { ...prev, [action]: key };
            saveBindings(next);
            return next;
        });
    }, []);

    const resetBindings = useCallback(() => {
        const defaults = { ...DEFAULT_BINDINGS };
        setBindings(defaults);
        saveBindings(defaults);
    }, []);

    useEffect(() => {
        const handler = () => setBindings(loadBindings());
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    return <Ctx.Provider value={{ bindings, updateBinding, resetBindings }}>{children}</Ctx.Provider>;
}

export function useKeyBindings(): KeyBindingsCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useKeyBindings needs KeyBindingsProvider');
    return ctx;
}
