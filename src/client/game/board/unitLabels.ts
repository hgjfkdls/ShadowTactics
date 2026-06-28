import { l } from '@shared/i18n';

export function statusLabel(stat: string): string {
    const t = l(`unit.status.${stat}`);
    return t || stat;
}

export function classLabel(cls: string): string {
    const t = l(`unit.class.${cls}`);
    return t || cls;
}

export function hitPercent(difficulty: number): string {
    const pct: Record<number, string> = {
        2: '100%', 3: '97.2%', 4: '91.7%', 5: '83.3%',
        6: '72.2%', 7: '58.3%', 8: '41.7%', 9: '27.8%',
        10: '16.7%', 11: '8.3%', 12: '2.8%',
    };
    if (difficulty < 2) return '100%';
    if (difficulty > 12) return '0%';
    return pct[difficulty] ?? '0%';
}
