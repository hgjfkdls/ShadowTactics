# Capa Labels — Estrategia de migración

## Estado actual

Cero internacionalización. Todos los strings están hardcodeados en español.

### Inventario de strings por ubicación

| Ubicación | Tipo de strings | Cantidad aprox | Prioridad |
|-----------|----------------|----------------|-----------|
| `@shared/game/data/abilities.ts` | Nombres y descripciones de habilidades | ~35 | Alta |
| `@shared/game/actions/card.ts` | Nombres y descripciones de cartas efecto | ~13 | Alta |
| `@client/prep/identityData.ts` | Nombres, clases, descripciones de identidades | ~15 | Alta |
| `@client/game/layout/RightPanel.tsx` | CLASS_DISPLAY, statusLabel | ~15 | Media |
| `@client/game/layout/PlayerSidebar.tsx` | CLASS_DISPLAY, statusLabel, descriptionForStat | ~20 | Media |
| `@client/game/layout/ActionPanel.tsx` | Labels de botones, alerts | ~15 | Media |
| `@client/game/layout/AttackResultPanel.tsx` | CLASS_LABELS, textos de tarjetas | ~15 | Media |
| `@client/game/board/UnitsLayer.tsx` | statusLabel, classLabel, passiveLabels | ~40 | Media |
| `@client/game/board/HexBoard.tsx` | Alertas, textos de modales | ~30 | Alta |
| `@client/prep/` | Textos de preparación (despliegue, dados) | ~10 | Baja |
| `App.tsx` | Textos de game over, desconexión | ~15 | Alta |

**Total estimado**: ~200 strings.

## Estado ideal

```
@shared/i18n/
  index.ts     → export { l, setLocale, getLocale }
  registry.ts  → registro de recursos por idioma
  types.ts     → Locale, StringMap
  resources/
    es.ts      → español (completo)
    en.ts      → inglés (futuro)
    fr.ts      → francés (futuro)
```

### API

```typescript
// @shared/i18n/index.ts
export function l(key: string, params?: Record<string, string | number>): string;
export function setLocale(locale: string): void;
export function getLocale(): string;
```

**Uso**:
```typescript
// Antes
<span className="text-zinc-200">{'Arquero'}</span>
addAlert?.('No tienes PA suficientes', 'warning');

// Después
<span className="text-zinc-200">{l('unit.class.archer')}</span>
addAlert?.(l('alert.noPA'), 'warning');
```

## Migración

### Fase 1: Estructura base

Crear archivo de recursos inicial con los strings más usados:

```typescript
// @shared/i18n/resources/es.ts
export const es = {
  // Meta
  _locale: 'es',
  _name: 'Español',

  // Unidades
  unit: {
    class: {
      archer: 'Arquero',
      infantry: 'Infantería',
      cavalry: 'Caballería',
      lancer: 'Lancero',
      general: 'General',
    },
    status: {
      movementCost: 'Coste movimiento alterado',
      attack: 'Ataque potenciado',
      difficulty: 'Dificultad modificada',
      attackCost: 'Coste ataque aumentado',
      bloqueo: 'Bloqueado',
      inmovil: 'Inmovilizado',
      dotOnHit: 'Daño pasivo preparado',
      ap: 'PA modificados',
      passiveDamage: 'Recibiendo daño pasivo',
      movementPenalty: 'Penalización de movimiento (×2)',
    },
  },

  // Habilidades
  ability: {
    // Los nombres y descripciones vienen de ABILITIES, que se migrarán después
  },

  // Cartas
  card: {
    // Los nombres y descripciones vienen de CARD_TEMPLATES
  },

  // Alertas
  alert: {
    noPA: 'No tienes PA suficientes',
    alreadyAttacked: 'Ya has atacado este turno',
    abilityNotAvailable: 'Habilidad no disponible en este momento',
    invalidPosition: 'Posición no válida',
    noTargets: 'No hay objetivos válidos',
  },

  // Board
  board: {
    turnLabel: 'Turno',
    actionLabel: 'Acción',
    difficultyLabel: 'Dif',
    damageLabel: 'Daño',
    hit: 'Acierta',
    miss: 'Fallo',
    critical: '¡Golpe crítico!',
    counter: 'Contraataque',
  },

  // Historial
  history: {
    title: 'Historial',
    noEvents: 'Aún no hay eventos',
    turnAndAction: 'Turno {turn} · Acción {action}',
  },

  // Botones
  button: {
    basicAttack: 'Ataque básico',
    alreadyAttacked: 'Ya atacó',
    move: 'Movimiento',
    endTurn: 'Finalizar turno',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    accept: 'Aceptar',
    reject: 'Rechazar',
  },
};
```

### Fase 2: Hook `useL` (o función directa `l`)

La implementación más simple para empezar:

```typescript
// @shared/i18n/index.ts
import { es } from './resources/es';

let currentLocale: string = 'es';
let resources: Record<string, any> = { es };

export function setLocale(locale: string) {
  currentLocale = locale;
}

export function getLocale(): string {
  return currentLocale;
}

function resolve(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) as string | undefined;
}

export function l(key: string, params?: Record<string, string | number>): string {
  const locale = resources[currentLocale] ?? resources['es'];
  let str = resolve(locale, key);
  if (str === undefined) {
    // Fallback: devolver la key para debug
    console.warn(`[i18n] Missing key: ${key}`);
    return key;
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}
```

