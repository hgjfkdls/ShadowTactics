# Diagnóstico de campos de AbilityConfig

## ¿Qué campos se usan realmente?

### Correctos (se definen y se leen)

| Campo | Dónde se lee |
|---|---|
| `id` | handler, resolver, history entries |
| `nameKey` | handler (cardName/attackName), kill.ts, identity.ts |
| `displayName` | handler, combat/compute (tooltip), attack labels |
| `type` | handler (dispatch attack/support/move) |
| `targetType` | `abilityUI.ts` (UI decide si necesita target) |
| `range` | handler, abilityUI |
| `rangeBonus` | handler, abilityUI, buildAttackModifiers |
| `base.attack` | handler (fixDamage flow), compute.ts |
| `base.difficulty` | handler, compute.ts |
| `base.paCost` | handler (cost base), compute.ts, abilityUI |
| `move.maxDist` | handler, abilityUI |
| `move.setFlags` | handler (post-move flags) |
| `effects` | handler (aplica buffs/shields/heals) |
| `setFlags` (top) | handler (los aplica, pero ningún config los usa aún) |
| `extraDifficulty` | handler, compute.ts |
| `extraAttack` | handler, compute.ts |
| `fixedDamage` | handler (patada, ejecutar) |
| `requiresCabalgarDir` | handler |
| `allowedModifiers` | compute.ts, resolver.ts (filtro de modifiers) |
| `flags.replacesMove` | handler |
| `flags.straightLine` | handler, abilityUI |
| `flags.noCrossUnits` | handler, abilityUI |
| **`panel`** | **`HistoryEntryDetail.tsx`** (info panel) |
| **`panel.showAttacker`** | HistoryEntryDetail (usa `panelCfg.showAttacker`) |
| **`panel.showDefender`** | HistoryEntryDetail |
| **`panel.showTarget`** | HistoryEntryDetail |
| **`panel.showSource`** | HistoryEntryDetail |
| **`panel.showDescription`** | HistoryEntryDetail |
| **`panel.showModifiers`** | HistoryEntryDetail |
| **`panel.showFormula`** | HistoryEntryDetail + PanelFormula |
| **`panel.showMovement`** | HistoryEntryDetail |
| **`panel.showUnitsAffected`** | HistoryEntryDetail |
| **`log`** | **`HistoryPanel.tsx`** (history log) |
| **`log.*`** (todos) | HistoryPanel (vía `logCfg.*`) |

### Muertos (definidos en type pero nunca leídos)

| Campo | Problema |
|---|---|
| `displayType` | Siempre igual a `type`. Eliminar o derivar. |
| `icon` | Nunca se renderiza. ¿Para qué era? |
| `isPassive` | Nunca se consulta en runtime. Las pasivas se detectan por ID. |
| `replacesAttack` | Nunca se lee. |
| `flags.isCarga` | Nunca se lee del config. `isCarga` se pasa manual en el resolver. |
| `flags.noCritical` | Nunca se lee del config. El handler lo hardcodea por ID. |
| `flags.isExtraAttack` | Nunca se lee del config. Se pasa manual. |
| `flags.consumesUnitAction` | Nunca se lee. |
| `flags.freeMove` | Nunca se lee. `posicion_estrategica` se maneja por ID. |
| `requires` (todo el objeto) | Nunca se evalúa genéricamente. Cada habilidad tiene su propio hardcode. |
| `restrictions` | Solo texto informativo, nunca renderizado. |
| `move.baseCost` | **Bug**: definido en 3 configs pero el handler usa `base.paCost` para moves. |

### Anomalías

| Archivo | Línea | Problema |
|---|---|---|
| `infantry.ts:51` | `noCritical: true` fuera de `flags` | No es campo válido de AbilityConfig. Debería estar dentro de `flags`. |

## Recomendaciones

### Prioridad alta
1. **Unificar `move.baseCost` y `base.paCost`**: Decidir si el coste de movimiento viene de `move.baseCost` o `base.paCost`. Actualmente el handler ignora `move.baseCost`.
2. **Eliminar campos muertos** del type: `displayType`, `icon`, `isPassive`, `replacesAttack`, `flags.isCarga`, `flags.noCritical`, `flags.isExtraAttack`, `flags.consumesUnitAction`, `flags.freeMove`, `requires` (todo el sub-árbol), `restrictions`.

### Prioridad media
3. **Implementar evaluador genérico de `requires`**: Para evitar hardcode por ID, crear `canUseAbility()` que lea `requires` del config.
4. **Implementar `setFlags` genérico**: El handler ya lo soporta, ningún config lo usa.

### Prioridad baja
5. **Mover `noCritical` en infantry.ts** dentro de `flags`.
6. **Implementar renderizado de `icon`** o eliminarlo.
7. **Implementar renderizado de `restrictions`** o eliminarlo.
