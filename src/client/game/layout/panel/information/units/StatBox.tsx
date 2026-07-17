export function StatBox({ label, value, hp, shield, maxHp }: { label: string; value: string; hp?: number; shield?: number; maxHp?: number }) {
    const sh = shield ?? 0;
    const hasShield = sh > 0 && hp !== undefined && maxHp !== undefined;
    if (hasShield) {
        const withShield = hp! + sh;
        const total = withShield > maxHp! ? withShield : maxHp!;
        const displayShield = sh === 1 ? 2 : sh;
        const hpPct = hp! / maxHp!;
        const colorClass = hpPct > 0.5 ? 'bg-green-500' : hpPct > 0.25 ? 'bg-yellow-500' : 'bg-red-500';
        const hpWidth = Math.round((hp! / total) * 100);
        const shieldWidth = Math.max(1, Math.round((displayShield / total) * 100));
        const fillWidth = Math.min(100, hpWidth + shieldWidth);
        return (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-2">
                <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
                <div className="text-sm font-bold">{value}</div>
                <div className="w-full h-2 bg-zinc-700 mt-1 relative">
                    <div className="absolute h-full bg-zinc-100/60" style={{ width: `${fillWidth}%` }} />
                    <div className={`absolute h-full ${colorClass}`} style={{ width: `${hpWidth}%` }} />
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
                <div className="w-full h-2 bg-zinc-700 mt-1 relative">
                    <div className={`absolute h-full ${bar > 50 ? 'bg-green-500' : bar > 25 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${bar}%` }} />
                </div>
            )}
        </div>
    );
}
