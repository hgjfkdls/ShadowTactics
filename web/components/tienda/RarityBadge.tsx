const rarityConfig: Record<string, { label: string; cls: string }> = {
    COMMON: { label: 'COMÚN', cls: 'bg-zinc-800 text-zinc-300' },
    RARE: { label: 'RARA', cls: 'bg-blue-950 text-blue-400' },
    EPIC: { label: 'ÉPICA', cls: 'bg-purple-950 text-purple-400' },
    LEGENDARY: { label: 'LEGENDARIA', cls: 'bg-amber-950 text-amber-400' },
};

export default function RarityBadge({ rarity }: { rarity: string }) {
    const config = rarityConfig[rarity] ?? rarityConfig.COMMON;
    return (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${config.cls}`}>
            {config.label}
        </span>
    );
}
