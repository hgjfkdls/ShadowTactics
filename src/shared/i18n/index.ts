import { es } from './resources/es';
import { en } from './resources/en';
import type { StringMap } from './types';

const STORAGE_KEY = 'shadowtactics_locale';
const LOCALE_CHANGED_EVENT = 'locale-changed';

let currentLocale: string;

function loadLocale(): string {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) || 'es';
  }
  return 'es';
}

const resources: Record<string, StringMap> = { es, en };

currentLocale = loadLocale();

export function setLocale(locale: string): void {
  currentLocale = locale;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGED_EVENT, { detail: { locale } }));
  }
}

export function getLocale(): string {
  return currentLocale;
}

export { LOCALE_CHANGED_EVENT };

function resolve(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function l(key: string, params?: Record<string, string | number>): string {
  const locale = resources[currentLocale] ?? resources['es'];
  let str = resolve(locale, key);
  if (typeof str !== 'string') {
    if (typeof str === 'object') return '';
    return key;
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}
