import { useState, useCallback } from 'react';

export type Alert = {
    id: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
};

let nextId = 0;

const ICONS: Record<Alert['type'], string> = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
};

const STYLES: Record<Alert['type'], string> = {
    info: 'bg-blue-900/60 border-blue-700 text-blue-200',
    success: 'bg-green-900/60 border-green-700 text-green-200',
    warning: 'bg-amber-900/60 border-amber-700 text-amber-200',
    error: 'bg-red-900/60 border-red-700 text-red-200',
};

export function useAlerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);

    const addAlert = useCallback((message: string, type: Alert['type'] = 'info') => {
        const id = nextId++;
        setAlerts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== id));
        }, 4000);
    }, []);

    const removeAlert = useCallback((id: number) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    return { alerts, addAlert, removeAlert };
}

export function AlertPanel({ alerts, removeAlert }: { alerts: Alert[]; removeAlert: (id: number) => void }) {
    if (alerts.length === 0) return null;

    return (
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 pointer-events-none z-50 max-w-sm">
            {alerts.map(a => (
                <div
                    key={a.id}
                    className={[
                        'flex items-start gap-2 px-4 py-3 rounded-lg border text-sm leading-relaxed pointer-events-auto shadow-lg transition-opacity',
                        STYLES[a.type],
                    ].join(' ')}
                    onClick={() => removeAlert(a.id)}
                    style={{ cursor: 'pointer' }}
                >
                    <span className="leading-none">{ICONS[a.type]}</span>
                    <span className="flex-1">{a.message}</span>
                </div>
            ))}
        </div>
    );
}
