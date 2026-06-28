import { useState, useEffect, useCallback } from 'react';
import { useKeyBindings, type ActionId } from '../KeyBindingsContext';
import { l } from '@shared/i18n';

const ACTIONS: ActionId[] = ['DESELECT', 'BASIC_ATTACK', 'MOVE', 'ABILITY_1', 'ABILITY_2', 'ABILITY_3', 'END_TURN'];

const ACTION_KEYS: Record<ActionId, string> = {
    DESELECT: 'keyBindings.deselect',
    BASIC_ATTACK: 'keyBindings.basicAttack',
    MOVE: 'keyBindings.move',
    ABILITY_1: 'keyBindings.ability1',
    ABILITY_2: 'keyBindings.ability2',
    ABILITY_3: 'keyBindings.ability3',
    END_TURN: 'keyBindings.endTurn',
};

function keyLabel(key: string): string {
    if (key === ' ') return 'SPACE';
    if (key === 'escape') return 'ESC';
    return key.toUpperCase();
}

type Props = {
    open: boolean;
    onClose: () => void;
};

export function KeyBindingsModal({ open, onClose }: Props) {
    const { bindings, updateBinding, resetBindings } = useKeyBindings();
    const [recording, setRecording] = useState<ActionId | null>(null);
    const [conflict, setConflict] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setRecording(null);
            setConflict(null);
        }
    }, [open]);

    const handleKeyCapture = useCallback((e: KeyboardEvent) => {
        if (!recording) return;
        e.preventDefault();
        e.stopPropagation();

        const key = e.key.toLowerCase();
        if (key === 'escape') {
            setRecording(null);
            return;
        }

        const existing = (Object.entries(bindings) as [ActionId, string][]).find(
            ([, v]) => v === key
        );
        if (existing && existing[0] !== recording) {
            setConflict(l('keyBindings.conflict', { key: keyLabel(key), action: l(ACTION_KEYS[existing[0]]) }));
            return;
        }

        setConflict(null);
        updateBinding(recording, key);
        setRecording(null);
    }, [recording, bindings, updateBinding]);

    useEffect(() => {
        if (!recording) return;
        window.addEventListener('keydown', handleKeyCapture, true);
        return () => window.removeEventListener('keydown', handleKeyCapture, true);
    }, [recording, handleKeyCapture]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-zinc-800 border border-zinc-600 rounded-lg p-6 w-96 shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold mb-4">{l('keyBindings.title')}</h2>

                <div className="space-y-2 mb-4">
                    {ACTIONS.map(action => {
                        const isRecording = recording === action;
                        return (
                            <div
                                key={action}
                                className={`flex justify-between items-center px-3 py-2 rounded-md cursor-pointer transition ${
                                    isRecording
                                        ? 'bg-blue-700 ring-2 ring-blue-400'
                                        : 'bg-zinc-700 hover:bg-zinc-600'
                                }`}
                                onClick={() => {
                                    setConflict(null);
                                    setRecording(isRecording ? null : action);
                                }}
                            >
                                <span className="text-sm">{l(ACTION_KEYS[action])}</span>
                                <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                                    isRecording ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-300'
                                }`}>
                                    {isRecording ? l('keyBindings.pressKey') : keyLabel(bindings[action])}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {conflict && (
                    <div className="text-red-400 text-xs mb-3">{conflict}</div>
                )}

                <div className="flex gap-2">
                    <button
                        className="bg-zinc-600 hover:bg-zinc-500 transition text-white text-sm px-3 py-1.5 rounded-md cursor-pointer"
                        onClick={resetBindings}
                    >
                        {l('keyBindings.reset')}
                    </button>
                    <button
                        className="ml-auto bg-blue-600 hover:bg-blue-500 transition text-white text-sm px-4 py-1.5 rounded-md cursor-pointer"
                        onClick={onClose}
                    >
                        {l('keyBindings.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