**Proteger**: La función no debe romper si la key no existe — debe devolver la key como fallback.

### Fase 3: Migrar `CLASS_DISPLAY` y `CLASS_LABELS`

Estos son los strings más repetidos (10+ ubicaciones cada uno).

**Estrategia**: buscar y reemplazar sistemáticamente:

1. Crear un helper en `@client/i18n.ts` que re-exporte `l` de `@shared/i18n`:
   ```typescript
   // @client/i18n.ts
   export { l } from '@shared/i18n';
   ```

2. Reemplazar cada `CLASS_DISPLAY[cls]` o `CLASS_LABELS[cls]` con `l(\`unit.class.${cls}\`)`.

3. Eliminar las definiciones locales de `CLASS_DISPLAY` y `CLASS_LABELS` después de migrar todas las referencias.

**Proteger**: No eliminar `CLASS_DISPLAY` hasta que todas las referencias estén migradas. Usar grep para encontrar todas.

### Fase 4: Migrar descripciones de habilidades y cartas

Actualmente las descripciones están en `abilities.ts` y `card.ts` como strings hardcodeados. La migración aquí es más compleja porque los datos están en `@shared/game/data/` y las traducciones deberían estar en `@shared/i18n/`.

**Opción A (recomendada)**: mantener las descripciones en `ABILITIES` y `CARD_TEMPLATES` como están, pero hacer que el frontend pase por `l()` para obtenerlas:

```typescript
// abilities.ts
export const ABILITIES: Record<string, UnitAbility> = {
  blanco_facil: {
    id: 'blanco_facil',
    name: 'l',  // key de i18n
    description: 'l',
    // ...
  },
};
```

Luego en el frontend, `ab.name` es una key de i18n y se pasa por `l(ab.name)`.

**Opción B**: mover todas las descripciones al archivo de recursos y referenciarlas por ID de habilidad.

**Decisión**: Opción A requiere menos cambios. Las descripciones siguen en abilities.ts como claves, y `l()` resuelve la traducción.

### Fase 5: Migrar alertas

Las alertas se pasan por `addAlert?.('mensaje', 'tipo')`. Migrar:

```typescript
// Antes
addAlert?.('No tienes PA suficientes', 'warning');

// Después
addAlert?.(l('alert.noPA'), 'warning');
```

**Proteger**: cada alerta debe tener su key en el archivo de recursos. Si falta alguna, el fallback devuelve la key visible.

### Fase 6: Migrar textos de modales y paneles

Textos como "¿Ocupar la posición?", "Plan de batalla — elige una formación", "Lanza y escudo — elige un efecto", etc. Estos están en los modales de HexBoard y componentes de layout.

**Proteger**: los textos con interpolación (`Turno {turn} · Acción {action}`) deben usar `l('history.turnAndAction', { turn, action })`.

## Interacciones críticas a proteger

| Interacción | Estado actual | Migración |
|-------------|--------------|-----------|
| `getCardDescription` en RightPanel | Retorna string directamente | Cambiar a `l(getCardDescription(id))` |
| `ABILITIES[abId].description` en RightPanel | Retorna string | Cambiar a `l(ab.description)` |
| `addAlert` en HexBoard | String hardcodeado | Cambiar a `l('alert.xxx')` |
| `statusLabel(stat)` en UnitsLayer/RightPanel | Switch con strings | Cambiar a `l(\`unit.status.${stat}\`)` |
| CLASS_DISPLAY en PlayerSidebar/RightPanel | Objeto Record | Reemplazar con `l(\`unit.class.${cls}\`)` |

## Estrategia de rollout

1. **Fase 1-2** (día 1): estructura base + función `l()`. Sin cambios visibles.
2. **Fase 3** (día 2-3): migrar CLASS_DISPLAY y statusLabel (~30 strings, 6 archivos). Primeros cambios visibles.
3. **Fase 4** (día 4-5): migrar descripciones de habilidades y cartas (~50 strings, ~4 archivos).
4. **Fase 5** (día 6): migrar alertas (~30 strings, 3 archivos).
5. **Fase 6** (día 7-8): migrar modales, paneles, textos de historial (~60 strings, 10+ archivos).
6. **Inglés** (futuro): crear `en.ts`, traducir todos los strings, añadir selector de idioma.

## Principios

1. **No mezclar idiomas en el mismo archivo de recursos.** Cada idioma tiene su propio archivo.
2. **Las claves son jerárquicas y descriptivas.** `alert.noPA` > `a1`.
3. **Los parámetros de interpolación usan `{llaves}`.** `l('turno', { n: 5 })` → `"Turno 5"`.
4. **Los strings pueden tener plurales.** Usar `{count}` y lógica en el recurso: `l('units', { count: 1 })` → `"1 unidad"`, `l('units', { count: 3 })` → `"3 unidades"`.
5. **El archivo `es.ts` es la fuente de verdad.** Todos los strings deben estar ahí antes de traducir a otros idiomas.
