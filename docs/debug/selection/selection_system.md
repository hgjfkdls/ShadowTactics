# 1. Contexto

quiero trabajar en desacoplar el sistema de highlights para hexes al usar habilidades, primero necesito que me digas como funciona actualmente y lo comparas con el siguiente modelo

mi idea es encapsular la forma en que se destacan hex al usar una habilidad con un objeto
range: {mode: 'around'|'front'|'star', operator: '='|'<=', value: number, source: boolean } es el area que se selecciona de color azul al activar la habilidad
mode:
- around se extiende el rango el rango en todas las direcciones
- front extiende el rango en linea recta en una direccion. ejemplo carga o proyeccion
- star extiende el rango en linea recta en todas direcciones. ejemplo cabalgar 
se pueden agregar otros patrones facilmente

operator:
- '=' exclude solo muestra el rango del valor. ejemplo para value 2, no muestra rango 0,1, solo 2
- '<=' include muestra rango menor igual al valor. ejemplo value 2, muestra rango 2,1,0
aun no tengo nada que use > o < por lo que no necesito esos operadores por ahora

value: number valor del rango a evaluar
source: boolean considera o no el hex del source unit

con el modelo range, puedo destacar casillas usando distintos patrones

target: {source: boolean, enemies: boolean, allies: boolean, empty: boolean, type: 'attack'|'move'|'support'} son los objetivos que se destacan dentro del range

source (incluye o no a la unidad que activa la accion)
enemies (incluye o no enemigos)
allies (incluye o no allies)
empty (incluye o no casillas vacias)
type (indica que color debe usar, los colores estan centralizados en un archivo de configuracion)

# 2. Diagnóstico del sistema actual

## 2.1 Cómo funciona hoy

El highlight de hexes se maneja en `HexBoard.tsx` mediante lógica imperativa mezclada con condiciones de la UI:

```typescript
// HexBoard.tsx — lógica actual (simplificada)
if (selectedUnit && mode === 'GAME') {
  // Reachable (movimiento)
  for (const hex of getReachableHexes(selectedUnit, state)) {
    highlightedHexes[`${hex.q},${hex.r}`] = { ...hex, reachable: true };
  }
  // Attackable (ataque básico)
  for (const target of getAttackableTargets(selectedUnit, state)) {
    highlightedHexes[key] = { ...target, attackable: true };
  }
  // In range (habilidades con rango)
  if (pendingAbilityId) {
    const cfg = ABILITY_CONFIG[pendingAbilityId];
    if (cfg) {
      for (const hex of getHexesInRange(selectedUnit, cfg.range ?? 1, state)) {
        highlightedHexes[key] = { ...hex, inRange: true, allyTarget: isAlly, ... };
      }
    }
  }
}
```

### Problemas identificados:

1. **Lógica dispersa** — cada tipo de highlight tiene su propia función de cálculo (getReachableHexes, getAttackableTargets, getHexesInRange) sin interfaz unificada.
2. **Colores hardcodeados** — cada estado (reachable, attackable, inRange, allyTarget, etc.) tiene un color fijo. No hay forma de que una habilidad diga "uso color de ataque" o "uso color de soporte".
3. **Dos sistemas paralelos** — el highlight de movimiento/ataque básico usa un flujo, mientras que las habilidades usan otro. No comparten lógica.
4. **Sin configuración por habilidad** — los patrones de área (around, front, star) no existen. Cada habilidad implementa su propia lógica de selección de hex en el handler.

## 2.2 Comparación con el modelo propuesto

| Aspecto | Hoy | Modelo propuesto |
|---|---|---|
| Definición de área | Función JS imperativa por habilidad | Objeto declarativo `range` en config |
| Filtro de objetivos | If/else anidados en HexBoard | Objeto declarativo `target` en config |
| Color de highlight | Estado fijo por tipo (reachable=green, etc.) | `target.type` → lookup en archivo de colores |
| Patrón de área | Hardcodeado (hexDistance, lineas rectas) | `range.mode` con extensible |
| Operador de distancia | Siempre `<=` (todas las distancias) | `range.operator` con `=` o `<=` |

# 3. Plan de implementación

## Fase 1: Tipos e integración en AbilityConfig

### 1.1 Definir tipos Range y Target

Archivo: `src/shared/game/data/ability-config/types.ts`

```typescript
export type RangeMode = 'around' | 'front' | 'star';
export type RangeOperator = '<=' | '=';

export type AbilityRange = {
  mode: RangeMode;
  operator: RangeOperator;
  value: number;
  source?: boolean;  // incluir hex de la unidad origen (default false)
};

export type TargetType = 'attack' | 'move' | 'support';

export type AbilityTarget = {
  source?: boolean;
  enemies?: boolean;
  allies?: boolean;
  empty?: boolean;
  type: TargetType;
};
```

### 1.2 Añadir `range` y `target` a AbilityConfig

```typescript
export type AbilityConfig = {
  // ... campos existentes
  range?: AbilityRange | number | 'unit.range';  // mantener compatibilidad backward
  target?: AbilityTarget;
};
```

### 1.3 Actualizar configs de habilidades existentes

Mapear cada habilidad activa a su `range` y `target`:

