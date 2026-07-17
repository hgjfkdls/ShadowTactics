import { l } from '@shared/i18n';

export function statusLabel(stat: string): string {
    const t = l(`unit.status.${stat}`);
    return t || stat;
}
