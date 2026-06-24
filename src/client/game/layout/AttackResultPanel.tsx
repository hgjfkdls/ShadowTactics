import { useState, useEffect, useRef } from 'react';

type AttackResult = {
    attackerId: string;
    targetId: string;
    die1: number;
    die2: number;
    total: number;
    difficulty: number;
    hit: boolean;
    damage: number;
    counterDamage: number;
    attackerClass: string;
    targetClass: string;
};

const CLASS_LABELS: Record<string, string> = {
    archer: 'Arquero', infantry: 'Infantería', cavalry: 'Caballería', lancer: 'Lancero', general: 'General',
};

export function AttackResultPanel({ lastAttackResult }: { lastAttackResult?: AttackResult }) {
    const [visible, setVisible] = useState(false);
    const [result, setResult] = useState<AttackResult | null>(null);
    const timerRef = useRef<number | null>(null);
    const prevKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (lastAttackResult) {
            const key = `${lastAttackResult.attackerId}-${lastAttackResult.targetId}-${lastAttackResult.die1}-${lastAttackResult.die2}`;
            if (key === prevKeyRef.current) return;
            prevKeyRef.current = key;
            setResult(lastAttackResult);
            setVisible(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => setVisible(false), 5000);
        }
    }, [lastAttackResult]);

    if (!visible || !result) return null;

    return (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="bg-zinc-900/95 border border-zinc-600 rounded-lg px-5 py-4 shadow-2xl min-w-72">
                <div className="flex items-center gap-3 justify-center mb-2">
                    <span className="text-base">{dieFace(result.die1)}</span>
                    <span className="text-zinc-500 text-lg font-bold">+</span>
                    <span className="text-base">{dieFace(result.die2)}</span>
                    <span className="text-zinc-500 text-lg font-bold">=</span>
                    <span className="text-xl font-bold text-white">{result.total}</span>
                </div>
                <div className="text-center space-y-1">
                    <div className="text-xs text-zinc-400">
                        {CLASS_LABELS[result.attackerClass] ?? result.attackerClass}
                        {' '}vs{' '}
                        {CLASS_LABELS[result.targetClass] ?? result.targetClass}
                    </div>
                    <div className="text-xs text-zinc-400">
                        Dificultad: <span className="font-bold text-zinc-200">{result.difficulty}</span>
                        {' · '}Daño: <span className="font-bold text-zinc-200">{result.hit ? result.damage : 0}</span>
                        {result.counterDamage > 0 && (
                            <> · Contra: <span className="font-bold text-red-400">{result.counterDamage}</span></>
                        )}
                    </div>
                    <div className={result.hit ? 'text-green-400 font-bold text-sm' : 'text-red-400 font-bold text-sm'}>
                        {result.hit ? '✅ ¡Acierto!' : '❌ Fallo'}
                    </div>
                </div>
            </div>
        </div>
    );
}

function dieFace(value: number): string {
    switch (value) {
        case 1: return '⚀';
        case 2: return '⚁';
        case 3: return '⚂';
        case 4: return '⚃';
        case 5: return '⚄';
        case 6: return '⚅';
        default: return '?';
    }
}