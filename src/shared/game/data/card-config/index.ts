export type { CardConfig, CardType, CardTargetType, CardEffect } from './types';

import { BUFF_CARD_CONFIG } from './buff';
import { DEBUFF_CARD_CONFIG } from './debuff';
import { COUNTER_CARD_CONFIG } from './counter';

export const CARD_CONFIG: Record<string, any> = {
    ...BUFF_CARD_CONFIG,
    ...DEBUFF_CARD_CONFIG,
    ...COUNTER_CARD_CONFIG,
};
