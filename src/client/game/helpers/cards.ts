import { getLocale } from '@shared/i18n';

function getCardKey(cardId: string): string {
  return cardId.replace(/_\d+$/, '');
}

export function cardImgUrl(cardId: string, locale?: string): string {
  const loc = locale ?? getLocale() ?? 'es';
  return `/cards/${loc}/${getCardKey(cardId)}.webp`;
}

export const CARD_BACK_URL = '/cards/es/reverso.webp';

export function identityImgUrl(identityKey: string): string {
  return `/cards/identidad/${identityKey}.webp`;
}

export const IDENTITY_CARD_FALLBACK = CARD_BACK_URL;
