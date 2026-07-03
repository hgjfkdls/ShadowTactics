export function StatBox({ label, value, hp, shield, maxHp }: { label: string; value: string; hp?: number; shield?: number; maxHp?: number }) {
    const sh = shield ?? 0;
    const hasShield = sh > 0 && hp !== undefined && maxHp !== undefined;
    if (hasShield) {
        const total = hp! + sh;
        const hpWidth = (hp! / total) * 100;
        const colorClass = hp! > maxHp! * 0.5 ? 'bg-green-500' : hp! > maxHp! * 0.25 ? 'bg-yellow-500' : 'bg-red-500';
        return (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-2">
                <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
                <div className="text-sm font-bold">{value}</div>
                <div className="w-full h-2 bg-zinc-700 rounded-full mt-1 overflow-hidden relative">
                    <div className="absolute h-full rounded-full bg-zinc-100/60" style={{ width: '100%' }} />
                    <div className={`absolute h-full rounded-full ${colorClass}`} style={{ width: `${hpWidth}%` }} />
                </div>
            </div>
        );
    }
    const bar = hp !== undefined && maxHp !== undefined ? Math.round((hp / maxHp) * 100) : undefined;
    return (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-2">
            <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
            <div className="text-sm font-bold">{value}</div>
            {bar !== undefined && (
                <div className="w-full h-2 bg-zinc-700 rounded-full mt-1 overflow-hidden relative">
                    <div className={`absolute h-full rounded-full ${bar > 50 ? 'bg-green-500' : bar > 25 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${bar}%` }} />
                </div>
            )}
        </div>
    );
}
