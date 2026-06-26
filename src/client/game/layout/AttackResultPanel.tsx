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
    turn: number;
    attackInTurn?: number;
    targetKilled?: boolean;
    attackerKilled?: boolean;
    attackName?: string;
    elapsed?: number;
};

const CLASS_LABELS: Record<string, string> = {
    archer: 'Arquero', infantry: 'Infantería', cavalry: 'Caballería', lancer: 'Lancero', general: 'General',
};

export function AttackResultPanel({ attackResults, onClear }: { attackResults: AttackResult[]; onClear?: () => void }) {
    return (
        <div className="absolute bottom-4 left-4 z-50 w-[260px]">
            <div className="bg-zinc-800/95 border border-zinc-600 rounded-lg p-3 shadow-xl w-full h-[230px] flex flex-col">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold border-b border-zinc-700 pb-1 mb-1 shrink-0">
                    <span>⚔️ Resultados</span>
                    {onClear && (
                        <button
                            className="text-zinc-400 hover:text-white transition cursor-pointer text-xs"
                            onClick={onClear}
                        >
                            Limpiar
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {attackResults.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-xs text-zinc-500">
                            Aún no hay resultados
                        </div>
                    ) : (
                        [...attackResults].reverse().map((r, i) => (
                            <AttackResultCard key={`${r.attackerId}-${r.targetId}-${r.die1}-${r.die2}-${i}`} result={r} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function getKillLabels(result: AttackResult): string[] {
    const labels: string[] = [];
    if (result.targetKilled) labels.push('objetivo eliminado');
    if (result.attackerKilled) labels.push('atacante eliminado (contra)');
    return labels;
}

function AttackResultCard({ result }: { result: AttackResult }) {
    const isTorbellino = result.attackerClass === 'torbellino';
    const isCritical = result.total >= 11;
    const killLabels = getKillLabels(result);

    if (isTorbellino) {
        return (
            <div className="bg-zinc-700/40 border border-zinc-600/60 rounded px-2 py-1.5 text-[11px] leading-tight space-y-0.5">
                <div className="text-zinc-500 flex justify-between">
                    <span>Turno {result.turn} - {result.attackInTurn ?? '?'}</span>
                    <span className="text-zinc-600">{formatTime(result.elapsed ?? 0)}</span>
                </div>
                <div className="text-zinc-300 font-semibold">⚔️ Torbellino</div>
                {result.hit ? (
                    <div className="text-zinc-400">n° enemigos: <span className="text-zinc-200">{result.damage}</span></div>
                ) : (
                    <>
                        <div className="text-zinc-400">n° enemigos: <span className="text-zinc-200">{result.damage}</span></div>
                        <div className="text-zinc-400">n° aliados: <span className="text-zinc-200">{result.counterDamage}</span></div>
                    </>
                )}
                <div className="text-zinc-400">Dif: <span className="text-zinc-200">{result.difficulty}</span></div>
                <div className="text-zinc-300">dados = <span className="font-bold text-white">{result.total}</span></div>
                <ResultLabel hit={result.hit} critical={false} killLabels={[]} />
            </div>
        );
    }

    return (
        <div className="bg-zinc-700/40 border border-zinc-600/60 rounded px-2 py-1.5 text-[11px] leading-tight space-y-0.5">
            <div className="text-zinc-500 flex justify-between">
                <span>Turno {result.turn} - {result.attackInTurn ?? '?'}</span>
                <span className="text-zinc-600">{formatTime(result.elapsed ?? 0)}</span>
            </div>
            <div className="text-zinc-300 font-semibold">⚔️ {result.attackName ?? 'Ataque básico'}</div>
            <div className="text-zinc-300 flex items-center gap-1">
                <span className="text-blue-400">⚔</span>
                <span className="text-zinc-200">[{result.attackerId}]{CLASS_LABELS[result.attackerClass] ?? result.attackerClass}</span>
                <span className="text-zinc-500">vs</span>
                <span className="text-red-400">🛡</span>
                <span className="text-zinc-200">[{result.targetId}]{CLASS_LABELS[result.targetClass] ?? result.targetClass}</span>
            </div>
            <div className="text-zinc-400">
                Dif:<span className="text-zinc-200 ml-0.5">{result.difficulty}</span>
                {result.hit ? (
                    <><span className="text-zinc-500 mx-1">|</span>Daño:<span className="text-zinc-200 font-bold ml-0.5">{result.damage}</span></>
                ) : result.counterDamage > 0 ? (
                    <><span className="text-zinc-500 mx-1">|</span><span className="text-red-400">Contra:<span className="ml-0.5">{result.counterDamage}</span></span></>
                ) : null}
            </div>
            <div className="text-zinc-300">
                <span>{dieFace(result.die1)}</span>
                <span className="text-zinc-500"> + </span>
                <span>{dieFace(result.die2)}</span>
                <span className="text-zinc-500"> = </span>
                <span className="font-bold text-white">{result.total}</span>
                {isCritical && <span className="text-yellow-400 font-bold ml-1">CRÍTICO</span>}
            </div>
            <ResultLabel hit={result.hit} critical={isCritical && result.hit} killLabels={killLabels} />
        </div>
    );
}

function ResultLabel({ hit, critical, killLabels }: { hit: boolean; critical: boolean; killLabels: string[] }) {
    const suffix = killLabels.length > 0 ? ` (${killLabels.join(', ')})` : '';
    if (critical) return <span className="text-yellow-400 font-bold">✅ ¡Golpe crítico!{suffix}</span>;
    if (hit) return <span className="text-green-400 font-bold">✅ Acierta{suffix}</span>;
    return <span className="text-red-400 font-bold">❌ Fallo</span>;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