| Habilidad | range | target |
|---|---|---|
| `ataque_basico` | `{mode:'around', operator:'<=', value: 'unit.range'}` | `{enemies:true, type:'attack'}` |
| `movimiento` | `{mode:'around', operator:'<=', value: 'unit.movementCost'}` | `{empty:true, type:'move'}` |
| `cabalgar` | `{mode:'star', operator:'=', value: 2}` | `{empty:true, type:'move'}` |
| `carga` | `{mode:'front', operator:'=', value: 1}` | `{enemies:true, type:'attack'}` |
| `patada_acrobatica` | `{mode:'around', operator:'=', value: 1}` | `{enemies:true, type:'attack'}` |
| `proyeccion` | `{mode:'front', operator:'=', value: 2, source:false}` | (trigger post-hit, no target) |
| `en_nombre_del_rey` | `{mode:'around', operator:'<=', value: 2}` | `{allies:true, type:'support'}` |
| `rayo_celestial` | `{mode:'around', operator:'<=', value: 2}` | `{allies:true, type:'support'}` |
| `proteger` | `{mode:'around', operator:'<=', value: 3}` | `{allies:true, type:'support'}` |
| `sacrificar` | `{mode:'around', operator:'=', value: 1}` | `{allies:true, type:'support'}` |
| `desenvainado_veloz` | `{mode:'around', operator:'=', value: 1}` | `{enemies:true, type:'attack'}` |
| `ejecutar` | `{mode:'around', operator:'=', value: 1}` | `{enemies:true, type:'attack'}` |
| `angel_guardian` | `{mode:'around', operator:'=', value: 0}` | `{source:true, type:'support'}` |

### 1.4 Crear función de resolución de range

```typescript
// src/shared/game/data/ability-config/resolve-range.ts
export function resolveAbilityRange(cfg: AbilityConfig, unit: Unit): AbilityRange {
  const raw = cfg.range;
  if (typeof raw === 'number') return { mode: 'around', operator: '<=', value: raw };
  if (raw === 'unit.range') return { mode: 'around', operator: '<=', value: unit.range };
  return raw; // ya es AbilityRange
}
```

## Fase 2: Motor de selección de hexes

### 2.1 Crear función `getHexesInRange`

```typescript
// src/shared/game/board/selection.ts
export function getHexesInRange(
  origin: HexCoord,
  range: AbilityRange,
  state: GameState
): HexCoord[]
```

Implementar cada modo:

- **`around`**: `getHexesInRadius(origin, range.value, range.operator)` — bfs/hexDistance
- **`front`**: `getHexesInLine(origin, direction, range.value)` — línea recta desde origen hacia la dirección del objetivo/último movimiento (require dirección)
- **`star`**: `getHexesInAllLines(origin, range.value)` — línea recta en las 6 direcciones

### 2.2 Crear función `filterTargets`

```typescript
export function filterTargets(
  hexes: HexCoord[],
  target: AbilityTarget,
  unit: Unit,
  state: GameState
): { hex: HexCoord; state: 'attack' | 'move' | 'support' }[]
```

Filtrar según:
- `target.enemies` → hex ocupado por enemigo
- `target.allies` → hex ocupado por aliado
- `target.empty` → hex vacío dentro del mapa
- `target.source` → incluir hex de la unidad
- `target.type` → determinar color del highlight

### 2.3 Integrar en HexBoard

Reemplazar la lógica actual de `highlightedHexes` con:

```typescript
// HexBoard.tsx — nuevo flujo
if (pendingAbilityId) {
  const cfg = ABILITY_CONFIG[pendingAbilityId];
  if (cfg?.target) {
    const range = resolveAbilityRange(cfg, selectedUnit);
    const rawHexes = getHexesInRange(selectedUnit.position, range);
    const targets = filterTargets(rawHexes, cfg.target, selectedUnit, state);
    for (const t of targets) {
      highlightedHexes[key] = { ...t.hex, inRange: true, attackable: t.state === 'attack', ... };
    }
  }
} else {
  // Mantener lógica actual para movimiento/ataque básico
}
```

## Fase 3: Colores por tipo de target

### 3.1 Registrar colores en `style.css`

Ya existen: `--color-attack` (rojo), `--color-available` (verde), `--color-buff` (teal/verde), `--color-range` (azul).

Mapear `target.type` a color:

| type | Color CSS |
|---|---|
| `attack` | `--color-attack` |
| `move` | `--color-available` |
| `support` | `--color-buff` |

### 3.2 Unificar highlight en HexTile

Eliminar props redundantes (`reachable`, `attackable`, `allyTarget`, `inRange`) y reemplazar con un prop genérico:

```typescript
// HexTile.tsx
type Props = {
  // ...
  highlight?: 'attack' | 'move' | 'support' | 'range' | 'history';
};
```

El color se resuelve internamente según el tipo de highlight.

## Fase 4: Migración progresiva

### 4.1 Prioridad

1. Implementar `AbilityRange` y `AbilityTarget` en types.ts
2. Implementar `resolveAbilityRange` y `getHexesInRange` (modo `around`)
3. Implementar `filterTargets`
4. Integrar en HexBoard para habilidades con target
5. Migrar configs de habilidades una por una
6. Implementar modos `front` y `star`
7. Simplificar HexTile props

### 4.2 Criterio de éxito

- Una habilidad con `target` en su config NO necesita código adicional en HexBoard para mostrar highlights.
- El color del highlight se determina exclusivamente por `target.type`.
- Los modos `around`, `front` y `star` cubren todas las habilidades existentes.
- El sistema es extensible: nuevo modo → nueva función, nuevo target type → nuevo color.
