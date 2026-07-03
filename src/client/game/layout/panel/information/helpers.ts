import { l } from '@shared/i18n';
import { getCardName } from '@shared/game/actions/card';
import { ABILITIES } from '@shared/game/data/abilities';
import { getCardDescription } from '@shared/game/actions/card';

export function cls(clsName: string): string {
    return l(`unit.class.${clsName}`) || clsName;
}

export function descForHistoryCard(cardId: string): string | undefined {
    const cardDesc = getCardDescription(cardId);
    if (cardDesc) return cardDesc;
    const ab = ABILITIES[cardId];
    if (ab) {
        const translated = l(`ability.${cardId}.desc`);
        if (translated && translated !== `ability.${cardId}.desc`) return translated;
        return ab.description;
    }
    return undefined;
}

export function nameForHistoryCard(cardId: string): string {
    const cardName = getCardName(cardId);
    if (cardName !== cardId) return cardName;
    const ab = ABILITIES[cardId];
    if (ab) {
        const translated = l(`ability.${cardId}.name`);
        if (translated && translated !== `ability.${cardId}.name`) return translated;
        return ab.name;
    }
    return cardId;
}
