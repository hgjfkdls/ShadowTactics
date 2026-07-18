export const CARD_KEYS = [
  'movilidad','precision','inspiracion_tropa','ataque_extra','flechas_fuego',
  'bajar_moral','pantano','mantenimiento','confusion','miedo',
  'panacea','ladron','espejo',
];

export const IDENTITY_KEYS = [
  'robin_hood','francotirador_del_bosque','dios_del_trueno','capitan_de_la_guardia',
  'caballos_de_guerra','cazadores','punta_de_lanza','espartano',
  'monje_shaolin','comandante_supremo','corazon_de_estratega',
  'inspiracion_real','samurai','furia_del_tirano','escudo_del_comandante',
];

const ABILITY_ICONS = [
  'anti_caballeria','blanco_facil','cabalgar','carga','doble_ataque',
  'ejecutar','formacion_defensiva','fuego_cobertura','linea_defensiva',
  'patada_acrobatica','presion','resistencia','romper_filas','ventaja_alcance',
];

function cardUrls(locale: string): string[] {
  const urls: string[] = [];
  for (const key of CARD_KEYS) {
    urls.push(`/cards/${locale}/${key}.webp`);
  }
  return urls;
}

const LOCALES = ['es', 'en'];

export function getAssetUrls(): string[] {
  const urls: string[] = [];

  // Card backs + fronts for ALL locales
  for (const locale of LOCALES) {
    urls.push(`/cards/${locale}/reverso.webp`);
    for (const key of CARD_KEYS) {
      urls.push(`/cards/${locale}/${key}.webp`);
    }
  }

  // Identity card images (locale-independent)
  for (const key of IDENTITY_KEYS) {
    urls.push(`/cards/identidad/${key}.webp`);
  }

  return [
    ...urls,

    // Stats icons (locale-independent)
    '/icons/stats/hp_icon.webp',
    '/icons/stats/atk_icon.webp',
    '/icons/stats/diff_icon.webp',
    '/icons/stats/range_icon.webp',
    '/icons/stats/mov_icon.webp',

    // Unit class icons (locale-independent)
    '/icons/units/arquero_icon.webp',
    '/icons/units/caballeria_icon.webp',
    '/icons/units/infanteria_icon.webp',
    '/icons/units/lancero_icon.webp',
    '/icons/units/general_icon.webp',

    // Ability icons (locale-independent)
    ...ABILITY_ICONS.map(k => `/icons/habilidades/${k}.webp`),

    // UI sounds (locale-independent)
    '/sounds/ui/click.mp3',
    '/sounds/ui/confirm.mp3',
    '/sounds/ui/cancel.mp3',
    '/sounds/ui/error.mp3',
    '/sounds/ui/select_unit.mp3',

    // Voice sounds for ALL locales
    '/sounds/es/voice/move_1.mp3',
    '/sounds/es/voice/move_2.mp3',
    '/sounds/es/voice/attack.mp3',
    '/sounds/es/voice/attack_archer.mp3',
    '/sounds/es/voice/attack_cavalry.mp3',
    '/sounds/en/voice/move_1.mp3',
    '/sounds/en/voice/move_2.mp3',
    '/sounds/en/voice/attack.mp3',
    '/sounds/en/voice/attack_archer.mp3',
    '/sounds/en/voice/attack_cavalry.mp3',

    // SFX
    '/sounds/game/sfx/sword_slash.mp3',
  ];
}

export async function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

export async function preloadAudio(url: string): Promise<void> {
  try {
    await fetch(url, { cache: 'force-cache' });
  } catch {}
}

export async function preloadAllAssets(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  const urls = getAssetUrls();
  const total = urls.length;
  let loaded = 0;

  const promises = urls.map(async (url) => {
    if (url.endsWith('.png') || url.endsWith('.webp')) {
      await preloadImage(url);
    } else {
      await preloadAudio(url);
    }
    loaded++;
    onProgress?.(loaded, total);
  });

  await Promise.all(promises);
}
